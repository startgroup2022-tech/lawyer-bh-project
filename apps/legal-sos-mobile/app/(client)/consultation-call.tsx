import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { IconBtn, Pill, TopNav } from "../../components/design/Primitives";
import { AudioRing } from "../../components/design/AudioRing";
import { CONTACT } from "../../constants/contact";
import { colors } from "../../constants/theme";
import {
  getConsultationToken,
  createAndJoinConsultation,
  leaveConsultation,
  muteLocalAudio,
  setSpeakerphoneEnabled,
} from "../../lib/consultation";
import { getActiveCaseRef } from "../../lib/secureStore";

const CALL_DURATION_SECONDS = 15 * 60;

type CallState =
  | { kind: "connecting" }
  | { kind: "waiting" } // we're in the room, waiting for the lawyer
  | { kind: "connected" }
  | { kind: "ended" }
  | { kind: "error"; message: string };

export default function ConsultationCall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ caseId?: string }>();

  const [seconds, setSeconds] = useState(CALL_DURATION_SECONDS);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [state, setState] = useState<CallState>({ kind: "connecting" });
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [networkBars, setNetworkBars] = useState(0); // 0..5
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);

  // Resolve case id from route param (preferred) or fall back to the
  // last case ref stored in SecureStore.
  const [caseId, setCaseId] = useState<string | null>(
    typeof params.caseId === "string" ? params.caseId : null,
  );

  // If no route param, hydrate from SecureStore. Async, runs once.
  useEffect(() => {
    if (caseId) return;
    let mounted = true;
    (async () => {
      const ref = await getActiveCaseRef();
      if (mounted && ref) setCaseId(ref);
    })();
    return () => {
      mounted = false;
    };
  }, [caseId]);

  // ── Join the Agora channel on mount ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!caseId) {
        // Wait for caseId hydration (see effect above). Don't error yet
        // — give it a moment.
        return;
      }
      try {
        const creds = await getConsultationToken(caseId);
        if (cancelled) return;
        await createAndJoinConsultation(creds, {
          onJoinSuccess: () => {
            joinedRef.current = true;
            setState({ kind: "waiting" });
          },
          onRemoteJoined: () => setState({ kind: "connected" }),
          onRemoteLeft: () => {
            // Counterparty dropped — show waiting until they rejoin or
            // the timer expires.
            setState({ kind: "waiting" });
          },
          onRemoteAudioLevel: (_uid, volume) => setRemoteAudioLevel(volume),
          onNetworkQuality: (tx, rx) => {
            // Agora quality: 0=unknown, 1=excellent ... 6=down. Lower = better.
            const worst = Math.max(tx, rx);
            // Map worst (1..6) to bars (5..0)
            setNetworkBars(Math.max(0, 6 - worst));
          },
          onError: (code, msg) => {
            console.warn("[Agora]", code, msg);
            if (!joinedRef.current) {
              setState({
                kind: "error",
                message: msg || `Agora error ${code}`,
              });
            }
          },
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not connect to consultation.",
        });
      }
    })();
    return () => {
      cancelled = true;
      // Always leave on unmount so the engine is freed.
      leaveConsultation().catch(() => {});
    };
  }, [caseId]);

  // ── 15-min countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (state.kind === "error" || state.kind === "ended") return;
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          endCall(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [state.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const fmt = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  const endCall = useCallback(
    async (autoExpired = false) => {
      await leaveConsultation();
      setState({ kind: "ended" });
      router.replace("/(client)/rate");
      if (autoExpired) {
        // Could surface a "time's up" toast on the rate screen.
      }
    },
    [router],
  );

  function confirmEnd() {
    Alert.alert(
      "End consultation?",
      "Your 15-minute consultation will be closed and a refund (if any) calculated per the booking terms.",
      [
        { text: "Stay in call", style: "cancel" },
        {
          text: "End call",
          style: "destructive",
          onPress: () => endCall(false),
        },
      ],
    );
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    muteLocalAudio(next);
  }

  function toggleSpeaker() {
    const next = !speaker;
    setSpeaker(next);
    setSpeakerphoneEnabled(next);
  }

  // ── Status helpers ───────────────────────────────────────────────

  const statusLabel =
    state.kind === "connecting"
      ? "Connecting…"
      : state.kind === "waiting"
        ? "Waiting for advocate…"
        : state.kind === "connected"
          ? "Live"
          : state.kind === "ended"
            ? "Call ended"
            : "Error";

  const statusColor =
    state.kind === "connected"
      ? colors.success
      : state.kind === "error"
        ? colors.sos
        : colors.gold2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          left={
            <IconBtn onPress={confirmEnd}>
              <Ic.close />
            </IconBtn>
          }
          title={
            <Text
              style={{
                color: colors.gold2,
                fontSize: 14,
                fontVariant: ["tabular-nums"],
                fontWeight: "500",
              }}
            >
              {fmt}
            </Text>
          }
          right={
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: colors.whiteAlpha04,
                borderWidth: 1,
                borderColor: colors.whiteAlpha08,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: statusColor,
                }}
              />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  fontWeight: "500",
                  letterSpacing: 0.2,
                }}
              >
                {statusLabel.toUpperCase()}
              </Text>
            </View>
          }
        />

        <View
          style={{
            flex: 1,
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 30,
          }}
        >
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 22 }}>
            <Pill tone="red">● NOT RECORDED</Pill>
            <Pill>E2E ENCRYPTED</Pill>
            {networkBars > 0 && networkBars < 3 && (
              <Pill tone="red">WEAK SIGNAL</Pill>
            )}
          </View>

          <View style={{ marginTop: 8 }}>
            {/* AudioRing pulses with the remote (lawyer) volume so the
                client visually "sees" who's speaking. */}
            <AudioRing init="SA" volume={remoteAudioLevel} />
          </View>

          <View style={{ alignItems: "center", marginTop: 22 }}>
            <Text
              style={{
                color: colors.white,
                fontSize: 20,
                fontWeight: "500",
                letterSpacing: -0.2,
              }}
            >
              Advocate on call
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {state.kind === "error"
                ? state.message
                : state.kind === "connecting"
                  ? "Securing the line…"
                  : state.kind === "waiting"
                    ? "You're in the room. The advocate will join shortly."
                    : "Connected. Your time starts now."}
            </Text>
          </View>

          <View
            style={{
              marginTop: 22,
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <StatColumn label="Time remaining" value={fmt} />
            <Divider />
            <StatColumn label="Language" value="EN · AR" />
            <Divider />
            <StatColumn label="Charged" value="BHD 25" gold />
          </View>

          <View style={{ flex: 1 }} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-evenly",
              width: "100%",
              marginTop: 18,
              marginBottom: 10,
            }}
          >
            <CallCtrl
              icon={
                muted ? (
                  <Ic.micOff size={22} color={colors.sosLight} />
                ) : (
                  <Ic.mic size={22} />
                )
              }
              label={muted ? "Unmute" : "Mute"}
              onPress={toggleMute}
            />
            <Pressable
              onPress={confirmEnd}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <LinearGradient
                colors={["#ef4444", "#d32f2f"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: colors.sos,
                  shadowOpacity: 0.6,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 16 },
                  elevation: 12,
                }}
              >
                <Ic.endCall color="#fff" size={26} />
              </LinearGradient>
            </Pressable>
            <CallCtrl
              icon={
                speaker ? (
                  <Ic.phone size={22} color={colors.gold2} />
                ) : (
                  <Ic.phone size={22} />
                )
              }
              label={speaker ? "Speaker" : "Earpiece"}
              onPress={toggleSpeaker}
            />
          </View>

          {state.kind === "error" && (
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${CONTACT.hotline.replace(/\s/g, "")}`)
              }
              style={{ marginTop: 6 }}
            >
              <Text
                style={{
                  color: colors.gold2,
                  fontSize: 12.5,
                  textAlign: "center",
                }}
              >
                Call hotline {CONTACT.hotline}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatColumn({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 10.5,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: gold ? colors.gold2 : colors.white,
          fontSize: 14,
          fontWeight: "500",
          marginTop: 4,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{ width: 1, height: 30, backgroundColor: colors.cardBorder }}
    />
  );
}

function CallCtrl({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.whiteAlpha06,
          borderWidth: 1,
          borderColor: colors.whiteAlpha10,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {icon}
      </Pressable>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
