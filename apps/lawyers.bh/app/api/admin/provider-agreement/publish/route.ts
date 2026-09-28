import { agreements } from "@/lib/provider-agreement/repository";
import { endpoint, json, readJson } from "@/lib/provider-agreement/http";
import { AgreementError } from "@/lib/provider-agreement/model";
export async function POST(request: Request) {
  return endpoint(
    request,
    async (actor) => {
      const body = await readJson(request);
      if (body.confirmation !== "PUBLISH")
        throw new AgreementError("publish_confirmation_required");
      return json({
        ok: true,
        version: await agreements.publish(
          body.id as string,
          body.revision as number,
          actor,
        ),
      });
    },
    true,
  );
}
