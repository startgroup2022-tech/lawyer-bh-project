import { agreements } from "@/lib/provider-agreement/repository";
import { endpoint, json } from "@/lib/provider-agreement/http";
import { legacyTemplate, publicTemplate } from "@/lib/provider-agreement/model";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(request, async () => {
    const current = await agreements.current();
    return json({
      ok: true,
      versionId: current?.id ?? "legacy",
      template: publicTemplate(current?.template ?? legacyTemplate()),
    });
  });
}
