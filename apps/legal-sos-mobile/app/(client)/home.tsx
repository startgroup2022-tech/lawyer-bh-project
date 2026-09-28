import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { IconBtn, Pill, Card, Btn, TopNav } from "../../components/design/Primitives";
import { SOSButton } from "../../components/design/SOSButton";
import { TabBar } from "../../components/design/TabBar";
import Skyline from "../../components/Skyline";
import { colors } from "../../constants/theme";

export default function ClientHome() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          left={
            <IconBtn onPress={() => router.push("/(client)/profile")}>
              <Ic.user />
            </IconBtn>
          }
          right={
            <IconBtn>
              <Ic.bell />
            </IconBtn>
          }
        />

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 }}>
          {/* Recent case strip */}
          <Card
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Pill tone="green">● RESOLVED</Pill>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.white, fontSize: 12.5, fontWeight: "500" }}>
                Last consultation · 14 May
              </Text>
              <Text
                style={{
                  color: colors.textSubtle,
                  fontSize: 11,
                  marginTop: 2,
                  fontVariant: ["tabular-nums"],
                }}
              >
                LS-2026-08792 · 15 min
              </Text>
            </View>
            <Ic.chevron color={colors.textSubtle} />
          </Card>

          <View style={{ marginTop: 28, alignItems: "center" }}>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.7,
                lineHeight: 31,
              }}
            >
              Hold steady.
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.7,
                lineHeight: 31,
                marginTop: 2,
              }}
            >
              <Text style={{ color: colors.gold2, fontStyle: "italic" }}>Help</Text> is one tap away.
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 10,
                paddingHorizontal: 12,
                textAlign: "center",
              }}
            >
              Press &amp; hold the SOS button to dispatch a licensed advocate within 3 minutes.
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <SOSButton onPress={() => router.push("/(client)/select-emergency")} />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn
              label="15-min consult · BHD 25"
              variant="secondary"
              height={44}
              fontSize={13}
              style={{ flex: 1 }}
              onPress={() => router.push("/(client)/consultation-language")}
            />
            <Btn
              label="Browse cases"
              variant="secondary"
              height={44}
              fontSize={13}
              style={{ flex: 1 }}
              onPress={() => router.push("/(client)/select-emergency")}
            />
          </View>
        </View>

        <Skyline height={80} />

        <TabBar
          active="home"
          tabs={[
            { key: "home", label: "Home", icon: <Ic.home color={colors.gold2} size={20} /> },
            {
              key: "trips",
              label: "My trips",
              icon: <Ic.list color={colors.textSubtle} size={20} />,
              onPress: () => router.push("/(client)/trips"),
            },
            {
              key: "help",
              label: "Help",
              icon: <Ic.shield color={colors.textSubtle} size={20} />,
              onPress: () => router.push("/help"),
            },
            {
              key: "profile",
              label: "Profile",
              icon: <Ic.user color={colors.textSubtle} size={20} />,
              onPress: () => router.push("/(client)/profile"),
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}
