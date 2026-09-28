type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

const fallbackIceServers: IceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
  },
];

function validIceServers(value: unknown): IceServer[] | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as { iceServers?: unknown }).iceServers;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const servers: IceServer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const source = entry as Record<string, unknown>;
    const urls = Array.isArray(source.urls)
      ? source.urls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : typeof source.urls === "string" && source.urls.length > 0
        ? [source.urls]
        : [];
    if (urls.length === 0) return null;
    servers.push({
      urls,
      ...(typeof source.username === "string" ? { username: source.username } : {}),
      ...(typeof source.credential === "string" ? { credential: source.credential } : {}),
    });
  }
  return servers;
}

export async function communicationIceServers(): Promise<IceServer[]> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN?.trim();
  if (!keyId || !apiToken) return fallbackIceServers;

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 3600 }),
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`cloudflare_turn_${response.status}`);
    const servers = validIceServers(await response.json());
    if (!servers) throw new Error("cloudflare_turn_invalid_response");
    return servers;
  } catch (error) {
    console.error("cloudflare_turn_credentials_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return fallbackIceServers;
  }
}
