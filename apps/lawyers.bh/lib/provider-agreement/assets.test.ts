import { expect, it } from "vitest";
import sharp from "sharp";
import { normalizeAsset, validateTemplateAssets } from "./assets";
import { legacyTemplate, modernDraft } from "./model";
it("decodes a real image, strips metadata and bounds its saved dimensions", async () => {
  const original = await sharp({
    create: {
      width: 1200,
      height: 600,
      channels: 4,
      background: "transparent",
    },
  })
    .png()
    .toBuffer();
  const value = await normalizeAsset(original, "image/png");
  const bytes = Buffer.from(value.split(",")[1], "base64"),
    meta = await sharp(bytes).metadata();
  expect(meta.format).toBe("png");
  expect(meta.width).toBe(800);
  expect(meta.height).toBe(400);
  expect(bytes.length).toBeLessThanOrEqual(262144);
  const template = modernDraft(legacyTemplate());
  template.presentation!.firstParty.signatureDataUrl = value;
  expect(
    (await validateTemplateAssets(template)).presentation!.firstParty
      .signatureDataUrl,
  ).toBe(value);
});
it("rejects oversized uploads, MIME mismatch, invalid image bytes and excessive pixels", async () => {
  await expect(
    normalizeAsset(Buffer.alloc(2097153), "image/png"),
  ).rejects.toThrow("asset_too_large");
  await expect(
    normalizeAsset(Buffer.from("<svg/>"), "image/svg+xml"),
  ).rejects.toThrow("invalid_asset");
  await expect(
    normalizeAsset(Buffer.from("fake"), "image/png"),
  ).rejects.toThrow("invalid_asset");
  const bytes = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  await expect(normalizeAsset(bytes, "image/png")).rejects.toThrow(
    "invalid_asset",
  );
  const huge = await sharp({
    create: { width: 4001, height: 2000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(normalizeAsset(huge, "image/png")).rejects.toThrow(
    "invalid_asset",
  );
});
it("rejects raw malformed assets even when bypassing the upload endpoint", async () => {
  const template = modernDraft(legacyTemplate());
  template.presentation!.firstParty.stampDataUrl =
    "data:image/png;base64,ZmFrZQ==";
  await expect(validateTemplateAssets(template)).rejects.toThrow(
    "invalid_asset",
  );
});
