import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { IconBtn, Pill, Btn, TopNav, Avatar } from "../../components/design/Primitives";
import { colors } from "../../constants/theme";

export default function Tracking() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          left={
            <IconBtn onPress={() => router.back()}>
              <Ic.back />
            </IconBtn>
          }
          title="Lawyer en route"
          right={
            <IconBtn>
              <Ic.share />
            </IconBtn>
          }
        />

        <View style={{ flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#0a1428" }}>
          {/* Map grid background */}
          <Svg
            style={{ position: "absolute", inset: 0, opacity: 0.5 }}
            width="100%"
            height="100%"
            viewBox="0 0 340 480"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 17 }).map((_, i) => (
              <Path
                key={`v-${i}`}
                d={`M${i * 28} 0 L${i * 28} 480`}
                stroke="rgba(34, 50, 90, 0.18)"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <Path
                key={`h-${i}`}
                d={`M0 ${i * 28} L340 ${i * 28}`}
                stroke="rgba(34, 50, 90, 0.18)"
                strokeWidth={1}
              />
            ))}
          </Svg>

          <Svg
            style={{ position: "absolute", inset: 0 }}
            width="100%"
            height="100%"
            viewBox="0 0 340 480"
            preserveAspectRatio="none"
          >
            {/* roads */}
            <Path d="M-20 200 L380 80" stroke="rgba(143,160,189,0.18)" strokeWidth={22} fill="none" />
            <Path d="M60 -20 L120 360" stroke="rgba(143,160,189,0.15)" strokeWidth={14} fill="none" />
            <Path d="M260 -20 L290 360" stroke="rgba(143,160,189,0.12)" strokeWidth={12} fill="none" />
            {/* route */}
            <Path
              d="M240 80 Q200 130 170 160 Q140 190 110 230"
              stroke="#e8c281"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="3 6"
            />
          </Svg>

          {/* Lawyer pin */}
          <Pin x={240} y={92} label="SA" tone="gold" />
          {/* Client pin */}
          <Pin x={110} y={240} label="★" tone="red" />

          {/* ETA badge */}
          <View
            style={{
              position: "absolute",
              top: 16,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(15, 25, 45, 0.92)",
                borderWidth: 1,
                borderColor: colors.goldBorder40,
                shadowColor: "#000",
                shadowOpacity: 0.4,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
                elevation: 8,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: colors.success,
                  shadowColor: colors.success,
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              />
              <Text
                style={{ color: colors.textSubtle, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}
              >
                ETA
              </Text>
              <Text
                style={{
                  color: colors.gold2,
                  fontSize: 17,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                }}
              >
                4 min
              </Text>
              <Text style={{ color: colors.textSubtle }}>·</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] }}>2.3 km</Text>
            </View>
          </View>
        </View>

        {/* bottom sheet */}
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
            padding: 20,
            paddingBottom: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            marginTop: -20,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: -12 },
            elevation: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: "rgba(143,160,189,0.3)",
              borderRadius: 999,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar init="SA" size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: "500" }}>Sara Al-Hashimi</Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11.5,
                  marginTop: 2,
                  fontVariant: ["tabular-nums"],
                }}
              >
                Bar BH-4318 · ★ 4.92 · LS-2026-08842
              </Text>
            </View>
            <Pill tone="gold">● MOBILIZING</Pill>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Btn
              label="Call"
              variant="secondary"
              height={48}
              fontSize={14}
              style={{ flex: 1 }}
              iconLeft={<Ic.phone size={20} color={colors.white} />}
              onPress={() => Linking.openURL("tel:+97333112233")}
            />
            <Btn
              label="Message"
              variant="secondary"
              height={48}
              fontSize={14}
              style={{ flex: 1 }}
              iconLeft={<Ic.chat size={20} color={colors.white} />}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Pin({ x, y, label, tone }: { x: number; y: number; label: string; tone: "gold" | "red" }) {
  const isRed = tone === "red";
  return (
    <View
      style={{
        position: "absolute",
        left: x - 14,
        top: y - 28,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: isRed ? colors.sos : colors.gold2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#fff",
        shadowColor: isRed ? colors.sos : colors.gold,
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
    >
      <Text style={{ color: isRed ? "#fff" : "#1a0f00", fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
