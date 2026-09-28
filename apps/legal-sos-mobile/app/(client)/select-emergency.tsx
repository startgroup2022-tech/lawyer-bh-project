import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { IconBtn, TopNav } from "../../components/design/Primitives";
import { CASE_TYPES, type CaseType, formatFee } from "../../constants/caseTypes";
import { updateDraft } from "../../lib/sosDraft";
import { colors } from "../../constants/theme";

const ICONS_BY_SLUG: Record<string, (color?: string) => React.ReactNode> = {
  emergency_consultation: (c) => <Ic.phone color={c} size={22} />,
  emergency_arrest: (c) => <Ic.arrest color={c} size={20} />,
  emergency_search: (c) => <Ic.search color={c} size={20} />,
  emergency_travel_ban: (c) => <Ic.ban color={c} size={20} />,
  emergency_evidence: (c) => <Ic.evidence color={c} size={20} />,
  emergency_report: (c) => <Ic.doc color={c} size={20} />,
  emergency_consultation: (c) => <Ic.doc color={c} size={20} />,

};

export default function SelectEmergency() {
  const router = useRouter();

  function pick(c: CaseType) {
    updateDraft({ caseSlug: c.slug });
    if (c.fulfillment === "remote") router.push("/(client)/consultation-language");
    else router.push("/(client)/location");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          title="Select case"
          left={
            <IconBtn onPress={() => router.back()}>
              <Ic.back />
            </IconBtn>
          }
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}>
          <Text
            style={{
              color: colors.white,
              fontSize: 22,
              fontWeight: "500",
              letterSpacing: -0.4,
              lineHeight: 26,
            }}
          >
            What's{" "}
            <Text style={{ color: colors.gold2, fontStyle: "italic" }}>happening</Text>?
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>
            Tap a case to start. Prices are fixed and shown in Bahraini Dinar.
          </Text>

          {CASE_TYPES.map((c) => (
            <CaseCard key={c.slug} c={c} onPress={() => pick(c)} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function CaseCard({ c, onPress }: { c: CaseType; onPress: () => void }) {
  const isFeat = c.fulfillment === "remote";
  const iconRender = ICONS_BY_SLUG[c.slug] ?? (() => <Ic.doc size={20} />);

  const Inner = (
    <>
      {isFeat && (
        <View
          style={{
            position: "absolute",
            top: -7,
            right: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            zIndex: 2,
          }}
        >
          <LinearGradient
            colors={["#e8c281", "#d4a85a"]}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              shadowColor: colors.gold,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text style={{ color: "#1a0f00", fontSize: 9, fontWeight: "700", letterSpacing: 0.8 }}>
              ★ POPULAR
            </Text>
          </LinearGradient>
        </View>
      )}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: isFeat ? "rgba(212, 168, 90, 0.18)" : colors.whiteAlpha04,
          borderWidth: 1,
          borderColor: isFeat ? colors.goldBorder40 : colors.whiteAlpha08,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {iconRender(isFeat ? colors.gold2 : colors.textMuted)}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ color: colors.white, fontSize: 14.5, fontWeight: "500", letterSpacing: -0.1, lineHeight: 18 }}
        >
          {c.label.en}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{c.helper.en}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>BHD</Text>
        <Text
          style={{
            color: isFeat ? colors.gold2 : colors.white,
            fontWeight: "500",
            fontSize: 15,
            fontVariant: ["tabular-nums"],
          }}
        >
          {c.baseFeeBhd}
        </Text>
      </View>
    </>
  );

  if (isFeat) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: 10 })}>
        <LinearGradient
          colors={["rgba(212, 168, 90, 0.18)", "rgba(212, 168, 90, 0.02)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.goldBorder40,
            backgroundColor: colors.card,
            position: "relative",
            shadowColor: colors.gold,
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
          }}
        >
          {Inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: 10 })}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        {Inner}
      </View>
    </Pressable>
  );
}
