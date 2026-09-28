import { describe, expect, it } from "vitest";
import {
  legacyTemplate,
  modernDraft,
  parseTemplate,
  publicTemplate,
} from "./model";
import { importBuilder, type BuilderField } from "./builder-model";
import { parseBuilder } from "./builder-validation";
import { parseBuilderValues } from "./builder-values";

const field = (kind: BuilderField["kind"], required = true): BuilderField => ({
  id: "extra",
  kind,
  required,
  label: { ar: "إضافي", en: "Extra" },
  help: { ar: "", en: "" },
  options: [],
});

describe("structured agreement import", () => {
  it("retains structured content through draft parsing and strips signing images for disclosure", () => {
    const builder = importBuilder(legacyTemplate());
    builder.signatures.signatureDataUrl = "data:image/png;base64,AAAA";
    const parsed = parseTemplate({ builder });
    expect(parsed.builder?.clauses[0].body.ar).toBe(legacyTemplate().contentAr);
    expect(publicTemplate(parsed).builder?.signatures.signatureDataUrl).toBe(
      "",
    );
    expect(parsed.builder?.signatures.signatureDataUrl).toBe(
      "data:image/png;base64,AAAA",
    );
  });
  it("retains the complete legacy legal text without guessing clause boundaries", () => {
    const old = legacyTemplate();
    const imported = parseBuilder(importBuilder(old));
    expect(imported.clauses).toHaveLength(1);
    expect(imported.clauses[0].body.ar).toBe(old.contentAr);
    expect(imported.clauses[0].body.en).toBe(old.contentEn);
    expect(imported.title).toEqual({ ar: old.titleAr, en: old.titleEn });
    expect(imported.header.align).toBe("center");
    expect(imported.watermark.opacity).toBe(0.08);
  });
  it("does not add language settings to an older structured snapshot", () => {
    const old = importBuilder(legacyTemplate());
    delete old.pdfLanguages;
    delete old.additionalLanguages;
    const parsed = parseBuilder(old);
    expect(parsed.pdfLanguages).toBeUndefined();
    expect(parsed.additionalLanguages).toBeUndefined();
  });
  it("copies representative details without sharing mutable state", () => {
    const old = modernDraft(legacyTemplate());
    old.presentation!.firstParty.nameAr = "مفوض المنصة";
    const first = importBuilder(old),
      second = importBuilder(old);
    first.signatures.representative.ar = "تغيير";
    expect(second.signatures.representative.ar).toBe("مفوض المنصة");
    expect(old.presentation!.firstParty.nameAr).toBe("مفوض المنصة");
  });
});

