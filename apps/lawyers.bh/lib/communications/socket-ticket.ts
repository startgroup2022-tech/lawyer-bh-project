import { createHmac, timingSafeEqual } from "node:crypto";

type SocketActorRole = "client" | "lawyer";
type TicketPayload = { requestId: string; actorRole: SocketActorRole; actorId: string; exp: number };

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSocketTicketCodec(input: { secret: string; now: () => Date; ttlSeconds?: number }) {
  if (input.secret.length < 32) throw new Error("socket ticket secret must contain at least 32 characters");
  const ttlSeconds = input.ttlSeconds ?? 60;
  const sign = (payload: string) => createHmac("sha256", input.secret).update(`communication-socket:v1:${payload}`).digest("base64url");

  return {
    issue(actor: { requestId: string; actorRole: SocketActorRole; actorId: string }) {
      const payload: TicketPayload = { ...actor, exp: Math.floor(input.now().getTime() / 1000) + ttlSeconds };
      const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
      return `${encoded}.${sign(encoded)}`;
    },
    verify(ticket: string) {
      const [encoded, signature] = ticket.split(".");
      if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null;
      try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<TicketPayload>;
        if (!payload.requestId || !payload.actorId || (payload.actorRole !== "client" && payload.actorRole !== "lawyer") || !payload.exp || payload.exp < Math.floor(input.now().getTime() / 1000)) return null;
        return { requestId: payload.requestId, actorRole: payload.actorRole, actorId: payload.actorId, expiresAt: new Date(payload.exp * 1000) };
      } catch {
        return null;
      }
    },
  };
}
