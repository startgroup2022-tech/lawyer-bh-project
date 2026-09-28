// Legal SOS operating entity — pulled from CR Extract 78695-1 issued
// by the Bahrain Ministry of Industry and Commerce on 27/05/2026.
//
// Used in:
//   - Privacy Policy + Terms of Service
//   - Receipts + payout statement footers
//   - App Store / Play Store seller info
//   - Tap Payments merchant onboarding KYC
//   - SendGrid email footer ("operated by …")
//
// IMPORTANT: Legal SOS is a TECHNOLOGY PLATFORM (eMarketplace activity
// code on the CR) that connects users with INDEPENDENT advocates. Each
// advocate is licensed individually by the Bahrain Ministry of Justice
// (وزارة العدل) — the company itself does not practice law.
//
// PII RESTRICTION: We deliberately do NOT capture passport / national
// ID numbers from the CR Extract here even though they're in the
// public record. The codebase doesn't need them and shipping them
// would broaden their attack surface needlessly.

export const ENTITY = {
  legalNameEn: "Gulf International Collection and Consulting Co. W.L.L",
  legalNameAr: "شركة الخليج الدولية للتحصيل والاستشارات ذ.م.م",
  shortName: "Legal SOS",
  nationality: "Bahraini",

  cr: {
    /** Composite display value used on receipts, footers, etc. */
    displayNumber: "78695-1",
    /** Bare CR number (the "-1" is the branch suffix). */
    number: "78695",
    branchNo: "1",
    registrationDate: "2011-08-16",
    /** Most recent renewal — extract issued. */
    extractDate: "2026-05-27",
    /** Next renewal due. Track this — Tap + App Store reject expired CRs. */
    renewalDue: "2026-08-16",
    memorandumDate: "2011-08-16",
    type: "With Limited Liability Company",
    typeAr: "شركة ذات مسئولية محدودة",
    status: "ACTIVE",
    issuingAuthority: "Ministry of Industry and Commerce, Kingdom of Bahrain",
    issuingAuthorityAr: "وزارة الصناعة والتجارة، مملكة البحرين",
  },

  /** Capital structure — Tap KYC asks for these. */
  capital: {
    currency: "BHD" as const,
    authorized: 50000,
    issued: 50000,
    paidUp: 50000,
    numberOfShares: 500,
    nominalValuePerShare: 100,
  },

  address: {
    poBox: "80685",
    area: "Isa Town",
    areaAr: "مدينة عيسى",
    block: "815",
    road: "1546",
    building: "1853J",
    buildingAr: "1853ج",
    flat: "104",
    city: "Isa Town",
    country: "Kingdom of Bahrain",
    countryCode: "BH" as const,
  },

  /** Activity codes on the CR. Operations of eMarketplaces is what
   *  legitimises the tech-platform classification of Legal SOS. */
  activities: [
    "Operations of eMarketplaces / websites / web portals",
    "Real estate activities with own or leased property",
    "Management consultancy activities",
    "Activities of collection agencies and credit bureaus",
  ],

  contact: {
    /** Public hotline shown in-app + email footers. */
    hotline: "+973 3231 7070",
    /** Operations line registered on the CR. */
    branchTel1: "+973 3834 7070",
    branchTel2: "+973 1725 7070",
    branchFax: "+973 1753 7070",
    /** Operational inbox + admin login. */
    email: "info@lawyers.bh",
    websiteUrl: "https://legalsos.lawyer",
    /** Pre-existing sister property. Same operating entity. */
    sisterSiteUrl: "https://lawyers.bh",
    /** Bahrain MoIC for any "verify the CR" link. */
    moicTel: "+973 8000 1700",
    moicWebsite: "https://www.moic.gov.bh",
    moicVerifyUrl: "https://www.sijilat.bh",
  },

  /** Directors + signatories — names only (per PII restriction above).
   *  Used for App Store "responsible party" + Tap Payments primary
   *  contact + legal document signing. */
  governance: {
    directors: [
      { nameEn: "Sally Nadeem", nationality: "American" },
      {
        nameEn: "Suzan Nabeeh Shaker Shaker",
        nationality: "Iraqi",
      },
      {
        nameEn: "Omar Nabih Shakir Shakir",
        nationality: "Iraqi",
        roles: ["Director", "Majority Shareholder (38%)", "Authorized Signatory"],
      },
    ],
    /** All three sign-singly (Type of Signature: منفرد). */
    signatureMode: "any-single" as const,
  },

  /** Set as financial year end on the CR. Used for VAT + payout cycles. */
  fiscal: {
    yearEndMonthDay: "12-31",
  },
} as const;

// ── Bahrain lawyer licensing ────────────────────────────────────────
//
// Bahrain lawyers are licensed by the Ministry of Justice, NOT by a
// "Bar Association". The license number is a numeric ID issued by the
// Lawyers Affairs Department. Use these helpers everywhere instead of
// inventing "Bar BH-XXXX" copy.

export const LAWYER_AUTHORITY = {
  /** Full official name of the licensing body. */
  nameEn: "Ministry of Justice, Islamic Affairs and Endowments",
  nameAr: "وزارة العدل والشؤون الإسلامية والأوقاف",
  /** The department within the Ministry that holds the lawyer registry. */
  registryNameEn: "Lawyers Affairs Department",
  registryNameAr: "إدارة شؤون المحاماة",
  /** Field label to use in UI instead of "Bar number". */
  licenseLabelEn: "MoJ License No.",
  licenseLabelAr: "رقم ترخيص العدل",
  /** Short prefix for inline display (e.g. "License No. 4318"). */
  shortLicensePrefixEn: "License No.",
} as const;

/** Format a license number for display. Accepts string or number. */
export function formatLicense(licenseNo: string | number): string {
  return `${LAWYER_AUTHORITY.shortLicensePrefixEn} ${licenseNo}`;
}
