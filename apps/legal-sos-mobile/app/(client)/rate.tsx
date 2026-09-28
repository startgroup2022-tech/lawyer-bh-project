import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Btn, IconBtn, TopNav } from "../../components/design/Primitives";
import { getDraft, resetDraft } from "../../lib/sosDraft";
import { addTrip } from "../../lib/tripsHistory";
import { getCaseType } from "../../constants/caseTypes";
import { colors } from "../../constants/theme";

const TAGS = ["Calm", "Professional", "On time", "Clear English", "Listened well", "Knowledgeable"];

export default function Rate() {
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [picked, setPicked] = useState<string[]>(["Calm", "Professional", "On time"]);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const draft = getDraft();
    const caseType = draft.caseSlug ? getCaseType(draft.caseSlug) : null;
    if (caseType) {
      try {
        await addTrip({
          caseSlug: caseType.slug,
          fulfillment: caseType.fulfillment,
          caseLabel: caseType.label.en,
          baseFeeBhd: caseType.baseFeeBhd,
          lawyerName: "Sara Al-Hashimi",
          language: draft.language,
          locationAddress: draft.location?.address,
          status: "completed",
          ratingStars: stars,
          ratingComment: picked.join(", ") || undefined,
        });
      } catch {}
    }
    resetDraft();
    Alert.alert("Thanks!", "Your review has been recorded.", [
      { text: "OK", onPress: () => router.replace("/(client)/home") },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          right={
            <IconBtn onPress={() => router.replace("/(client)/home")}>
              <Ic.close />
            </IconBtn>
          }
        />

        {/* confetti sparkles */}
        <Svg
          style={{ position: "absolute", top: 50, left: 0, right: 0 }}
          width="100%"
          height={120}
          viewBox="0 0 340 120"
          pointerEvents="none"
        >
          {[
            [40, 30, "#e8c281"],
            [80, 60, "#22c55e"],
            [130, 20, "#e8c281"],
            [180, 50, "#60a5fa"],
            [220, 25, "#e8c281"],
            [260, 60, "#a78bfa"],
            [300, 40, "#e8c281"],
            [60, 90, "#22c55e"],
            [200, 95, "#e8c281"],
            [280, 85, "#60a5fa"],
          ].map(([x, y, c], i) => (
            <Rect
              key={i}
              x={x as number}
              y={y as number}
              width={3}
              height={6}
              rx={0.6}
              fill={c as string}
              transform={`rotate(${i * 36} ${x} ${y})`}
            />
          ))}
        </Svg>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 }}
          style={{ flex: 1 }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(34, 197, 94, 0.16)",
                borderWidth: 1,
                borderColor: "rgba(34, 197, 94, 0.4)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ic.check size={28} color={colors.success} />
            </View>
            <Text style={{ color: colors.white, fontSize: 28, fontWeight: "500", letterSpacing: -0.7 }}>
              Case closed.
            </Text>
            <Text
              style={{
                color: colors.gold2,
                fontSize: 28,
                fontWeight: "400",
                fontStyle: "italic",
                letterSpacing: -0.7,
              }}
            >
              Thank you.
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                marginTop: 10,
                paddingHorizontal: 12,
                textAlign: "center",
              }}
            >
              How did Sara handle your case?
            </Text>
          </View>

          {/* Stars */}
          <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 22 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Text
                  style={{
                    fontSize: 42,
                    color: n <= stars ? colors.gold2 : "rgba(143, 160, 189, 0.25)",
                    textShadowColor: n <= stars ? "rgba(212, 168, 90, 0.4)" : "transparent",
                    textShadowRadius: 8,
                  }}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            style={{
              textAlign: "center",
              color: colors.textSubtle,
              fontSize: 11,
              marginTop: 6,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {stars} of 5 · Excellent
          </Text>

          {/* Chips */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 22,
              paddingHorizontal: 16,
            }}
          >
            {TAGS.map((t) => {
              const on = picked.includes(t);
              return (
                <Pressable
                  key={t}
                  onPress={() =>
                    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
                  }
                  style={({ pressed }) => ({
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: on ? colors.goldTint16 : colors.whiteAlpha04,
                    borderWidth: 1,
                    borderColor: on ? colors.goldBorder40 : colors.whiteAlpha08,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: on ? colors.gold2 : colors.textMuted,
                      fontSize: 12.5,
                      fontWeight: "500",
                    }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 40 }} />

          <Btn label="Submit rating" onPress={submit} disabled={submitting} />
          <Pressable
            onPress={() => router.replace("/(client)/home")}
            style={{ marginTop: 12, padding: 6, alignItems: "center" }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
