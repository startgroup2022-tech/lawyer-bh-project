import {
  agreements,
  agreementLibrary,
} from "@/lib/provider-agreement/repository";
import { endpoint, json, readJson } from "@/lib/provider-agreement/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(
    request,
    async () => {
      const id = new URL(request.url).searchParams.get("id");
      const templateId =
        new URL(request.url).searchParams.get("templateId") ?? undefined;
      if (!id) {
        const [versions, templates] = await Promise.all([
          agreements.list(templateId),
          agreementLibrary.list(),
        ]);
        return json({ ok: true, versions, templates });
      }
      return json(
        id
          ? { ok: true, version: await agreements.get(id) }
          : { ok: true, versions: await agreements.list(templateId) },
      );
    },
    true,
  );
}
export async function POST(request: Request) {
  return endpoint(
    request,
    async (actor) => {
      const body = await readJson(request, 2200000);
      const version = await agreements.save(
        {
          id: body.id as string | undefined,
          revision: body.revision as number | undefined,
          templateId: body.templateId as string | undefined,
          template: body.template,
        },
        actor,
      );
      return json({ ok: true, version });
    },
    true,
  );
}
