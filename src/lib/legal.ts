export type LegalConfig = {
  providerName: string;
  providerAddressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
  optional: {
    vatId?: string;
    supervisoryAuthority?: string;
    professionalInfo?: {
      profession?: string;
      countryOfAward?: string;
      chamber?: string;
      professionalRules?: string;
    };
  };
};

const env = (key: string) => (import.meta.env[key] as string | undefined)?.trim() || undefined;

export const legalConfig: LegalConfig = {
  providerName: env("VITE_LEGAL_PROVIDER_NAME") ?? "Elias Pfeffer (B.Eng.)",
  providerAddressLines: (env("VITE_LEGAL_PROVIDER_ADDRESS") ?? "Pestalozzistr. 65\n72762 Reutlingen\nGermany")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean),
  phone: env("VITE_LEGAL_PHONE") ?? "+4917663895331",
  email: env("VITE_LEGAL_EMAIL"),
  website: env("VITE_LEGAL_WEBSITE"),
  optional: {
    vatId: env("VITE_LEGAL_VAT_ID"),
    supervisoryAuthority: env("VITE_LEGAL_SUPERVISORY_AUTHORITY"),
    professionalInfo: {
      profession: env("VITE_LEGAL_PROFESSION") ?? "Engineer (B.Eng.)",
      countryOfAward: env("VITE_LEGAL_COUNTRY_OF_AWARD") ?? "Germany",
      chamber: env("VITE_LEGAL_CHAMBER"),
      professionalRules: env("VITE_LEGAL_PROFESSIONAL_RULES"),
    },
  },
};

