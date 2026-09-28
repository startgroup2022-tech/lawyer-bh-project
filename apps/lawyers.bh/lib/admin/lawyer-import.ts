export type LawyerImportRow = {
  rowNumber: number;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  email: string;
};

export type LawyerImportRowResult = LawyerImportRow & {
  status: "success" | "skipped" | "failed";
  reason?: string;
  completionLink?: string;
};

const headerAliases = {
  fullNameAr: ["الاسم بالعربي", "اسم المحامي بالعربي", "arabic name", "full name ar"],
  fullNameEn: ["الاسم بالانجليزي", "الاسم بالإنجليزي", "اسم المحامي بالانجليزي", "english name", "full name en"],
  phone: ["رقم الهاتف", "الهاتف", "phone", "phone number"],
  email: ["البريد الإلكتروني", "البريد الالكتروني", "الايميل", "email"],
} as const;

function normalized(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeImportEmail(value: unknown) {
  return normalized(value).toLowerCase();
}

export function resolveLawyerImportHeaders(headers: unknown[]) {
  const values = headers.map((value) => normalized(value).toLowerCase());
  const find = (aliases: readonly string[]) => values.findIndex((value) => aliases.includes(value));
  const result = {
    fullNameAr: find(headerAliases.fullNameAr),
    fullNameEn: find(headerAliases.fullNameEn),
    phone: find(headerAliases.phone),
    email: find(headerAliases.email),
  };
  if (result.fullNameAr < 0 || result.phone < 0 || result.email < 0) return null;
  return result;
}

export function buildLawyerImportRow(rowNumber: number, values: unknown[], indexes: NonNullable<ReturnType<typeof resolveLawyerImportHeaders>>): LawyerImportRow {
  return {
    rowNumber,
    fullNameAr: normalized(values[indexes.fullNameAr]),
    fullNameEn: indexes.fullNameEn < 0 ? "" : normalized(values[indexes.fullNameEn]),
    phone: normalized(values[indexes.phone]),
    email: normalizeImportEmail(values[indexes.email]),
  };
}

export function validateLawyerImportRow(row: LawyerImportRow) {
  if (!row.fullNameAr) return "الاسم بالعربي مطلوب";
  if (!row.phone) return "رقم الهاتف مطلوب";
  if (!row.email) return "البريد الإلكتروني مطلوب";
  if (!/^\S+@\S+\.\S+$/.test(row.email)) return "البريد الإلكتروني غير صحيح";
  return null;
}

export function summarizeLawyerImport(results: LawyerImportRowResult[]) {
  return results.reduce((summary, row) => {
    summary[row.status] += 1;
    return summary;
  }, { success: 0, skipped: 0, failed: 0 });
}
