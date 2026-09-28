import { AgreementError, PLACEHOLDERS } from "./model";
import {
  providerKeys,
  type BuilderTemplate,
  type Localized,
  type ValueSource,
} from "./builder-model";

const fail = (code = "invalid_builder"): never => {
  throw new AgreementError(code);
};
export function builderObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  return value as Record<string, unknown>;
}
export function builderText(
  value: unknown,
  max: number,
  required = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/.test(
      value,
    )
  )
    return fail();
  return value;
}
function id(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9_]{0,39}$/.test(value) ||
    ["constructor", "prototype", "__proto__"].includes(value)
  )
    return fail("invalid_id");
  return value;
}
function bool(value: unknown): boolean {
  return typeof value === "boolean" ? value : fail();
}
function numeric(value: unknown, min: number, max: number): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : fail();
}
function choice<T extends string>(value: unknown, allowed: readonly T[]): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fail();
}
function list<T>(
  value: unknown,
  max: number,
  parse: (row: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value) || value.length > max) return fail();
  const seen = new Set<string>();
  return value.map((entry) => {
    const row = builderObject(entry),
      key = id(row.id);
    if (seen.has(key)) return fail("duplicate_id");
    seen.add(key);
    return parse({ ...row, id: key });
  });
}
function asset(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 350000 ||
    (value !== "" &&
      !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
  )
    return fail("invalid_asset");
  return value;
}

