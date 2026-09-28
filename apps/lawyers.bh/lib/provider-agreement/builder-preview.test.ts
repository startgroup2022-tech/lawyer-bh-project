import { expect, it } from "vitest";
import { previewBuilderValues } from "./builder-preview";
import type { BuilderField } from "./builder-model";
it("creates valid sample values for every field type and accepts explicit preview overrides", () => {
  const fields: BuilderField[] = (
    ["text", "textarea", "number", "date", "select", "file"] as const
  ).map((kind) => ({
    id: kind,
    kind,
    label: { ar: "حقل", en: "Field" },
    help: { ar: "", en: "" },
    required: true,
    options:
      kind === "select"
        ? [{ id: "first", label: { ar: "أول", en: "First" } }]
        : [],
  }));
  const sample = previewBuilderValues(fields, { text: "نص معاينة" });
  expect(sample.values.text).toBe("نص معاينة");
  expect(sample.values.select).toBe("first");
  expect(sample.values.number).toBe("1");
  expect(sample.fileNames[sample.values.file]).toBe("sample-document.pdf");
});
