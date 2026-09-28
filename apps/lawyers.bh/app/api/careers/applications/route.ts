import { careers } from "@/lib/careers/repository";
import { json, publicEndpoint, readJson } from "@/lib/careers/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return publicEndpoint(request, async () => {
    const body = await readJson(request);
    const clientIp = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const upload = await careers.startApplication(String(body.jobId ?? ""), body, Number(body.cvSize), String(body.cvName ?? ""), clientIp);
    return json({ ok: true, ...upload }, 201);
  });
}
