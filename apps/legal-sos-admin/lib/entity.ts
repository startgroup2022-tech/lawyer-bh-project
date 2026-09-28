// Same entity constants as mobile/constants/entity.ts — duplicated
// (small + low churn) so each app stays independently buildable.
// Source: CR Extract 78695-1, issued 27/05/2026.

export const ENTITY = {
  legalNameEn: "Gulf International Collection and Consulting Co. W.L.L",
  legalNameAr: "شركة الخليج الدولية للتحصيل والاستشارات ذ.م.م",
  shortName: "Legal SOS",
  nationality: "Bahraini",

  cr: {
    displayNumber: "78695-1",
    number: "78695",
    branchNo: "1",
    registrationDate: "2011-08-16",
    extractDate: "2026-05-27",
    renewalDue: "2026-08-16",
    memorandumDate: "2011-08-16",
    type: "With Limited Liability Company",
    typeAr: "شركة ذات مسئولية محدودة",
    status: "ACTIVE",
    issuingAuthority: "Ministry of Industry and Commerce, Kingdom of Bahrain",
    issuingAuthorityAr: "وزارة الصناعة والتجارة، مملكة البحرين",
  },

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

  activities: [
    "Operations of eMarketplaces / websites / web portals",
    "Real estate activities with own or leased property",
    "Management consultancy activities",
    "Activities of collection agencies and credit bureaus",
  ],

  contact: {
    hotline: "+973 3231 7070",
    branchTel1: "+973 3834 7070",
    branchTel2: "+973 1725 7070",
    branchFax: "+973 1753 7070",
    email: "info@lawyers.bh",
    websiteUrl: "https://legalsos.lawyer",
    sisterSiteUrl: "https://lawyers.bh",
    moicTel: "+973 8000 1700",
    moicWebsite: "https://www.moic.gov.bh",
    moicVerifyUrl: "https://www.sijilat.bh",
  },

  governance: {
    directors: [
      { nameEn: "Sally Nadeem", nationality: "American" },
      { nameEn: "Suzan Nabeeh Shaker Shaker", nationality: "Iraqi" },
      {
        nameEn: "Omar Nabih Shakir Shakir",
        nationality: "Iraqi",
        roles: ["Director", "Majority Shareholder (38%)", "Authorized Signatory"],
      },
    ],
    signatureMode: "any-single" as const,
  },

  fiscal: {
    yearEndMonthDay: "12-31",
  },
} as const;

export const LAWYER_AUTHORITY = {
  nameEn: "Ministry of Justice, Islamic Affairs and Endowments",
  nameAr: "وزارة العدل والشؤون الإسلامية والأوقاف",
  registryNameEn: "Lawyers Affairs Department",
  registryNameAr: "إدارة شؤون المحاماة",
  licenseLabelEn: "MoJ License No.",
  licenseLabelAr: "رقم ترخيص العدل",
  shortLicensePrefixEn: "License No.",
} as const;

export function formatLicense(licenseNo: string | number): string {
  return `${LAWYER_AUTHORITY.shortLicensePrefixEn} ${licenseNo}`;
}
