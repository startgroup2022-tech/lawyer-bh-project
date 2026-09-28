import { AgreementError } from "./model";
import type { BuilderField } from "./builder-model";

/** A validated file UUID is only a reference. The signing transaction must also check staging ownership. */
export function parseBuilderValues(
  fields: BuilderField[],
  input: unknown,
): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new AgreementError("invalid_field_value");
  const raw = input as Record<string, unknown>;
  const allowed = new Set(fields.map((f) => f.id));
  for (const key of Object.keys(raw))
    if (!allowed.has(key)) throw new AgreementError("unknown_field");
  const result: Record<string, string> = {};
  for (const field of fields) {
    const rawValue = Object.hasOwn(raw, field.id) ? raw[field.id] : undefined;
    if (rawValue === undefined || rawValue === "") {
      if (field.required) throw new AgreementError("required_field");
      continue;
    }
    const invalid = (): never => {
      throw new AgreementError("invalid_field_value");
    };
    if (typeof rawValue !== "string") invalid();
    const value = (rawValue as string).trim();
    if (!value) {
      if (field.required) throw new AgreementError("required_field");
      continue;
    }
    if (
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/.test(
        value,
      )
    )
      invalid();
    if (value.length > (field.kind === "textarea" ? 3000 : 300)) invalid();
    if (
      field.kind === "number" &&
      (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
        !Number.isFinite(Number(value)))
    )
      invalid();
    if (field.kind === "date") {
      if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) invalid();
      const date = new Date(value + "T00:00:00Z");
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        invalid();
    }
    if (
      field.kind === "select" &&
      !field.options.some((option) => option.id === value)
    )
      invalid();
    if (
      field.kind === "file" &&
      !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
    )
      invalid();
    Object.defineProperty(result, field.id, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}
