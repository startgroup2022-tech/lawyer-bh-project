// Big breathing SOS button — 3 expanding rings + radial-gradient core.
// Animated with React Native's Animated API (native driver).

import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../constants/theme";

function Ring({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 2500,
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
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 1,
        borderColor: "rgba(211, 47, 47, 0.25)",
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] }) },
        ],
      }}
    />
  );
}

function Breathing({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    ).start();
  }, [v]);
  return (
    <Animated.View
      style={{
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function SOSButton({ onPress }: { onPress?: () => void }) {
  return (
    <View
      style={{ width: 240, height: 240, alignItems: "center", justifyContent: "center" }}
    >
      <Ring delay={0} />
      <Ring delay={800} />
      <Ring delay={1600} />
      <Breathing>
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.sos,
            shadowOpacity: 0.6,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 24 },
            elevation: 18,
          }}
        >
          <LinearGradient
            colors={["#ef4444", "#d32f2f", "#8a1e1e"]}
            start={{ x: 0.35, y: 0.3 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 110,
                borderWidth: 2,
                borderColor: "rgba(211, 47, 47, 0.35)",
              }}
            />
            <View style={{ alignItems: "center" }}>
              <Text
                onPress={onPress}
                style={{
                  color: "#fff",
                  fontSize: 42,
                  fontWeight: "600",
                  letterSpacing: -0.8,
                  lineHeight: 44,
                }}
              >
                SOS
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 11,
                  letterSpacing: 1.4,
                  marginTop: 8,
                }}
              >
                HOLD TO DISPATCH
              </Text>
            </View>
          </LinearGradient>
        </View>
      </Breathing>
    </View>
  );
}
