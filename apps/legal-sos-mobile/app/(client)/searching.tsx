import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import { colors } from "../../constants/theme";
import { getDraft } from "../../lib/sosDraft";
import { getCaseType } from "../../constants/caseTypes";

/** Operational SLA per stakeholder: target connect within 3 minutes,
 *  auto-cancel + refund if no lawyer connects within 5 minutes.
 *  For the demo we collapse the timeline so the UX is visible. */
const DEMO_MATCH_SECONDS = 4;
const SLA_TARGET_SECONDS = 180; // 3 min
const SLA_DEADLINE_SECONDS = 300; // 5 min

export default function Searching() {
  const router = useRouter();
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const [caseTitle, setCaseTitle] = useState<string>("");
  const [isRemote, setIsRemote] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const draft = getDraft();
    const c = draft.caseSlug ? getCaseType(draft.caseSlug) : null;
    if (c) {
      setCaseTitle(c.label.en);
      setIsRemote(c.fulfillment === "remote");
    }
  }, []);

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    pulse(ring1, 0).start();
    pulse(ring2, 900).start();
  }, []);

  // SLA-aware advance. Remote → consultation-call. Field → lawyer-found.
  useEffect(() => {
    let cancelled = false;
    const elapsedTimer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    const t = setTimeout(() => {
      if (cancelled) return;
      if (isRemote) {
        router.replace("/(client)/consultation-call");
      } else {
        router.push("/(client)/lawyer-found");
      }
    }, DEMO_MATCH_SECONDS * 1000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearInterval(elapsedTimer);
    };
  }, [isRemote, router]);

  const headerTitle = isRemote
    ? "Connecting You to a Lawyer…"
    : "Searching for Available Lawyers…";
  const headerSubtitle = isRemote
    ? caseTitle
      ? `${caseTitle} · 15 min consultation`
      : "Please wait a moment"
    : caseTitle
      ? caseTitle
      : "Please wait a moment";
  const centerIcon: keyof typeof Ionicons.glyphMap = isRemote ? "call" : "scale";
  const footer = isRemote
    ? "Matching you with an on-call lawyer. We'll connect you the moment one accepts."
    : "Finding the nearest available lawyer for you…";

  return (
    <Screen scroll={false}>
      <ScreenHeader title={headerTitle} subtitle={headerSubtitle} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {[ring1, ring2].map((anim, i) => (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: 110,
              borderWidth: 1,
              borderColor: colors.gold,
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) },
              ],
            }}
          />
        ))}
        <LinearGradient
          colors={[colors.gold, "#A07F3F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 130,
            height: 130,
            borderRadius: 65,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={centerIcon} size={60} color="#1A1F2E" />
        </LinearGradient>

        {/* SLA badge — consultation only */}
        {isRemote && (
          <View
            style={{
              marginTop: 28,
              backgroundColor: colors.bgElevated,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              paddingHorizontal: 14,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="time-outline" size={12} color={colors.gold} />
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700" }}>
              Target 3 min · Auto-refund at 5 min
            </Text>
          </View>
        )}

        <Text
          style={{
            color: colors.textMuted,
            marginTop: isRemote ? 16 : 36,
            textAlign: "center",
            paddingHorizontal: 24,
            lineHeight: 19,
          }}
        >
          {footer}
        </Text>
      </View>
    </Screen>
  );
}
