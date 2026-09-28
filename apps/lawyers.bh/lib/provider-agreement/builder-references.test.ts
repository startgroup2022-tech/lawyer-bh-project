import { expect, it } from "vitest";
import { builderFieldInUse, builderRowInUse } from "./builder-references";
import { importBuilder } from "./builder-model";
import { legacyTemplate } from "./model";
it("protects fields used by party rows or legal text, and rows used by the footer", () => {
  const t = importBuilder(legacyTemplate());
  expect(builderFieldInUse(t, "office")).toBe(false);
  t.parties.first.rows = [
    {
      id: "address",
      label: { ar: "عنوان", en: "Address" },
      visible: true,
      source: { kind: "field", fieldId: "office" },
    },
  ];
  expect(builderFieldInUse(t, "office")).toBe(true);
  t.footer.rows = [
    {
      id: "address",
      label: { ar: "", en: "" },
      visible: true,
      source: { kind: "first", rowId: "address" },
    },
  ];
  expect(builderRowInUse(t, "first", "address")).toBe(true);
  t.clauses[0].body.ar += "{{field.extra}}";
  expect(builderFieldInUse(t, "extra")).toBe(true);
  expect(builderRowInUse(t, "second", "name")).toBe(false);
});
it("protects fields referenced by an additional language", () => {
  const t = importBuilder(legacyTemplate());
  t.additionalLanguages = [{ code: "fr", name: "Français", direction: "ltr", title: "Accord", content: "{{field.office}} {{first.address}}", firstParty: "Partie A", secondParty: "Partie B", identity: "Identité", signatures: "Signatures", firstSignature: "Signature A", secondSignature: "Signature B", stamp: "Cachet", footer: "" }];
  expect(builderFieldInUse(t, "office")).toBe(true);
  expect(builderRowInUse(t, "first", "address")).toBe(true);
});