/** Structural validation only; image decoding, upload ownership and publication readiness are server gates. */
export function parseBuilder(value: unknown): BuilderTemplate {
  const v = builderObject(value);
  if (v.schemaVersion !== 2 || v.layout !== "structured-v2") return fail();
  const pdfLanguages = v.pdfLanguages === undefined ? ["ar", "en"] : v.pdfLanguages;
  if (!Array.isArray(pdfLanguages) || !pdfLanguages.length || pdfLanguages.length > 6 ||
      pdfLanguages.some((code) => typeof code !== "string" || !/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(code)) ||
      new Set(pdfLanguages).size !== pdfLanguages.length) return fail();
  const selectedLanguages = pdfLanguages as string[];
  function localized(value: unknown, max: number, required = false): Localized {
    const text = builderObject(value);
    return {
      ar: builderText(text.ar, max, required && selectedLanguages.includes("ar")),
      en: builderText(text.en, max, required && selectedLanguages.includes("en")),
    };
  }
  function formLabel(value: unknown): Localized {
    const text = builderObject(value);
    return { ar: builderText(text.ar, 120, true), en: builderText(text.en, 120, true) };
  }
  const fields: BuilderTemplate["fields"] = list(v.fields, 30, (f) => {
    const kind = choice(f.kind, [
      "text",
      "textarea",
      "number",
      "date",
      "select",
      "file",
    ]);
    const options = list(f.options, 30, (o) => ({
      id: id(o.id),
      label: formLabel(o.label),
    }));
    if (kind === "select" ? !options.length : options.length) return fail();
    return {
      id: id(f.id),
      kind,
      required: bool(f.required),
      label: formLabel(f.label),
      help: localized(f.help, 600),
      options,
    };
  });
  if (fields.filter((f) => f.kind === "file").length > 3) return fail();
  const fieldIds = new Set(fields.map((f) => f.id));
  function source(value: unknown): ValueSource {
    const s = builderObject(value);
    if (s.kind === "fixed")
      return { kind: "fixed", value: localized(s.value, 600) };
    if (s.kind === "provider")
      return { kind: "provider", key: choice(s.key, providerKeys) };
    if (s.kind === "field" && fieldIds.has(String(s.fieldId)))
      return { kind: "field", fieldId: id(s.fieldId) };
    return fail("invalid_field_reference");
  }
  function party(value: unknown): BuilderTemplate["parties"]["first"] {
    const p = builderObject(value);
    return {
      title: localized(p.title, 120, true),
      rows: list(p.rows, 30, (r) => ({
        id: id(r.id),
        label: localized(r.label, 120, true),
        visible: bool(r.visible),
        source: source(r.source),
      })),
    };
  }
  const p = builderObject(v.parties),
    parties = { first: party(p.first), second: party(p.second) };
  const allowed = new Set<string>(PLACEHOLDERS);
  fields.forEach((f) => allowed.add(`field.${f.id}`));
  for (const side of ["first", "second"] as const)
    parties[side].rows.forEach((r) => allowed.add(`${side}.${r.id}`));
  function legal(value: unknown, max: number, required = false): Localized {
    const text = localized(value, max, required);
    for (const content of [text.ar, text.en]) {
      for (const match of content.matchAll(/\{\{([^{}]+)\}\}/g))
        if (!allowed.has(match[1])) return fail("invalid_placeholder");
      if (/[{}]{2}/.test(content.replace(/\{\{[^{}]+\}\}/g, "")))
        return fail("invalid_placeholder");
    }
    return text;
  }
  const clauses = list(v.clauses, 60, (c) => ({
    id: id(c.id),
    title: legal(c.title, 200),
    body: legal(c.body, 30000, true),
  }));
  if (
    !clauses.length ||
    clauses.reduce((n, c) => n + c.body.ar.length + c.body.en.length, 0) >
      120000
  )
    return fail();
  const additionalLanguages = v.additionalLanguages === undefined ? [] : v.additionalLanguages;
  if (!Array.isArray(additionalLanguages) || additionalLanguages.length > 4) return fail();
  const parsedAdditional = additionalLanguages.map((entry) => {
    const item = builderObject(entry);
    const code = builderText(item.code, 8, true);
    if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(code) || code === "ar" || code === "en") return fail();
    const selectOptionLabels: Record<string, Record<string, string>> = {};
    if (item.selectOptionLabels !== undefined) {
      const rawLabels = builderObject(item.selectOptionLabels);
      if (Object.keys(rawLabels).length > 30) return fail();
      for (const [fieldId, rawOptions] of Object.entries(rawLabels)) {
        const field = fields.find((candidate) => candidate.id === fieldId && candidate.kind === "select");
        if (!field) return fail("invalid_field_reference");
        const options = builderObject(rawOptions);
        if (Object.keys(options).length > 30) return fail();
        selectOptionLabels[fieldId] = {};
        for (const [optionId, rawLabel] of Object.entries(options)) {
          if (!field.options.some((option) => option.id === optionId)) return fail("invalid_field_reference");
          selectOptionLabels[fieldId][optionId] = builderText(rawLabel, 120, true);
        }
      }
    }
    const result = {
      code,
      name: builderText(item.name, 80, true),
      direction: choice(item.direction, ["ltr", "rtl"]),
      title: builderText(item.title, 200, true),
      content: builderText(item.content, 30000, true),
      firstParty: builderText(item.firstParty, 120, true),
      secondParty: builderText(item.secondParty, 120, true),
      ...(item.firstPartyDetails === undefined ? {} : { firstPartyDetails: builderText(item.firstPartyDetails, 3000) }),
      ...(item.secondPartyDetails === undefined ? {} : { secondPartyDetails: builderText(item.secondPartyDetails, 3000) }),
      ...(item.selectOptionLabels === undefined ? {} : { selectOptionLabels }),
      identity: builderText(item.identity, 120, true),
      signatures: builderText(item.signatures, 120, true),
      firstSignature: builderText(item.firstSignature, 120, true),
      secondSignature: builderText(item.secondSignature, 120, true),
      stamp: builderText(item.stamp, 120, true),
      footer: builderText(item.footer, 600),
    };
    for (const content of [result.title, result.content, result.footer, result.firstPartyDetails ?? "", result.secondPartyDetails ?? ""]) {
      for (const match of content.matchAll(/\{\{([^{}]+)\}\}/g))
        if (!allowed.has(match[1])) return fail("invalid_placeholder");
      if (/[{}]{2}/.test(content.replace(/\{\{[^{}]+\}\}/g, ""))) return fail("invalid_placeholder");
    }
    return result;
  });
  if (new Set(parsedAdditional.map((item) => item.code)).size !== parsedAdditional.length ||
      parsedAdditional.some((item) => !pdfLanguages.includes(item.code)) ||
      pdfLanguages.some((code) => code !== "ar" && code !== "en" && !parsedAdditional.some((item) => item.code === code))) return fail();
  const h = builderObject(v.header),
    w = builderObject(v.watermark),
    f = builderObject(v.footer),
    s = builderObject(v.signatures);
  const align = (value: unknown) => choice(value, ["left", "center", "right"]);
  return {
    schemaVersion: 2,
    layout: "structured-v2",
    ...(v.pdfLanguages === undefined ? {} : { pdfLanguages: selectedLanguages }),
    ...(v.additionalLanguages === undefined ? {} : { additionalLanguages: parsedAdditional }),
    title: legal(v.title, 200, true),
    parties,
    fields,
    clauses,
    header: {
      visible: bool(h.visible),
      dataUrl: asset(h.dataUrl),
      width: numeric(h.width, 50, 480),
      align: align(h.align),
    },
    watermark: {
      visible: bool(w.visible),
      dataUrl: asset(w.dataUrl),
      width: numeric(w.width, 50, 480),
      opacity: numeric(w.opacity, 0, 0.3),
    },
    footer: {
      extra: localized(f.extra, 600),
      pageNumbers: bool(f.pageNumbers),
      align: align(f.align),
      rows: list(f.rows, 12, (r) => {
        const s = builderObject(r.source);
        const rowSource: BuilderTemplate["footer"]["rows"][number]["source"] =
          s.kind === "fixed"
            ? { kind: "fixed", value: localized(s.value, 600) }
            : s.kind === "first" &&
                parties.first.rows.some((row) => row.id === s.rowId)
              ? { kind: "first", rowId: id(s.rowId) }
              : fail("invalid_field_reference");
        return {
          id: id(r.id),
          label: localized(r.label, 120),
          visible: bool(r.visible),
          source: rowSource,
        };
      }),
    },
    signatures: {
      firstLabel: localized(s.firstLabel, 120, true),
      secondLabel: localized(s.secondLabel, 120, true),
      representative: localized(s.representative, 120),
      role: localized(s.role, 120),
      signatureDataUrl: asset(s.signatureDataUrl),
      stampDataUrl: asset(s.stampDataUrl),
      showFirst: bool(s.showFirst),
      showStamp: bool(s.showStamp),
      firstOnRight: bool(s.firstOnRight),
    },
  };
}
