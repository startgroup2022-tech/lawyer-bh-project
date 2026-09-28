import { startDirectUpload } from "@/lib/uploads/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 12000)
      return Response.json({ error: "invalid_upload" }, { status: 413 });
    return Response.json(await startDirectUpload(request, JSON.parse(text)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json(
      { error: "upload_failed" },
      {
        status:
          message === "Forbidden"
            ? 403
            : message === "rate_limited"
              ? 429
              : 400,
      },
    );
  }
}
