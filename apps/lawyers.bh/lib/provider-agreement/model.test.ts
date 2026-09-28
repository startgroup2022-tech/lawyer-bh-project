import { expect, it } from "vitest";
import { parseTemplate, renderTemplate, legacyTemplate } from "./model";
it("preserves versioned presentation but never interprets signer metadata as legal placeholders", () => {
  const presentation = {
    layout: "modern-v1",
    firstParty: {
      nameAr: "محمد {{email}}",
      nameEn: "Example",
      roleAr: "مفوض",
      roleEn: "Representative",
      signatureDataUrl: "",
      stampDataUrl: "",
    },
  };
  const result = parseTemplate({ ...legacyTemplate(), presentation });
  expect(result).toHaveProperty("presentation", presentation);
});
it("rejects unsupported layouts and unsafe signing asset sources", () => {
  expect(() =>
    parseTemplate({ ...legacyTemplate(), presentation: { layout: "future" } }),
  ).toThrow("invalid_presentation");
  expect(() =>
    parseTemplate({
      ...legacyTemplate(),
      presentation: {
        layout: "modern-v1",
        firstParty: {
          signatureDataUrl: "https://external.invalid/signature.png",
        },
      },
    }),
  ).toThrow();
});
it("rejects unknown placeholders and blank legal content", () => {
  expect(() =>
    parseTemplate({ ...legacyTemplate(), contentAr: "{{unknown}}" }),
  ).toThrow("invalid_placeholder");
  expect(() => parseTemplate({ ...legacyTemplate(), contentEn: " " })).toThrow(
    "invalid_template",
  );
});
it("replaces only supported placeholders once without treating applicant data as a template", () => {
  const template = {
    ...legacyTemplate(),
    contentAr: "الاسم {{provider_name}} البريد {{email}}",
    contentEn: "Name {{provider_name}}",
  };
  const result = renderTemplate(template, {
    fullNameAr: "محمد {{email}}",
    fullNameEn: "Mohammed",
    email: "test@example.invalid",
    phone: "+97333333333",
    registrationNo: "123",
    signedAt: "2026-09-09T12:00:00Z",
    signatureDataUrl: "",
    reference: "PROVIDER-123",
  });
  expect(result.contentAr).toBe(
    "الاسم محمد {{email}} البريد test@example.invalid",
  );
  expect(result.contentEn).toBe("Name Mohammed");
});
