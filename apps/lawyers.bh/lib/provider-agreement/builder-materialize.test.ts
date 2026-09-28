import { expect, it } from "vitest";
import { importBuilder } from "./builder-model";
import { legacyTemplate, sampleData } from "./model";
import { materializeBuilder, materializeAdditionalLanguage, disclosureLanguage, publicBuilder } from "./builder-materialize";
it("discloses a selected PDF language even when the website uses another language", () => {
  const template = importBuilder(legacyTemplate());
  template.pdfLanguages = ["en"];
  expect(disclosureLanguage(template, "ar")).toBe("en");
  template.pdfLanguages = ["fr"];
  template.additionalLanguages = [{ code: "fr", name: "Français", direction: "ltr", title: "Accord", content: "Bonjour {{provider_name}}", firstParty: "Partie A", secondParty: "Partie B", identity: "Identité", signatures: "Signatures", firstSignature: "Signature A", secondSignature: "Signature B", stamp: "Cachet", footer: "" }];
  expect(disclosureLanguage(template, "ar")).toBe("fr");
  expect(materializeAdditionalLanguage(template, template.additionalLanguages[0], sampleData, {}).clauses[0].body).toContain("Mohammed Ahmed Abdullah");
});
it("shows manually authored party details in an additional language", () => {
  const template = importBuilder(legacyTemplate());
  const language = { code: "fr", name: "Français", direction: "ltr" as const, title: "Accord", content: "Conditions", firstParty: "Plateforme", secondParty: "Avocat", firstPartyDetails: "Société ABC", secondPartyDetails: "Maître {{provider_name}} · {{license_number}}", identity: "Identité", signatures: "Signatures", firstSignature: "Signature A", secondSignature: "Signature B", stamp: "Cachet", footer: "" };
  template.pdfLanguages = ["fr"];
  template.additionalLanguages = [language];
  const rendered = materializeAdditionalLanguage(template, language, sampleData, {});
  expect(rendered.parties.first.rows).toEqual([{ id: "details", label: "", value: "Société ABC", visible: true }]);
  expect(rendered.parties.second.rows[0].value).toBe("Maître Mohammed Ahmed Abdullah · 12345");
});
it("uses a human-readable attachment name in additional-language placeholders", () => {
  const template = importBuilder(legacyTemplate());
  template.fields = [{ id: "proof", kind: "file", required: false, label: { ar: "المرفق", en: "Attachment" }, help: { ar: "", en: "" }, options: [] }];
  const language = { code: "fr", name: "Français", direction: "ltr" as const, title: "Accord", content: "Pièce: {{field.proof}}", firstParty: "Partie A", secondParty: "Partie B", identity: "Identité", signatures: "Signatures", firstSignature: "Signature A", secondSignature: "Signature B", stamp: "Cachet", footer: "" };
  const rendered = materializeAdditionalLanguage(template, language, sampleData, { proof: "internal_reference" }, { internal_reference: "licence.pdf" });
  expect(rendered.clauses[0].body).toBe("Pièce: licence.pdf");
});
it("uses a manual translation for a selected choice in an additional language", () => {
  const template = importBuilder(legacyTemplate());
  template.fields = [{ id: "degree", kind: "select", required: false, label: { ar: "المؤهل", en: "Degree" }, help: { ar: "", en: "" }, options: [{ id: "llb", label: { ar: "بكالوريوس", en: "Bachelor" } }] }];
  const language = { code: "fr", name: "Français", direction: "ltr" as const, title: "Accord", content: "Diplôme: {{field.degree}}", firstParty: "Partie A", secondParty: "Partie B", identity: "Identité", signatures: "Signatures", firstSignature: "Signature A", secondSignature: "Signature B", stamp: "Cachet", footer: "", selectOptionLabels: { degree: { llb: "Licence en droit" } } };
  expect(materializeAdditionalLanguage(template, language, sampleData, { degree: "llb" }).clauses[0].body).toBe("Diplôme: Licence en droit");
});
it("resolves fixed and applicant rows once, sharing values across footer and clauses", () => {
  const t = importBuilder(legacyTemplate());
  t.parties.first.rows = [
    {
      id: "office",
      label: { ar: "المكتب", en: "Office" },
      visible: true,
      source: { kind: "fixed", value: { ar: "المنامة", en: "Manama" } },
    },
  ];
  t.fields = [
    {
      id: "degree",
      kind: "select",
      required: true,
      label: { ar: "المؤهل", en: "Degree" },
      help: { ar: "", en: "" },
      options: [{ id: "llb", label: { ar: "بكالوريوس", en: "LLB" } }],
    },
  ];
  t.footer.rows = [
    {
      id: "office",
      label: { ar: "العنوان", en: "Address" },
      visible: true,
      source: { kind: "first", rowId: "office" },
    },
  ];
  t.clauses = [
    {
      id: "one",
      title: { ar: "بيانات", en: "Details" },
      body: {
        ar: "{{first.office}} | {{provider_name}} | {{field.degree}}",
        en: "{{first.office}} | {{provider_name}} | {{field.degree}}",
      },
    },
  ];
  const ar = materializeBuilder(
    t,
    { ...sampleData, fullNameAr: "محمد {{email}}" },
    { degree: "llb" },
    "ar",
  );
  expect(ar.clauses[0].body).toBe("المنامة | محمد {{email}} | بكالوريوس");
  expect(ar.footer).toEqual(["العنوان: المنامة"]);
  const en = materializeBuilder(t, sampleData, { degree: "llb" }, "en");
  expect(en.clauses[0].body).toBe("Manama | Mohammed Ahmed Abdullah | LLB");
});
it("always discloses real provider identity even if editable rows are hidden", () => {
  const t = importBuilder(legacyTemplate());
  t.parties.second.rows = [];
  expect(materializeBuilder(t, sampleData, {}, "en").providerIdentity).toEqual({
    name: "Mohammed Ahmed Abdullah",
    license: "12345",
  });
});
it("never puts raw signature assets in the public projection", () => {
  const t = importBuilder(legacyTemplate());
  t.signatures.signatureDataUrl = "data:image/png;base64,SECRET";
  t.signatures.stampDataUrl = "data:image/png;base64,STAMP";
  const projected = publicBuilder(t);
  expect(projected.signatures.signatureDataUrl).toBe("");
  expect(projected.signatures.stampDataUrl).toBe("");
  expect(t.signatures.signatureDataUrl).toContain("SECRET");
});
