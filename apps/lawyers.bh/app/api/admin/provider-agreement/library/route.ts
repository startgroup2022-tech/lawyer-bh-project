import { agreementLibrary } from "@/lib/provider-agreement/repository";
import { endpoint, json, readJson } from "@/lib/provider-agreement/http";
import { AgreementError } from "@/lib/provider-agreement/model";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(
    request,
    async () => json({ ok: true, templates: await agreementLibrary.list() }),
    true,
  );
}
export async function POST(request: Request) {
  return endpoint(
    request,
    async (actor) => {
      const body = await readJson(request, 10000);
      const metadata = { name: body.name, description: body.description };
      const template =
        body.action === "create"
          ? await agreementLibrary.create(metadata, actor)
          : body.action === "copy"
            ? await agreementLibrary.copy(
                { ...metadata, versionId: body.versionId as string },
                actor,
              )
            : body.action === "update"
              ? await agreementLibrary.update(
                  {
                    ...metadata,
                    id: body.id as string,
                    revision: body.revision as number,
                    archived: body.archived as boolean,
                  },
                  actor,
                )
              : (() => {
                  throw new AgreementError("invalid_action");
                })();
      return json({ ok: true, template });
    },
    true,
  );
}
