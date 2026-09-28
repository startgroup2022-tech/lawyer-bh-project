import {
  endpoint,
  privateHeaders,
  readJson,
} from "@/lib/provider-agreement/http";
import { parseTemplate, sampleData } from "@/lib/provider-agreement/model";
import { previewSignature } from "@/lib/provider-agreement/validation";
import { renderProviderPdf } from "@/lib/provider-agreement/pdf";
import { validateTemplateAssets } from "@/lib/provider-agreement/assets";
import { previewBuilderValues } from "@/lib/provider-agreement/builder-preview";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(
    request,
    async () => {
      const body = await readJson(request, 2200000),
        template = await validateTemplateAssets(parseTemplate(body.template));
      const data = {
        ...sampleData,
        ...(template.builder
          ? (() => {
              const preview = previewBuilderValues(
                template.builder.fields,
                (body.extraValues ?? {}) as Record<string, string>,
              );
              return {
                extraValues: preview.values,
                fileNames: preview.fileNames,
              };
            })()
          : {}),
        signatureDataUrl: previewSignature(body.signatureDataUrl),
      };
      const bytes = await renderProviderPdf(
        {
          providerId: "preview",
          versionId: null,
          template,
          data,
          legacy: false,
        },
        true,
      );
      return new Response(new Uint8Array(bytes), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline; filename=agreement-preview.pdf",
        },
      });
    },
    true,
  );
}
