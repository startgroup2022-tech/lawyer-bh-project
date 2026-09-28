import { training } from "@/lib/training/repository";
import { endpoint, json } from "@/lib/training/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return endpoint(request, async () => json({ ok: true, ...await training.listApplications(Object.fromEntries(new URL(request.url).searchParams)) }), true);
}
