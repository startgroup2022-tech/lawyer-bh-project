import { createSign } from "node:crypto";
import { connect } from "node:http2";

export interface VoipPushEvent {
  eventType: "incoming_call";
  requestId: string;
  callId: string;
  mediaKind: "audio" | "video";
  callerName: string;
}

export function buildVoipPushRequest(input: {
  token: string;
  topic: string;
  event: VoipPushEvent;
}) {
  const isVideo = input.event.mediaKind === "video";
  return {
    path: `/3/device/${input.token}`,
    headers: {
      "apns-topic": input.topic,
      "apns-push-type": "voip",
      "apns-priority": "10",
      "apns-expiration": "0",
    },
    payload: {
      aps: { "content-available": 1 },
      ...input.event,
      id: input.event.callId,
      nameCaller: input.event.callerName,
      handle: isVideo ? "Video call" : "Audio call",
      isVideo,
    },
  };
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

let cachedJwt: { value: string; expiresAt: number } | null = null;

function providerJwt(config: { keyId: string; teamId: string; privateKey: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) return cachedJwt.value;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64url(JSON.stringify({ iss: config.teamId, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = createSign("SHA256").update(unsigned).end().sign({
    key: config.privateKey.replace(/\\n/g, "\n"),
    dsaEncoding: "ieee-p1363",
  });
  const value = `${unsigned}.${base64url(signature)}`;
  cachedJwt = { value, expiresAt: now + 50 * 60 };
  return value;
}

export interface ApnsVoipConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  topic: string;
  production: boolean;
}

export async function sendApnsVoip(input: {
  token: string;
  event: VoipPushEvent;
  config: ApnsVoipConfig;
}) {
  const built = buildVoipPushRequest({
    token: input.token,
    topic: input.config.topic,
    event: input.event,
  });
  const origin = input.config.production
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  return new Promise<{ ok: boolean; status: number; reason?: string }>((resolve, reject) => {
    const client = connect(origin);
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("apns_timeout"));
    }, 8_000);
    client.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    const request = client.request({
      ":method": "POST",
      ":path": built.path,
      authorization: `bearer ${providerJwt(input.config)}`,
      ...built.headers,
    });
    let status = 0;
    let responseBody = "";
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.on("data", (chunk) => {
      responseBody += chunk;
    });
    request.on("end", () => {
      clearTimeout(timeout);
      client.close();
      let reason: string | undefined;
      try {
        reason = (JSON.parse(responseBody) as { reason?: string }).reason;
      } catch {
        reason = undefined;
      }
      resolve({ ok: status === 200, status, reason });
    });
    request.on("error", (error) => {
      clearTimeout(timeout);
      client.destroy();
      reject(error);
    });
    request.end(JSON.stringify(built.payload));
  });
}
