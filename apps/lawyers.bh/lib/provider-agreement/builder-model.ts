import type { Template } from "./model";

export type Localized = { ar: string; en: string };
export type BuilderField = {
  id: string;
  kind: "text" | "textarea" | "number" | "date" | "select" | "file";
  required: boolean;
  label: Localized;
  help: Localized;
  options: { id: string; label: Localized }[];
};
export const providerKeys = [
  "name",
  "license",
  "email",
  "phone",
  "reference",
  "date",
] as const;
export type ValueSource =
  | { kind: "fixed"; value: Localized }
  | { kind: "provider"; key: (typeof providerKeys)[number] }
  | { kind: "field"; fieldId: string };
export type BuilderRow = {
  id: string;
  label: Localized;
  visible: boolean;
  source: ValueSource;
};
export type BuilderParty = { title: Localized; rows: BuilderRow[] };
export type Alignment = "left" | "center" | "right";
export type AdditionalPdfLanguage = {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  title: string;
  content: string;
  firstParty: string;
  secondParty: string;
  firstPartyDetails?: string;
  secondPartyDetails?: string;
  selectOptionLabels?: Record<string, Record<string, string>>;
  identity: string;
  signatures: string;
  firstSignature: string;
  secondSignature: string;
  stamp: string;
  footer: string;
};
export type BuilderTemplate = {
  schemaVersion: 2;
  layout: "structured-v2";
  pdfLanguages?: string[];
  additionalLanguages?: AdditionalPdfLanguage[];
  title: Localized;
  parties: { first: BuilderParty; second: BuilderParty };
  fields: BuilderField[];
  clauses: { id: string; title: Localized; body: Localized }[];
  header: {
    visible: boolean;
    dataUrl: string;
    width: number;
    align: Alignment;
  };
  watermark: {
    visible: boolean;
    dataUrl: string;
    width: number;
    opacity: number;
  };
  footer: {
    rows: {
      id: string;
      label: Localized;
      visible: boolean;
      source:
        | { kind: "fixed"; value: Localized }
        | { kind: "first"; rowId: string };
    }[];
    extra: Localized;
    pageNumbers: boolean;
    align: Alignment;
  };
  signatures: {
    firstLabel: Localized;
    secondLabel: Localized;
    representative: Localized;
    role: Localized;
    signatureDataUrl: string;
    stampDataUrl: string;
    showFirst: boolean;
    showStamp: boolean;
    firstOnRight: boolean;
  };
};
const localized = (ar = "", en = ""): Localized => ({ ar, en });

/** Imports legal text verbatim. Image defaults are injected as frozen bytes by the server, not mutable URLs. */
export function importBuilder(template: Template): BuilderTemplate {
  const first = template.presentation?.firstParty;
  return {
    schemaVersion: 2,
    layout: "structured-v2",
    pdfLanguages: ["ar", "en"],
    additionalLanguages: [],
    title: localized(template.titleAr, template.titleEn),
    parties: {
      first: { title: localized("الطرف الأول", "First party"), rows: [] },
      second: {
        title: localized("الطرف الثاني", "Second party"),
        rows: [
          {
            id: "name",
            label: localized("الاسم", "Name"),
            visible: true,
            source: { kind: "provider", key: "name" },
          },
          {
            id: "license",
            label: localized(
              "رقم الرخصة / الرقم الشخصي",
              "License / personal number",
            ),
            visible: true,
            source: { kind: "provider", key: "license" },
          },
          {
            id: "email",
            label: localized("البريد الإلكتروني", "Email"),
            visible: true,
            source: { kind: "provider", key: "email" },
          },
          {
            id: "phone",
            label: localized("الهاتف", "Phone"),
            visible: true,
            source: { kind: "provider", key: "phone" },
          },
        ],
      },
    },
    fields: [],
    clauses: [
      {
        id: "imported",
        title: localized(),
        body: localized(template.contentAr, template.contentEn),
      },
    ],
    header: { visible: true, dataUrl: "", width: 330, align: "center" },
    watermark: { visible: true, dataUrl: "", width: 350, opacity: 0.08 },
    footer: {
      rows: [],
      extra: localized(),
      pageNumbers: true,
      align: "center",
    },
    signatures: {
      firstLabel: localized("توقيع الطرف الأول", "First party signature"),
      secondLabel: localized("توقيع مقدم الخدمة", "Provider signature"),
      representative: localized(first?.nameAr, first?.nameEn),
      role: localized(first?.roleAr, first?.roleEn),
      signatureDataUrl: first?.signatureDataUrl ?? "",
      stampDataUrl: first?.stampDataUrl ?? "",
      showFirst: true,
      showStamp: true,
      firstOnRight: true,
    },
  };
}
