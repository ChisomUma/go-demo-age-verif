import type { FormValues, CollectsItem } from "./types";
import { getDomainElement } from "./domain-elements";

type Errors = Record<string, string>;

/**
 * Validates form values for the domain elements on a given page.
 * Uses the field definitions from the registry — no hardcoded field checks.
 * Returns an error map (field → message). Empty map = valid.
 */
export function validatePage(
  formValues: FormValues,
  domainElementIds: string[],
  collects: CollectsItem[],
): Errors {
  const errors: Errors = {};
  const specMap = new Map(collects.map((c) => [c.ref, c.spec]));

  for (const elementId of domainElementIds) {
    const def = getDomainElement(elementId);
    if (!def) continue;

    const isRequired = specMap.get(elementId) === "required";

    for (const field of def.fields) {
      const value = formValues[field.id] ?? "";

      // Check required
      if (
        isRequired &&
        !field.alwaysOptional &&
        def.requiredFields.includes(field.id) &&
        !value.trim()
      ) {
        errors[field.id] = `${field.label} is required.`;
        continue;
      }

      // Run field-level validator
      if (field.validate && value) {
        const err = field.validate(value);
        if (err) errors[field.id] = err;
      }
    }
  }

  return errors;
}
