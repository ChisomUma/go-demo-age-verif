import type { FormValues } from "./types";
import { getDomainElement, resolveDomainElementIds } from "./domain-elements";

/**
 * Builds the canonical `context.subject` payload from dynamic form values.
 * Iterates over the collected domain elements and delegates to each
 * element's `toSubject` mapper defined in the registry.
 */
export function buildSubjectPayload(
  formValues: FormValues,
  domainElementIds: string[],
): Record<string, unknown> {
  const identity: Record<string, unknown> = {};

  for (const id of domainElementIds) {
    const def = getDomainElement(id);
    if (!def) continue;

    const partial = def.toSubject(formValues);
    Object.assign(identity, partial);
  }

  return { identity };
}

/**
 * Resolves which domain element IDs a list of card IDs collects.
 * Re-exported for convenience.
 */
export function resolveDomainElements(cardIds: string[]): string[] {
  return resolveDomainElementIds(cardIds);
}
