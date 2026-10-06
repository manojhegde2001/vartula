/** Locales offered for generated names, addresses and phone numbers. Loaded on demand in lib/faker.ts. */
export const locales = [
  { id: "en_US", label: "English (US)" },
  { id: "en_IN", label: "English (India)" },
  { id: "en_GB", label: "English (UK)" },
  { id: "de", label: "German" },
  { id: "fr", label: "French" },
  { id: "es", label: "Spanish" },
  { id: "pt_BR", label: "Portuguese (Brazil)" },
  { id: "ja", label: "Japanese" },
] as const;

export type LocaleId = (typeof locales)[number]["id"];
