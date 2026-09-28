// Pulsing audio-level ring — used on the consultation call screen.
// Three rings expanding outward, gold gradient core with initials.

import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../constants/theme";

function Pulse({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: colors.goldBorder30,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.15] }) },
        ],
      }}
    />
  );
}

/**
 * Pulsing audio-level ring.
 *
 * @param init    Avatar initials shown inside the gold core
 * @param volume  Optional 0-255 audio level (from Agora). When supplied,
 *                the core scales subtly with loudness so the ring
 *                "breathes" with the speaker's voice. Omit for the
 *                idle/ambient animation.
 */
export function AudioRing({
  init,
  volume,
}: {
  init: string;
  volume?: number;
}) {
  // Map Agora's 0-255 volume into a 1.0–1.08 scale for a subtle pulse.
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const target = 1 + Math.min(0.08, ((volume ?? 0) / 255) * 0.12);
    Animated.spring(scale, {
      toValue: target,
      useNativeDriver: true,
      friction: 5,
      tension: 80,
    }).start();
  }, [volume, scale]);

  return (
    <View
      style={{
        width: 140,
        height: 140,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Pulse delay={0} />
      <Pulse delay={600} />
      <Pulse delay={1200} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={["#e8c281", "#9c7a3d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.gold,
            shadowOpacity: 0.4,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 0 },
            elevation: 18,
          }}
        >
          <Text style={{ color: "#1a0f00", fontWeight: "600", fontSize: 32 }}>
            {init}
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
