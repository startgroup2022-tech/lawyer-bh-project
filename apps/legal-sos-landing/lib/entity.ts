// Entity + lawyer-licensing constants for the landing site footer +
// Privacy policy + Terms pages. Mirrors mobile + admin equivalents.
// Source: CR Extract 78695-1, issued 27/05/2026.

export const ENTITY = {
  legalNameEn: "Gulf International Collection and Consulting Co. W.L.L",
  legalNameAr: "شركة الخليج الدولية للتحصيل والاستشارات ذ.م.م",
  shortName: "Legal SOS",
  cr: {
    displayNumber: "78695-1",
    number: "78695",
    registrationDate: "2011-08-16",
    renewalDue: "2026-08-16",
  },
  address: {
    poBox: "80685",
    area: "Isa Town",
    block: "815",
    road: "1546",
    building: "1853J",
    flat: "104",
    country: "Kingdom of Bahrain",
  },
  contact: {
    websiteUrl: "https://legalsos.lawyer",
    hotline: "+973 3231 7070",
    email: "info@lawyers.bh",
  },
} as const;

export const LAWYER_AUTHORITY = {
  nameEn: "Ministry of Justice, Islamic Affairs and Endowments",
  registryNameEn: "Lawyers Affairs Department",
  shortLicensePrefixEn: "License No.",
} as const;
