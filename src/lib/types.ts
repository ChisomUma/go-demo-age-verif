// ─── Interaction Fetch Response ───────────────────────────────────────────────

export interface InteractionCard {
  id: string;
  config?: {
    secrets?: Record<string, { value: string }>;
  };
}

export interface InteractionPage {
  id: string;
  label: string;
  cards: InteractionCard[];
}

export interface InteractionResource {
  id: string;
  name: string;
  version: string;
  type: string;
  data: {
    pages: InteractionPage[];
  };
}

export interface CollectsItem {
  ref: string;
  spec: "required" | "optional";
}

export interface InteractionDetail {
  grId: string;
  resource: InteractionResource;
  collects: CollectsItem[];
  consumes: CollectsItem[];
}

export interface InteractionFetchResponse {
  instanceId: string;
  interactionId: string;
  journey: {
    status: "InProgress" | "Completed" | "Failed";
  };
  interaction: InteractionDetail;
  outstanding: string[];
}

// ─── Journey Start ───────────────────────────────────────────────────────────

export interface JourneyStartResponse {
  instanceId: string;
  instanceUrl?: string;
  status?: string;
  message?: string;
}

// ─── Interaction Submit ──────────────────────────────────────────────────────

export interface SubmitPayload {
  instanceId: string;
  interactionId: string;
  participants: { domainElementId: string }[];
  context: {
    subject: Record<string, unknown>;
  };
}

export interface SubjectData {
  identity: {
    firstName?: string;
    middleNames?: string[];
    lastNames?: string[];
    dateOfBirth?: string;
    currentAddress?: AddressData;
    phones?: { type: string; number: string }[];
    emails?: { type: string; email: string }[];
    [key: string]: unknown;
  };
}

export interface AddressData {
  lines: string[];
  locality: string;
  dependentLocality?: string;
  postalCode: string;
  country: string;
}

// ─── Journey State ───────────────────────────────────────────────────────────

export interface JourneyStateResponse {
  instanceId: string;
  status: "InProgress" | "Completed" | "Failed";
  metaData?: {
    createdTime: string;
    completedTime?: string;
  };
  context?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// ─── Dynamic Form State ─────────────────────────────────────────────────────

/** All form values stored as a flat string map keyed by field ID. */
export type FormValues = Record<string, string>;

// ─── Dynamic Field Definitions ──────────────────────────────────────────────

export interface FieldDef {
  /** Unique key used in FormValues */
  id: string;
  /** Display label */
  label: string;
  /** HTML input type */
  type: "text" | "email" | "tel" | "date" | "select" | "file";
  /** Placeholder text */
  placeholder?: string;
  /** autocomplete attribute */
  autoComplete?: string;
  /** For select fields */
  options?: { value: string; label: string }[];
  /** For file fields — accepted MIME types */
  accept?: string;
  /** Grid column span (1 or 2) — defaults to 2 (full width) */
  colSpan?: 1 | 2;
  /** Help text below the field */
  hint?: string;
  /** Whether the field is always optional regardless of collects spec */
  alwaysOptional?: boolean;
  /** Validation function — returns error message or null */
  validate?: (value: string) => string | null;
}

/** Defines the fields a domain element collects and how to map them to the API payload. */
export interface DomainElementDef {
  /** The domain element ID (e.g. "FullName") */
  id: string;
  /** Fields this element collects */
  fields: FieldDef[];
  /** Which fields are required when the element is required */
  requiredFields: string[];
  /** Maps collected field values into the subject payload */
  toSubject: (values: FormValues) => Partial<SubjectData["identity"]>;
}
