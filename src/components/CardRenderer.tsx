"use client";

import type { InteractionCard, CollectsItem, FormValues } from "@/lib/types";
import { resolveCardElements } from "@/lib/domain-elements";
import { DynamicField } from "./DynamicField";

interface CardRendererProps {
  card: InteractionCard;
  formValues: FormValues;
  collects: CollectsItem[];
  onChange: (fieldId: string, value: string) => void;
  errors: Record<string, string>;
}

/**
 * Dynamically renders form fields for a card based on the domain elements
 * it maps to. No hardcoded card components — everything is driven by the
 * domain element registry in domain-elements.ts.
 */
export function CardRenderer({
  card,
  formValues,
  collects,
  onChange,
  errors,
}: CardRendererProps) {
  // ControlCard is navigation-only — skip it
  if (card.id === "ControlCard") return null;

  const elements = resolveCardElements([card.id]);

  if (elements.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          Unknown card type:{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            {card.id}
          </code>
        </p>
        <p className="mt-1 text-xs text-amber-600">
          This card is not yet supported in this frontend.
        </p>
      </div>
    );
  }

  // Build a spec lookup from collects
  const specMap = new Map(collects.map((c) => [c.ref, c.spec]));

  return (
    <div className="space-y-6">
      {elements.map((element) => {
        const elementRequired = specMap.get(element.id) === "required";
        const hasGridFields = element.fields.some(
          (f) => f.colSpan === 1,
        );

        return (
          <div key={element.id}>
            {hasGridFields ? (
              <div className="grid grid-cols-2 gap-4">
                {element.fields.map((field) => {
                  const isRequired =
                    !field.alwaysOptional &&
                    elementRequired &&
                    element.requiredFields.includes(field.id);

                  const wrapper =
                    field.colSpan === 1 ? (
                      <div key={field.id}>
                        <DynamicField
                          field={field}
                          value={formValues[field.id] ?? ""}
                          error={errors[field.id]}
                          required={isRequired}
                          onChange={(v) => onChange(field.id, v)}
                        />
                      </div>
                    ) : (
                      <div key={field.id} className="col-span-2">
                        <DynamicField
                          field={field}
                          value={formValues[field.id] ?? ""}
                          error={errors[field.id]}
                          required={isRequired}
                          onChange={(v) => onChange(field.id, v)}
                        />
                      </div>
                    );

                  return wrapper;
                })}
              </div>
            ) : (
              <div className="space-y-5">
                {element.fields.map((field) => {
                  const isRequired =
                    !field.alwaysOptional &&
                    elementRequired &&
                    element.requiredFields.includes(field.id);

                  return (
                    <DynamicField
                      key={field.id}
                      field={field}
                      value={formValues[field.id] ?? ""}
                      error={errors[field.id]}
                      required={isRequired}
                      onChange={(v) => onChange(field.id, v)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
