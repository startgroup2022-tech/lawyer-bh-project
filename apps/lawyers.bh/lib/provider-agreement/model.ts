import { renderAgreement, AGREEMENT_VERSION } from "./legacy-template";
import type { BuilderTemplate } from "./builder-model";
import { parseBuilder } from "./builder-validation";
export type FirstParty = {
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  signatureDataUrl: string;
  stampDataUrl: string;
};
export const emptyFirstParty = (): FirstParty => ({
  nameAr: "",
  nameEn: "",
  roleAr: "",
  roleEn: "",
  signatureDataUrl: "",
  stampDataUrl: "",
});
const textKeys = ["titleAr", "titleEn", "contentAr", "contentEn"] as const;
export type Template = {
  builder?: BuilderTemplate;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  presentation?: { layout: "modern-v1"; firstParty: FirstParty };
};
export function publicTemplate(template: Template): Template {
  return {
    titleAr: template.titleAr,
    titleEn: template.titleEn,
    contentAr: template.contentAr,
    contentEn: template.contentEn,
    ...(template.builder
      ? {
          builder: {
            ...template.builder,
            signatures: {
              ...template.builder.signatures,
              signatureDataUrl: "",
              stampDataUrl: "",
            },
          },
        }
      : {}),
  };
}
export function modernDraft(template: Template): Template {
  return {
    ...template,
    presentation: template.presentation ?? {
      layout: "modern-v1",
      firstParty: emptyFirstParty(),
    },
  };
}
export type Version = {
  id: string;
  templateId?: string;
  number: number;
  revision: number;
  status: "draft" | "published" | "archived";
  template: Template;
  createdAt: string;
};
export type SigningData = {
  extraValues?: Record<string, string>;
  fileNames?: Record<string, string>;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  registrationNo: string;
  reference: string;
  signedAt: string;
  signatureDataUrl: string;
};
export type Snapshot = {
  providerId: string;
  versionId: string | null;
  template: Template | null;
  data: SigningData;
  legacy: boolean;
};
export const PLACEHOLDERS = [
  "provider_name",
  "license_number",
  "email",
  "phone",
  "reference",
  "date",
  "weekday_ar",
  "weekday_en",
] as const;
export class AgreementError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function parseTemplate(value: unknown): Template {
  if (!value || typeof value !== "object")
    throw new AgreementError("invalid_template");
  const v = value as Record<string, unknown>;
  if (v.builder !== undefined) {
    const builder = parseBuilder(v.builder);
    return {
      builder,
      titleAr: builder.title.ar,
      titleEn: builder.title.en,
      contentAr: builder.clauses
        .map((c) => [c.title.ar, c.body.ar].filter(Boolean).join("\n"))
        .join("\n\n"),
      contentEn: builder.clauses
        .map((c) => [c.title.en, c.body.en].filter(Boolean).join("\n"))
        .join("\n\n"),
    };
  }
  const out = {} as Template;
  for (const key of ["titleAr", "titleEn", "contentAr", "contentEn"] as const) {
    const text = v[key];
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > (key.startsWith("title") ? 200 : 30000) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/.test(
        text,
      )
    )
      throw new AgreementError("invalid_template");
    for (const match of text.matchAll(/\{\{([^{}]+)\}\}/g))
      if (!PLACEHOLDERS.includes(match[1] as (typeof PLACEHOLDERS)[number]))
        throw new AgreementError("invalid_placeholder");
    if (text.replace(/\{\{[^{}]+\}\}/g, "").includes("{{"))
      throw new AgreementError("invalid_placeholder");
    out[key] = text.trim();
  }
  if (v.presentation !== undefined) {
    const p = v.presentation as Record<string, unknown>;
    if (
      !p ||
      p.layout !== "modern-v1" ||
      !p.firstParty ||
      typeof p.firstParty !== "object"
    )
      throw new AgreementError("invalid_presentation");
    const raw = p.firstParty as Record<string, unknown>,
      firstParty = emptyFirstParty();
    for (const key of Object.keys(firstParty) as (keyof FirstParty)[]) {
      const value = raw[key];
      if (typeof value !== "string")
        throw new AgreementError("invalid_presentation");
      if (key.endsWith("DataUrl")) {
        if (
          value &&
          (value.length > 350000 ||
            !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
        )
          throw new AgreementError("invalid_asset");
      } else if (
        value.length > 120 ||
        /[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/.test(value)
      )
        throw new AgreementError("invalid_presentation");
      firstParty[key] = value.trim();
    }
    out.presentation = { layout: "modern-v1", firstParty };
  }
  return out;
}
export function renderTemplate(
  template: Template,
  data: SigningData,
): Template {
  const date = new Date(data.signedAt);
  const fields = {
    license_number: data.registrationNo,
    email: data.email,
    phone: data.phone,
    reference: data.reference,
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bahrain",
    }).format(date),
    weekday_ar: new Intl.DateTimeFormat("ar-BH", {
      weekday: "long",
      timeZone: "Asia/Bahrain",
    }).format(date),
    weekday_en: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Asia/Bahrain",
    }).format(date),
  };
  return {
    ...template,
    ...Object.fromEntries(
      textKeys.map((key) => [
        key,
        template[key].replace(/\{\{([^{}]+)\}\}/g, (_, name: string) =>
          name === "provider_name"
            ? key.endsWith("Ar")
              ? data.fullNameAr || data.fullNameEn
              : data.fullNameEn || data.fullNameAr
            : (fields[name as keyof typeof fields] ?? ""),
        ),
      ]),
    ),
  } as Template;
}
export function legacyTemplate(): Template {
  const sections = renderAgreement({
    reference: "{{reference}}",
    dateLabel: "{{date}}",
    weekday: { ar: "{{weekday_ar}}", en: "{{weekday_en}}" },
    lawyer: {
      name: "Lawyers.bh / Gulf International Collection",
      idOrLicense: "Lawyers.bh",
      address:
        "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Kingdom of Bahrain",
      phone: "+97317537070",
      email: "info@lawyers.bh",
    },
    client: {
      name: "{{provider_name}}",
      idOrLicense: "{{license_number}}",
      nationality: "Bahrain",
      address: "",
      phone: "{{phone}}",
      email: "{{email}}",
    },
    subject: `Joining Lawyers.bh as a service provider and accepting the platform terms, appointment handling, electronic requests, payment collection, and applicable commission arrangement. (Agreement v${AGREEMENT_VERSION})`,
    fee: {
      type: "fixed",
      amountBhd: "0",
      installment:
        "No registration fee is charged under this electronic provider onboarding agreement unless separately agreed in writing.",
    },
  });
  return {
    titleAr: "اتفاقية أتعاب المحاماة والتمثيل القانوني",
    titleEn: "Lawyers.bh — Legal Fees & Representation Agreement",
    contentAr: sections.map((s) => `${s.titleAr}\n${s.bodyAr}`).join("\n\n"),
    contentEn: sections.map((s) => `${s.titleEn}\n${s.bodyEn}`).join("\n\n"),
  };
}
export const sampleData: SigningData = {
  fullNameAr: "محمد أحمد عبدالله",
  fullNameEn: "Mohammed Ahmed Abdullah",
  email: "preview@example.invalid",
  phone: "+973 3333 3333",
  registrationNo: "12345",
  reference: "PREVIEW-ONLY",
  signedAt: "2026-09-09T12:00:00Z",
  signatureDataUrl: "",
};
