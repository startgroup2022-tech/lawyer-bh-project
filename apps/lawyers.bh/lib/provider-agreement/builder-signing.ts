import { AgreementError, type Version } from "./model";
import { signingVersion } from "./validation";
import { parseBuilderValues } from "./builder-values";
export function parseSigningInput(form: FormData, current: Version | null) {
  const versionId = signingVersion(
    form.get("providerAgreementVersionId"),
    current,
  );
  if (!current?.template.builder)
    return { versionId, values: {} as Record<string, string>, token: "" };
  const raw = form.get("providerAgreementValues") ?? "{}";
  if (typeof raw !== "string" || raw.length > 200000)
    throw new AgreementError("invalid_field_value");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new AgreementError("invalid_field_value");
  }
  const values = parseBuilderValues(current.template.builder.fields, input);
  const token = form.get("providerAgreementUploadToken") ?? "";
  if (
    typeof token !== "string" ||
    (token !== "" && !/^[a-f0-9]{64}$/.test(token))
  )
    throw new AgreementError("invalid_file_reference");
  return { versionId, values, token };
}
