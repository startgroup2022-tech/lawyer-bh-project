const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeQueueCursor(at: string, id: string): string {
  return Buffer.from(JSON.stringify({ at, id })).toString("base64url");
}

export function decodeQueueCursor(value: string): { at: string; id: string } | null {
  if (!value || value.length > 256) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const { at, id } = parsed as Record<string, unknown>;
    if (typeof at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at) ||
        Number.isNaN(Date.parse(at)) || typeof id !== "string" || !uuid.test(id)) return null;
    return { at, id };
  } catch { return null; }
}
