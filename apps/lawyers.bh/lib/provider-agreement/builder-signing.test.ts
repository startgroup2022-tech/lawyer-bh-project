import { expect, it } from "vitest";
import { parseSigningInput } from "./builder-signing";
import { importBuilder } from "./builder-model";
import { legacyTemplate, parseTemplate, type Version } from "./model";
const current = (): Version => ({
  id: "v1",
  number: 1,
  revision: 1,
  status: "published",
  createdAt: "2026-09-10",
  template: parseTemplate({ builder: importBuilder(legacyTemplate()) }),
});
it("rejects a stale disclosure before interpreting dynamic values", () => {
  const fd = new FormData();
  fd.set("providerAgreementVersionId", "v0");
  expect(() => parseSigningInput(fd, current())).toThrow(
    "agreement_version_stale",
  );
});
it("validates required values using the exact published version", () => {
  const v = current();
  v.template.builder!.fields = [
    {
      id: "office",
      kind: "text",
      required: true,
      label: { ar: "مكتب", en: "Office" },
      help: { ar: "", en: "" },
      options: [],
    },
  ];
  const fd = new FormData();
  fd.set("providerAgreementVersionId", "v1");
  fd.set("providerAgreementValues", "{}");
  expect(() => parseSigningInput(fd, v)).toThrow("required_field");
  fd.set("providerAgreementValues", JSON.stringify({ office: "المنامة" }));
  expect(parseSigningInput(fd, v)).toEqual({
    versionId: "v1",
    values: { office: "المنامة" },
    token: "",
  });
});
it("rejects malformed extra JSON and keeps legacy submissions compatible", () => {
  const fd = new FormData();
  fd.set("providerAgreementVersionId", "v1");
  fd.set("providerAgreementValues", "[");
  expect(() => parseSigningInput(fd, current())).toThrow("invalid_field_value");
  fd.set("providerAgreementVersionId", "legacy");
  expect(parseSigningInput(fd, null)).toEqual({
    versionId: null,
    values: {},
    token: "",
  });
});
