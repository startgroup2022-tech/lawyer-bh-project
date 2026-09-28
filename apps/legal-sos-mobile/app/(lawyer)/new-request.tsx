import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Btn, Card } from "../../components/design/Primitives";
import { colors } from "../../constants/theme";

export default function LawyerNewRequest() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {/* Urgent banner */}
        <View
          style={{
            backgroundColor: "rgba(211, 47, 47, 0.25)",
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(211, 47, 47, 0.3)",
          }}
        >
          <Animated.View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.sos,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              shadowColor: colors.sos,
              shadowOpacity: 0.5,
              shadowRadius: 6,
              elevation: 4,
            }}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 0.5,
              color: "#ff8a8a",
              textTransform: "uppercase",
            }}
          >
            New dispatch · arrest
          </Text>
          <Text
            style={{
              marginLeft: "auto",
              fontSize: 14,
              fontWeight: "600",
              color: "#ff8a8a",
              fontVariant: ["tabular-nums"],
            }}
          >
            0:38
          </Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Client
          </Text>
          <Text style={{ color: colors.white, fontSize: 28, fontWeight: "500", letterSpacing: -0.7 }}>
            Hessa A.
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              marginTop: 6,
              fontVariant: ["tabular-nums"],
            }}
          >
            LS-2026-08842 · EN · CPR ••• 4271
          </Text>

          {/* Info grid */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 22 }}>
            <View style={{ flex: 1 }}>
              <Card style={{ padding: 14 }}>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 10.5,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Distance
                </Text>
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 24,
                    fontWeight: "500",
                    marginTop: 4,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  2.3 km
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 2 }}>
                  Manama · Block 318
                </Text>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card style={{ padding: 14 }}>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 10.5,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  ETA
                </Text>
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 24,
                    fontWeight: "500",
                    marginTop: 4,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  ~ 4 min
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 2 }}>
                  Light traffic
                </Text>
              </Card>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Card goldGlow style={{ padding: 14 }}>
              <Text
                style={{
                  color: colors.textSubtle,
                  fontSize: 10.5,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Your fee
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <Text
                  style={{
                    color: colors.gold2,
                    fontSize: 30,
                    fontWeight: "500",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  BHD 120.000
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  · BHD 150 client · 20% platform
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ marginTop: 10 }}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Ic.doc color={colors.gold2} size={20} />
                <Text style={{ color: colors.white, fontSize: 12, fontWeight: "500" }}>Case brief</Text>
              </View>
              <Text style={{ color: colors.textDim, fontSize: 13, lineHeight: 20 }}>
                Arrest in progress · Manama Block 318. Client requests advocate presence at
                investigation.{" "}
                <Text style={{ color: colors.gold2 }}>Bilingual EN preferred.</Text>
              </Text>
            </Card>
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
            <Btn
              label="Decline"
              variant="secondary"
              height={60}
              fontSize={14}
              style={{ flex: 1, borderColor: "rgba(211, 47, 47, 0.3)" }}
              onPress={() => router.back()}
            />
            <Btn
              label="Accept & mobilise"
              height={60}
              fontSize={16}
              style={{ flex: 1.6 }}
              onPress={() => router.push("/(lawyer)/on-the-way")}
              iconRight={
                <Text style={{ marginLeft: 6, color: "#1a0f00", fontSize: 12, opacity: 0.7, fontVariant: ["tabular-nums"] }}>
                  0:38
                </Text>
              }
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
