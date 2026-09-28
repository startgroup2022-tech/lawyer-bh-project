// Agora server-side token generation.
//
// Agora requires per-user, per-channel, time-limited tokens for secure
// production use. The App Certificate is the HMAC secret — it never
// leaves the server. Mobile/web clients receive a signed token and
// hand it to the Agora SDK to join the channel.
//
// Channel naming convention:
//   case-consult-<UUID>     — the 15-min lawyer/client consultation room
//
// Lifecycle:
//   • Client opens consultation-call screen
//   • Mobile POSTs /api/mobile/consultation/token { caseId }
//   • Server checks the JWT subject is authorized for the case
//   • Server issues a 20-min token (15-min call + 5-min buffer)
//   • Both client + lawyer use the same channel name with different UIDs
//   • Token expires server-side; Agora kicks them out when the call ends

import { RtcTokenBuilder, RtcRole } from "agora-token";

function env() {
  return {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
  };
}

export function isAgoraConfigured(): boolean {
  const { appId, appCertificate } = env();
  return Boolean(appId && appCertificate);
}

export function agoraAppId(): string | undefined {
  return env().appId;
}

// ── Channel name builder ────────────────────────────────────────────

export function consultationChannelName(caseId: string): string {
  return `case-consult-${caseId}`;
}

// ── Token issuance ─────────────────────────────────────────────────

export interface GenerateTokenArgs {
  channelName: string;
  /** Unique numeric uid per participant. 0 means "any uid for this user". */
  uid: number;
  /** Token lifetime in minutes — must outlast the call. */
  expirationMinutes?: number;
  /** PUBLISHER = can speak/show video; SUBSCRIBER = listen-only. */
  role?: "publisher" | "subscriber";
}

export interface AgoraTokenResult {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: Date;
}

export function generateRtcToken(args: GenerateTokenArgs): AgoraTokenResult {
  const { appId, appCertificate } = env();
  if (!appId || !appCertificate) {
    throw new Error(
      "Agora not configured. Set AGORA_APP_ID + AGORA_APP_CERTIFICATE.",
    );
  }

  const role =
    args.role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const expirationMinutes = args.expirationMinutes ?? 20;
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = currentTime + expirationMinutes * 60;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    args.channelName,
    args.uid,
    role,
    expirationTime,
    expirationTime,
  );

  return {
    appId,
    channelName: args.channelName,
    uid: args.uid,
    token,
    expiresAt: new Date(expirationTime * 1000),
  };
}

/**
 * Convenience: deterministic 32-bit uid from a string (e.g. user.id).
 * Agora UIDs are 32-bit unsigned integers; we hash + mask to fit.
 * Same input → same uid (so a reconnect uses the same identity).
 */
export function uidFromString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  // Avoid 0 (which Agora treats as "auto-assign").
  return h === 0 ? 1 : h;
}