describe("builder definitions", () => {
  it("keeps an ordered PDF language selection and manually authored copy", () => {
    const value = importBuilder(legacyTemplate());
    value.pdfLanguages = ["en", "fr"];
    value.additionalLanguages = [{
      code: "fr", name: "Français", direction: "ltr",
      title: "Accord avocat", content: "Conditions de {{provider_name}}",
      firstParty: "Première partie", secondParty: "Avocat",
      identity: "Identité du signataire", signatures: "Signatures",
      firstSignature: "Signature plateforme", secondSignature: "Signature avocat",
      stamp: "Cachet", footer: "Bahreïn",
    }];
    const parsed = parseTemplate({ builder: value });
    expect(parsed.builder?.pdfLanguages).toEqual(["en", "fr"]);
    expect(parsed.builder?.additionalLanguages?.[0].content).toBe("Conditions de {{provider_name}}");
    value.additionalLanguages![0].firstPartyDetails = "Société ABC";
    value.additionalLanguages![0].secondPartyDetails = "Maître {{provider_name}}";
    expect(parseBuilder(value).additionalLanguages?.[0].secondPartyDetails).toBe("Maître {{provider_name}}");
    expect(() => parseBuilder({ ...value, additionalLanguages: [{ ...value.additionalLanguages![0], firstPartyDetails: "{{missing}}" }] })).toThrow("invalid_placeholder");
    value.fields = [{ id: "degree", kind: "select", required: false, label: { ar: "المؤهل", en: "Degree" }, help: { ar: "", en: "" }, options: [{ id: "llb", label: { ar: "بكالوريوس", en: "Bachelor" } }] }];
    value.additionalLanguages![0].selectOptionLabels = { degree: { llb: "Licence en droit" } };
    expect(parseBuilder(value).additionalLanguages?.[0].selectOptionLabels?.degree.llb).toBe("Licence en droit");
    expect(() => parseBuilder({ ...value, additionalLanguages: [{ ...value.additionalLanguages![0], selectOptionLabels: { unknown: { llb: "x" } } }] })).toThrow();
    expect(() => parseBuilder({ ...value, pdfLanguages: [] })).toThrow();
    expect(() => parseBuilder({ ...value, pdfLanguages: ["fr", "fr"] })).toThrow();
    expect(() => parseBuilder({ ...value, pdfLanguages: ["de"] })).toThrow();
    expect(() => parseBuilder({ ...value, additionalLanguages: [{ ...value.additionalLanguages![0], content: "" }] })).toThrow();
    expect(() => parseBuilder({ ...value, additionalLanguages: [{ ...value.additionalLanguages![0], content: "{{missing}}" }] })).toThrow("invalid_placeholder");
  });
  it("requires text only for the built-in languages included in the PDF", () => {
    const value = importBuilder(legacyTemplate());
    value.pdfLanguages = ["ar"];
    value.title.en = "";
    value.clauses[0].body.en = "";
    expect(parseBuilder(value).pdfLanguages).toEqual(["ar"]);
    value.title.ar = "";
    expect(() => parseBuilder(value)).toThrow();
  });
  it("keeps registration field labels bilingual even for a one-language PDF", () => {
    const value = importBuilder(legacyTemplate());
    value.pdfLanguages = ["ar"];
    value.fields = [field("text")];
    value.fields[0].label.en = "";
    expect(() => parseBuilder(value)).toThrow();
  });
  it("accepts references to defined applicant fields and party rows", () => {
    const value = importBuilder(legacyTemplate());
    value.fields = [field("text")];
    value.parties.first.rows.push({
      id: "office",
      label: { ar: "مكتب", en: "Office" },
      visible: true,
      source: { kind: "field", fieldId: "extra" },
    });
    value.clauses[0].body.ar += "\n{{field.extra}} {{first.office}}";
    expect(parseBuilder(value).fields[0].id).toBe("extra");
  });
  it("rejects deleted fields referenced by rows or clauses", () => {
    const value = importBuilder(legacyTemplate());
    value.clauses[0].body.ar += "{{field.deleted}}";
    expect(() => parseBuilder(value)).toThrow("invalid_placeholder");
    value.clauses[0].body.ar = "نص";
    value.parties.first.rows.push({
      id: "office",
      label: { ar: "مكتب", en: "Office" },
      visible: true,
      source: { kind: "field", fieldId: "deleted" },
    });
    expect(() => parseBuilder(value)).toThrow("invalid_field_reference");
  });
  it("rejects ambiguous IDs, prototype keys, excess fields and duplicate choices", () => {
    for (const fields of [
      [field("text"), field("number")],
      [{ ...field("text"), id: "__proto__" }],
      Array.from({ length: 31 }, (_, i) => ({
        ...field("text"),
        id: `field_${i}`,
      })),
    ]) {
      expect(() =>
        parseBuilder({ ...importBuilder(legacyTemplate()), fields }),
      ).toThrow();
    }
    const select = {
      ...field("select"),
      options: [
        { id: "one", label: { ar: "واحد", en: "One" } },
        { id: "one", label: { ar: "ثان", en: "Two" } },
      ],
    };
    expect(() =>
      parseBuilder({ ...importBuilder(legacyTemplate()), fields: [select] }),
    ).toThrow("duplicate_id");
  });
  it("rejects invalid layout bounds, mutable image URLs and too many file inputs", () => {
    const value = importBuilder(legacyTemplate());
    expect(() =>
      parseBuilder({
        ...value,
        watermark: { ...value.watermark, opacity: 1.2 },
      }),
    ).toThrow();
    expect(() =>
      parseBuilder({
        ...value,
        header: {
          ...value.header,
          dataUrl: "https://example.invalid/logo.png",
        },
      }),
    ).toThrow("invalid_asset");
    expect(() =>
      parseBuilder({
        ...value,
        fields: Array.from({ length: 4 }, (_, i) => ({
          ...field("file"),
          id: `file_${i}`,
        })),
      }),
    ).toThrow();
    expect(() =>
      parseBuilder({
        ...value,
        footer: { ...value.footer, extra: { ar: "x".repeat(601), en: "" } },
      }),
    ).toThrow();
  });
  it("rejects unsafe display controls, malformed placeholders and unknown provider sources", () => {
    const value = importBuilder(legacyTemplate());
    expect(() =>
      parseBuilder({ ...value, title: { ar: "\u202eعنوان", en: "Title" } }),
    ).toThrow();
    value.clauses[0].body.ar = "{{missing";
    expect(() => parseBuilder(value)).toThrow("invalid_placeholder");
    const other = importBuilder(legacyTemplate());
    other.parties.first.rows.push({
      id: "wrong",
      label: { ar: "حقل", en: "Field" },
      visible: true,
      source: { kind: "provider", key: "password" } as never,
    });
    expect(() => parseBuilder(other)).toThrow();
  });
});

