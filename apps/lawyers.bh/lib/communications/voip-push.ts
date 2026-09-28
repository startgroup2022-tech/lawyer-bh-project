import { sendApnsVoip, type ApnsVoipConfig, type VoipPushEvent } from "./apns-voip";
import { communicationCallPushStore } from "./call-push-store";

function config(): ApnsVoipConfig | null {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const privateKey = process.env.APNS_PRIVATE_KEY?.trim();
  const bundleId = process.env.IOS_BUNDLE_ID?.trim() || "com.lawyers.legalsos";
  if (!keyId || !teamId || !privateKey) return null;
  return {
    keyId,
    teamId,
    privateKey,
    topic: `${bundleId}.voip`,
    production: process.env.APNS_ENVIRONMENT !== "sandbox",
  };
}

export async function sendPeerVoipPush(input: {
  requestId: string;
  actorRole: "client" | "lawyer";
  actorId: string;
  callId: string;
  mediaKind: "audio" | "video";
  callerName: string;
}) {
  const apnsConfig = config();
  if (!apnsConfig) return { sent: 0, failed: 0, configured: false };
  const tokens = await communicationCallPushStore.tokensForActor({
    requestId: input.requestId,
    actorRole: input.actorRole,
    actorId: input.actorId,
    tokenType: "voip",
  });
  const event: VoipPushEvent = {
    eventType: "incoming_call",
    requestId: input.requestId,
    callId: input.callId,
    mediaKind: input.mediaKind,
    callerName: input.callerName,
  };
  const results = await Promise.allSettled(
    [...new Set(tokens)].map((token) => sendApnsVoip({ token, event, config: apnsConfig })),
  );
  const sent = results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  return { sent, failed: results.length - sent, configured: true };
}
