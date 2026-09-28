import "server-only";
import { parseSigningInput } from "./builder-signing";
import { agreementFiles } from "./repository";
import { renderBuilderPdf } from "./builder-pdf";
import type { Version } from "./model";
export async function prepareSigning(form: FormData, current: Version | null) {
  const input = parseSigningInput(form, current);
  if (!current?.template.builder) return { ...input, uploadHash: null };
  const files = await agreementFiles.validateReferences(
    input.token,
    current.id,
    input.values,
    current.template.builder.fields,
  );
  // Validate real-length data before accepting a signature, so an oversized footer cannot create an unreadable signed document.
  const text = (key: string) => String(form.get(key) ?? "").slice(0, 300);
  const license = text("licenseNumber");
  await renderBuilderPdf(
    current.template.builder,
    {
      fullNameAr: text("fullNameAr"),
      fullNameEn: text("fullNameEn"),
      email: text("email"),
      phone: text("phone"),
      registrationNo: license,
      reference: `PROVIDER-${license}`,
      signedAt: new Date().toISOString(),
      signatureDataUrl: "",
    },
    input.values,
    true,
    current.id,
    files.fileNames,
  );
  return { ...input, uploadHash: files.tokenHash };
}
