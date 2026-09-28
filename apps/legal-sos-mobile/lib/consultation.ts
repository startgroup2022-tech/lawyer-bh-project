// Consultation call helper — Agora RTC voice/video.
//
// Architecture:
//   1. getConsultationToken(caseId)   → asks the admin backend for a
//                                       fresh per-user RTC token
//   2. createAndJoinConsultation(...) → initializes RtcEngine, hooks up
//                                       event listeners, joins the channel
//   3. leaveConsultation()            → leave + destroy engine
//
// Native module note: `react-native-agora` ships native iOS/Android
// code, so this file CANNOT run inside the Expo Go preview app. The
// project has been prebuilt (ios/ + android/ exist), and the dev
// workflow is now:
//   npx expo run:ios       — simulator (no Apple Dev account needed)
//   npx expo run:ios --device --configuration Release  — physical iPhone
//
// Permissions are declared in app.json's ios.infoPlist + android.permissions
// and surfaced at first call attempt by the OS.

import { Platform, PermissionsAndroid } from "react-native";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
  type IRtcEngineEventHandler,
  type RtcConnection,
  type UserOfflineReasonType,
  type RtcStats,
} from "react-native-agora";
import { apiFetch } from "./api";

// ── Backend → token ────────────────────────────────────────────────

interface TokenResponse {
  ok: true;
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: string;
}

export interface ConsultationCredentials {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: Date;
}

export async function getConsultationToken(
  caseId: string,
): Promise<ConsultationCredentials> {
  const res = await apiFetch<TokenResponse>(
    "/api/mobile/consultation/token",
    {
      method: "POST",
      json: { caseId },
    },
  );
  return {
    appId: res.appId,
    channelName: res.channelName,
    uid: res.uid,
    token: res.token,
    expiresAt: new Date(res.expiresAt),
  };
}

// ── Android runtime permissions ────────────────────────────────────

async function requestAndroidPermissions() {
  if (Platform.OS !== "android") return;
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.CAMERA,
  ]);
}

// ── RtcEngine lifecycle ────────────────────────────────────────────

let engine: IRtcEngine | null = null;

export interface ConsultationCallbacks {
  /** Local user successfully joined the channel. */
  onJoinSuccess?: (channel: string, uid: number, elapsed: number) => void;
  /** Remote participant joined (the lawyer for client, vice versa). */
  onRemoteJoined?: (uid: number) => void;
  /** Remote participant left / connection dropped. */
  onRemoteLeft?: (uid: number, reason: UserOfflineReasonType) => void;
  /** Network quality (1=excellent, 6=down) — surfaces "weak signal" UI. */
  onNetworkQuality?: (txQuality: number, rxQuality: number) => void;
  /** Call ended on our side. Triggered after we leave. */
  onCallEnded?: (stats: RtcStats) => void;
  /** Audio volume — feeds the breathing AudioRing animation. */
  onLocalAudioLevel?: (volume: number) => void;
  onRemoteAudioLevel?: (uid: number, volume: number) => void;
  /** Any non-fatal warning or fatal error. */
  onError?: (errorCode: number, message: string) => void;
}

export async function createAndJoinConsultation(
  creds: ConsultationCredentials,
  callbacks: ConsultationCallbacks = {},
): Promise<void> {
  if (engine) {
    // Already in a call — bail. Caller should `leaveConsultation` first.
    return;
  }

  await requestAndroidPermissions();

  engine = createAgoraRtcEngine();
  engine.initialize({
    appId: creds.appId,
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
  });

  // 1-on-1 audio consultation — both sides are broadcasters.
  engine.enableAudio();
  engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

  // Audio level indication — fires every 200 ms with volumes 0-255.
  engine.enableAudioVolumeIndication(200, 3, true);

  const handler: IRtcEngineEventHandler = {
    onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
      callbacks.onJoinSuccess?.(connection.channelId ?? "", connection.localUid ?? 0, elapsed);
    },
    onUserJoined: (_connection, remoteUid) => {
      callbacks.onRemoteJoined?.(remoteUid);
    },
    onUserOffline: (_connection, remoteUid, reason) => {
      callbacks.onRemoteLeft?.(remoteUid, reason);
    },
    onNetworkQuality: (_connection, _remoteUid, txQuality, rxQuality) => {
      callbacks.onNetworkQuality?.(txQuality, rxQuality);
    },
    onAudioVolumeIndication: (_connection, speakers, totalVolume, _voiceDetected) => {
      // speakers[0].uid === 0 means local user.
      for (const s of speakers ?? []) {
        if (s.uid === 0) {
          callbacks.onLocalAudioLevel?.(s.volume ?? 0);
        } else {
          callbacks.onRemoteAudioLevel?.(s.uid ?? 0, s.volume ?? 0);
        }
      }
      // Use totalVolume as a fallback if no speaker data.
      if (!speakers || speakers.length === 0) {
        callbacks.onLocalAudioLevel?.(totalVolume ?? 0);
      }
    },
    onLeaveChannel: (_connection, stats) => {
      callbacks.onCallEnded?.(stats);
    },
    onError: (err, msg) => {
      callbacks.onError?.(err, msg ?? "");
    },
  };

  engine.registerEventHandler(handler);

  // Join — Agora will reject if the token doesn't match the channel/uid.
  engine.joinChannel(creds.token, creds.channelName, creds.uid, {
    publishMicrophoneTrack: true,
    autoSubscribeAudio: true,
    // No video for the audio-only consultation. Flip to true when the
    // UI adds a "show video" toggle.
    publishCameraTrack: false,
    autoSubscribeVideo: false,
  });
}

export function muteLocalAudio(muted: boolean): void {
  engine?.muteLocalAudioStream(muted);
}

export function setSpeakerphoneEnabled(enabled: boolean): void {
  engine?.setEnableSpeakerphone(enabled);
}

export async function leaveConsultation(): Promise<void> {
  if (!engine) return;
  try {
    engine.leaveChannel();
  } finally {
    engine.release();
    engine = null;
  }
}

export function isInConsultation(): boolean {
  return engine !== null;
}
