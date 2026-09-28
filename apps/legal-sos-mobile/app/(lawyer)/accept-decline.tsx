import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import { colors } from "../../constants/theme";

export default function AcceptDecline() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(30);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 30_000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Screen scroll={false}>
      <ScreenHeader title="Accept This Request?" subtitle={`You have ${seconds} seconds`} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: colors.divider, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 56 }}>
            00:{String(seconds).padStart(2, "0")}
          </Text>
        </View>

        <Animated.View
          style={{
            marginTop: 28,
            height: 6,
            width: "80%",
            borderRadius: 6,
            backgroundColor: colors.divider,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              height: "100%",
              backgroundColor: colors.gold,
              width: progress.interpolate({ inputRange: [0, 1], outputRange: ["100%", "0%"] }),
            }}
          />
        </Animated.View>

        <Text style={{ color: colors.textMuted, marginTop: 26, fontWeight: "700" }}>FEES</Text>
        <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 22, marginTop: 4 }}>BHD 50.000</Text>
      </View>

      <View style={{ paddingHorizontal: 4, paddingBottom: 8, gap: 10 }}>
        <Button label="Accept" variant="success" onPress={() => router.push("/(lawyer)/on-the-way")} />
        <Button label="Decline" variant="danger" onPress={() => router.replace("/(lawyer)/home")} />
      </View>
    </Screen>
  );
}
