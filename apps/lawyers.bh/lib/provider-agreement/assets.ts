import "server-only";
import sharp from "sharp";
import { AgreementError, type Template } from "./model";
export async function normalizeAsset(
  bytes: Buffer,
  mime: string,
): Promise<string> {
  if (bytes.length > 2 * 1024 * 1024)
    throw new AgreementError("asset_too_large", 413);
  if (!["image/png", "image/jpeg"].includes(mime))
    throw new AgreementError("invalid_asset");
  try {
    const image = sharp(bytes, {
        limitInputPixels: 8000000,
        failOn: "warning",
      }),
      meta = await image.metadata();
    if (
      !meta.width ||
      !meta.height ||
      meta.width > 4000 ||
      meta.height > 4000 ||
      (meta.pages ?? 1) > 1 ||
      `image/${meta.format}` !== mime
    )
      throw new Error();
    const result = await image
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    if (result.length > 256 * 1024)
      throw new AgreementError("asset_too_large", 413);
    return `data:image/png;base64,${result.toString("base64")}`;
  } catch (error) {
    if (error instanceof AgreementError) throw error;
    throw new AgreementError("invalid_asset");
  }
}
export async function validateTemplateAssets(
  template: Template,
): Promise<Template> {
  if (template.builder) {
    const b = template.builder;
    for (const value of [
      b.header.dataUrl,
      b.watermark.dataUrl,
      b.signatures.signatureDataUrl,
      b.signatures.stampDataUrl,
    ]) {
      if (!value) continue;
      const match =
        /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
      if (!match) throw new AgreementError("invalid_asset");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 256 * 1024)
        throw new AgreementError("asset_too_large", 413);
      await normalizeAsset(bytes, `image/${match[1]}`);
    }
    return template;
  }
  if (!template.presentation) return template;
  // Validate without changing the exact bytes stored in the approved version.
  for (const key of ["signatureDataUrl", "stampDataUrl"] as const) {
    const value = template.presentation.firstParty[key];
    if (!value) continue;
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
    if (!match) throw new AgreementError("invalid_asset");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 256 * 1024)
      throw new AgreementError("asset_too_large", 413);
    await normalizeAsset(bytes, `image/${match[1]}`);
  }
  return template;
}
