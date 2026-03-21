import type { DomainElementDef, FormValues } from "./types";

const COUNTRIES = [
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NG", label: "Nigeria" },
  { value: "IN", label: "India" },
  { value: "ZA", label: "South Africa" },
  { value: "IE", label: "Ireland" },
];

/**
 * Registry of all known domain elements.
 *
 * Each entry defines:
 * - The form fields the element collects
 * - Which fields are required when the element is marked "required"
 * - How to map field values into the canonical subject payload
 *
 * To support a new domain element, add an entry here — no other
 * component changes needed.
 */
const DOMAIN_ELEMENTS: DomainElementDef[] = [
  {
    id: "FullName",
    requiredFields: ["firstName", "lastNames"],
    fields: [
      {
        id: "firstName",
        label: "First name",
        type: "text",
        placeholder: "Jane",
        autoComplete: "given-name",
      },
      {
        id: "middleNames",
        label: "Middle name(s)",
        type: "text",
        placeholder: "Marie",
        autoComplete: "additional-name",
        alwaysOptional: true,
        hint: "Separate multiple middle names with commas.",
      },
      {
        id: "lastNames",
        label: "Last name(s)",
        type: "text",
        placeholder: "Doe",
        autoComplete: "family-name",
        hint: "Separate multiple last names with commas.",
      },
    ],
    toSubject: (v: FormValues) => ({
      firstName: v.firstName?.trim(),
      lastNames: v.lastNames
        ?.split(",")
        .map((n) => n.trim())
        .filter(Boolean),
      ...(v.middleNames?.trim()
        ? {
            middleNames: v.middleNames
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean),
          }
        : {}),
    }),
  },
  {
    id: "DateOfBirth",
    requiredFields: ["dateOfBirth"],
    fields: [
      {
        id: "dateOfBirth",
        label: "Date of birth",
        type: "date",
        autoComplete: "bday",
        hint: "Format: YYYY-MM-DD",
        validate: (value: string) => {
          if (!value) return null;
          const dob = new Date(value);
          if (isNaN(dob.getTime())) return "Enter a valid date.";
          if (dob > new Date()) return "Date of birth cannot be in the future.";
          return null;
        },
      },
    ],
    toSubject: (v: FormValues) => ({
      dateOfBirth: v.dateOfBirth,
    }),
  },
  {
    id: "PersonalEmail",
    requiredFields: ["email"],
    fields: [
      {
        id: "email",
        label: "Email address",
        type: "email",
        placeholder: "jane.doe@example.com",
        autoComplete: "email",
        validate: (value: string) => {
          if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return "Enter a valid email address.";
          return null;
        },
      },
    ],
    toSubject: (v: FormValues) =>
      v.email?.trim()
        ? { emails: [{ type: "personal", email: v.email.trim() }] }
        : {},
  },
  {
    id: "MobilePhone",
    requiredFields: ["phone"],
    fields: [
      {
        id: "phone",
        label: "Mobile phone number",
        type: "tel",
        placeholder: "+44 7700 900000",
        autoComplete: "tel",
        validate: (value: string) => {
          if (value.trim() && value.replace(/\D/g, "").length < 7)
            return "Enter a valid phone number.";
          return null;
        },
      },
    ],
    toSubject: (v: FormValues) =>
      v.phone?.trim()
        ? { phones: [{ type: "mobile", number: v.phone.trim() }] }
        : {},
  },
  {
    id: "CurrentAddress",
    requiredFields: ["addressLine1", "locality", "postalCode", "country"],
    fields: [
      {
        id: "addressLine1",
        label: "Address line 1",
        type: "text",
        placeholder: "123 High Street",
        autoComplete: "address-line1",
      },
      {
        id: "addressLine2",
        label: "Address line 2",
        type: "text",
        placeholder: "Flat 2B",
        autoComplete: "address-line2",
        alwaysOptional: true,
      },
      {
        id: "locality",
        label: "City / Town",
        type: "text",
        placeholder: "London",
        autoComplete: "address-level2",
        colSpan: 1,
      },
      {
        id: "dependentLocality",
        label: "County / State",
        type: "text",
        placeholder: "Greater London",
        autoComplete: "address-level1",
        colSpan: 1,
        alwaysOptional: true,
      },
      {
        id: "postalCode",
        label: "Postal code",
        type: "text",
        placeholder: "SW1A 1AA",
        autoComplete: "postal-code",
        colSpan: 1,
      },
      {
        id: "country",
        label: "Country",
        type: "select",
        autoComplete: "country",
        options: COUNTRIES,
        colSpan: 1,
      },
    ],
    toSubject: (v: FormValues) => ({
      currentAddress: {
        lines: [v.addressLine1, v.addressLine2]
          .map((l) => l?.trim())
          .filter(Boolean),
        locality: v.locality?.trim() ?? "",
        dependentLocality: v.dependentLocality?.trim() || undefined,
        postalCode: v.postalCode?.trim() ?? "",
        country: v.country?.trim() ?? "",
      },
    }),
  },
  {
    id: "PrimaryDocument",
    requiredFields: ["documentType", "documentImage"],
    fields: [
      {
        id: "documentType",
        label: "Document type",
        type: "select",
        options: [
          { value: "PASSPORT", label: "Passport" },
          { value: "DRIVING_LICENCE", label: "Driving licence" },
          { value: "NATIONAL_ID", label: "National ID card" },
        ],
      },
      {
        id: "documentImage",
        label: "Upload document image",
        type: "file",
        accept: "image/*,.pdf",
        hint: "Upload a clear photo or scan of your document.",
      },
    ],
    toSubject: (v: FormValues) => ({
      primaryDocument: {
        type: v.documentType,
        image: v.documentImage, // base64 data URI
      },
    }),
  },
];

/** Map from domain element ID to its definition. */
const REGISTRY = new Map(DOMAIN_ELEMENTS.map((d) => [d.id, d]));

/** Map from card ID to the domain element IDs it collects. */
const CARD_TO_DOMAIN: Record<string, string[]> = {
  NameCard: ["FullName"],
  DateOfBirthCard: ["DateOfBirth"],
  EmailCardPersonalEmail: ["PersonalEmail"],
  PhoneCardMobilePhone: ["MobilePhone"],
  AddressCard: ["CurrentAddress"],
  DocumentCard: ["PrimaryDocument"],
  ControlCard: [],
};

/** Look up a domain element definition. */
export function getDomainElement(id: string): DomainElementDef | undefined {
  return REGISTRY.get(id);
}

/** Resolve card IDs to domain element definitions. */
export function resolveCardElements(cardIds: string[]): DomainElementDef[] {
  const domainIds = cardIds.flatMap((id) => CARD_TO_DOMAIN[id] ?? []);
  return domainIds
    .map((id) => REGISTRY.get(id))
    .filter((d): d is DomainElementDef => d !== undefined);
}

/** Resolve card IDs to domain element ID strings. */
export function resolveDomainElementIds(cardIds: string[]): string[] {
  return cardIds.flatMap((id) => CARD_TO_DOMAIN[id] ?? []);
}
