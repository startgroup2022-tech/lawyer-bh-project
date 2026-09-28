import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { endpoint, json, readJson } from "@/lib/provider-agreement/http";
import { parseTemplate } from "@/lib/provider-agreement/model";
import { importBuilder } from "@/lib/provider-agreement/builder-model";
import { normalizeAsset } from "@/lib/provider-agreement/assets";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(
    request,
    async () => {
      const body = await readJson(request, 2200000),
        old = parseTemplate(body.template);
      if (old.builder) return json({ ok: true, template: old });
      const builder = importBuilder(old);
      const [header, watermark] = await Promise.all([
        readFile(path.join(process.cwd(), "public/images/logo-full-ar.png")),
        readFile(path.join(process.cwd(), "app/apple-icon.png")),
      ]);
      builder.header.dataUrl = await normalizeAsset(header, "image/png");
      builder.watermark.dataUrl = await normalizeAsset(
        await sharp(watermark)
          .resize({ width: 300, height: 300, fit: "inside" })
          .png()
          .toBuffer(),
        "image/png",
      );
      return json({ ok: true, template: parseTemplate({ builder }) });
    },
    true,
  );
}
