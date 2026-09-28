import type { BuilderField } from "./builder-model";
import { parseBuilderValues } from "./builder-values";
export function previewBuilderValues(
  fields: BuilderField[],
  overrides: Record<string, string> = {},
) {
  const defaults: Record<string, string> = {},
    fileNames: Record<string, string> = {};
  for (const [i, f] of fields.entries()) {
    defaults[f.id] =
      f.kind === "number"
        ? "1"
        : f.kind === "date"
          ? "2026-09-10"
          : f.kind === "select"
            ? (f.options[0]?.id ?? "")
            : f.kind === "file"
              ? `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`
              : "قيمة تجريبية / Sample value";
    if (f.kind === "file") fileNames[defaults[f.id]] = "sample-document.pdf";
  }
  return {
    values: parseBuilderValues(fields, { ...defaults, ...overrides }),
    fileNames,
  };
}
