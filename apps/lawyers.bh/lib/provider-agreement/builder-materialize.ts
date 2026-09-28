import { renderTemplate, PLACEHOLDERS, type SigningData } from "./model";
import type { BuilderTemplate, ValueSource, AdditionalPdfLanguage } from "./builder-model";

export function disclosureLanguage(template: BuilderTemplate, preferred: "ar" | "en"): string {
  const selected = template.pdfLanguages ?? ["ar", "en"];
  return selected.includes(preferred) ? preferred : selected[0];
}

export function materializeAdditionalLanguage(
  template: BuilderTemplate,
  language: AdditionalPdfLanguage,
  data: SigningData,
  values: Record<string, string>,
  files: Record<string, string> = {},
) {
  const base = materializeBuilder(template, data, values, "en", files);
  const substitutions: Record<string, string> = {
    provider_name: base.providerIdentity.name,
    license_number: data.registrationNo,
    email: data.email,
    phone: data.phone,
    reference: data.reference,
    date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Bahrain" }).format(new Date(data.signedAt)),
    weekday_ar: new Intl.DateTimeFormat("ar-BH", { weekday: "long", timeZone: "Asia/Bahrain" }).format(new Date(data.signedAt)),
    weekday_en: new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Asia/Bahrain" }).format(new Date(data.signedAt)),
  };
  for (const field of template.fields) {
    const value = values[field.id] ?? "";
    substitutions[`field.${field.id}`] = field.kind === "file"
      ? (files[value] ?? "")
      : field.kind === "select"
        ? (language.selectOptionLabels?.[field.id]?.[value] ?? field.options.find((option) => option.id === value)?.label.en ?? "")
        : value;
  }
  for (const side of ["first", "second"] as const)
    for (const row of base.parties[side].rows) substitutions[`${side}.${row.id}`] = row.value;
  const render = (text: string) => text.replace(/\{\{([^{}]+)\}\}/g, (_, key: string) => substitutions[key] ?? "");
  return {
    title: render(language.title),
    parties: {
      first: { title: language.firstParty, rows: language.firstPartyDetails ? [{ id: "details", label: "", value: render(language.firstPartyDetails), visible: true }] : [] },
      second: { title: language.secondParty, rows: language.secondPartyDetails ? [{ id: "details", label: "", value: render(language.secondPartyDetails), visible: true }] : [] },
    },
    providerIdentity: base.providerIdentity,
    clauses: [{ id: language.code, title: "", body: render(language.content) }],
    footer: language.footer ? [render(language.footer)] : [],
    signatures: {
      firstLabel: language.firstSignature,
      secondLabel: language.secondSignature,
      representative: "",
      role: "",
    },
  };
}

export function publicBuilder(template: BuilderTemplate): BuilderTemplate {
  // Use a structural copy: clearing originals must never mutate the signed/private template.
  const result = structuredClone(template);
  result.signatures.signatureDataUrl = "";
  result.signatures.stampDataUrl = "";
  return result;
}

/** Read-only material shared by the pre-signing disclosure and PDF renderer. Values are never templates. */
export function materializeBuilder(
  template: BuilderTemplate,
  data: SigningData,
  values: Record<string, string>,
  locale: "ar" | "en",
  files: Record<string, string> = {},
) {
  const ar = locale === "ar";
  const provider = {
    name: ar
      ? data.fullNameAr || data.fullNameEn
      : data.fullNameEn || data.fullNameAr,
    license: data.registrationNo,
    email: data.email,
    phone: data.phone,
    reference: data.reference,
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bahrain",
    }).format(new Date(data.signedAt)),
  };
  const fieldValues = Object.fromEntries(
    template.fields.map((f) => [
      f.id,
      f.kind === "select"
        ? (f.options.find((o) => o.id === values[f.id])?.label[locale] ?? "")
        : f.kind === "file"
          ? values[f.id]
            ? (files[values[f.id]] ?? (ar ? "ملف مرفق" : "Attached file"))
            : ""
          : (values[f.id] ?? ""),
    ]),
  );
  const resolve = (source: ValueSource): string =>
    source.kind === "fixed"
      ? source.value[locale]
      : source.kind === "provider"
        ? provider[source.key]
        : (fieldValues[source.fieldId] ?? "");
  const parties = Object.fromEntries(
    (["first", "second"] as const).map((key) => [
      key,
      {
        title: template.parties[key].title[locale],
        rows: template.parties[key].rows.map((row) => ({
          id: row.id,
          label: row.label[locale],
          value: resolve(row.source),
          visible: row.visible,
        })),
      },
    ]),
  ) as Record<
    "first" | "second",
    {
      title: string;
      rows: { id: string; label: string; value: string; visible: boolean }[];
    }
  >;
  const substitutions: Record<string, string> = {};
  for (const key of PLACEHOLDERS) {
    const value = `{{${key}}}`;
    const rendered = renderTemplate(
      { titleAr: value, titleEn: value, contentAr: value, contentEn: value },
      data,
    );
    substitutions[key] = ar ? rendered.titleAr : rendered.titleEn;
  }
  for (const [key, value] of Object.entries(fieldValues))
    substitutions[`field.${key}`] = value;
  for (const side of ["first", "second"] as const)
    for (const row of parties[side].rows)
      substitutions[`${side}.${row.id}`] = row.value;
  const text = (value: string) =>
    value.replace(
      /\{\{([^{}]+)\}\}/g,
      (_, key: string) => substitutions[key] ?? "",
    );
  const footer = template.footer.rows
    .filter((row) => row.visible)
    .map((row) => {
      const value =
        row.source.kind === "fixed"
          ? row.source.value[locale]
          : (parties.first.rows.find(
              (r) => r.id === (row.source as { rowId: string }).rowId,
            )?.value ?? "");
      const label = row.label[locale];
      return value ? `${label ? label + ": " : ""}${value}` : "";
    })
    .filter(Boolean);
  if (template.footer.extra[locale]) footer.push(template.footer.extra[locale]);
  return {
    title: text(template.title[locale]),
    parties,
    providerIdentity: { name: provider.name, license: provider.license },
    clauses: template.clauses.map((c) => ({
      id: c.id,
      title: text(c.title[locale]),
      body: text(c.body[locale]),
    })),
    footer,
    signatures: {
      firstLabel: template.signatures.firstLabel[locale],
      secondLabel: template.signatures.secondLabel[locale],
      representative: template.signatures.representative[locale],
      role: template.signatures.role[locale],
    },
  };
}