describe("applicant values", () => {
  it("rejects missing mandatory fields and unknown input keys", () => {
    expect(() => parseBuilderValues([field("text")], {})).toThrow(
      "required_field",
    );
    expect(() => parseBuilderValues([], { unknown: "value" })).toThrow(
      "unknown_field",
    );
    expect(parseBuilderValues([field("text", false)], {})).toEqual({});
  });
  it("preserves text as data and applies the per-kind bounds", () => {
    expect(
      parseBuilderValues([field("text")], { extra: " {{email}} " }),
    ).toEqual({ extra: "{{email}}" });
    expect(() =>
      parseBuilderValues([field("text")], { extra: "x".repeat(301) }),
    ).toThrow("invalid_field_value");
    expect(
      parseBuilderValues([field("textarea")], { extra: "x".repeat(3000) })
        .extra,
    ).toHaveLength(3000);
    expect(() =>
      parseBuilderValues([field("textarea")], { extra: "x".repeat(3001) }),
    ).toThrow();
    expect(() =>
      parseBuilderValues([field("text")], { extra: { value: "wrong" } }),
    ).toThrow();
  });
  it.each(["NaN", "Infinity", "1e309", "0x10", "1,000", "--1"])(
    "rejects invalid numeric value %s",
    (extra) => {
      expect(() => parseBuilderValues([field("number")], { extra })).toThrow(
        "invalid_field_value",
      );
    },
  );
  it.each(["0", "-3", "30.001", "1.5e2"])(
    "accepts finite decimal value %s without rounding",
    (extra) => {
      expect(parseBuilderValues([field("number")], { extra })).toEqual({
        extra,
      });
    },
  );
  it.each([
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-1-01",
    "2026-01-00",
    "0000-01-01",
  ])("rejects invalid date %s", (extra) => {
    expect(() => parseBuilderValues([field("date")], { extra })).toThrow(
      "invalid_field_value",
    );
  });
  it("accepts leap day only in a leap year", () => {
    expect(
      parseBuilderValues([field("date")], { extra: "2028-02-29" }),
    ).toEqual({ extra: "2028-02-29" });
  });
  it("uses choice IDs instead of labels and does not accept remote files", () => {
    const choice = {
      ...field("select"),
      options: [{ id: "bahrain", label: { ar: "البحرين", en: "Bahrain" } }],
    };
    expect(parseBuilderValues([choice], { extra: "bahrain" })).toEqual({
      extra: "bahrain",
    });
    expect(() => parseBuilderValues([choice], { extra: "Bahrain" })).toThrow();
    expect(() =>
      parseBuilderValues([field("file")], {
        extra: "https://example.invalid/cv.pdf",
      }),
    ).toThrow();
    expect(
      parseBuilderValues([field("file")], {
        extra: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({ extra: "00000000-0000-4000-8000-000000000001" });
  });
});
