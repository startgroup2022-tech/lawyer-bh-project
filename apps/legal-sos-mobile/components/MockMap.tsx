import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

/** Stylised map placeholder used by Location / Tracking / Arrived screens.
 *  Real map integration (react-native-maps) is intentionally out of v1
 *  scope so the demo runs in Expo Go without native module config. */
export default function MockMap({
  height = 280,
  pin = true,
  path = false,
  carIcon = false,
}: {
  height?: number;
  pin?: boolean;
  path?: boolean;
  carIcon?: boolean;
}) {
  return (
    <View
      style={{
        height,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.mapBg,
      }}
    >
      <LinearGradient
        colors={["#0E1B33", "#142849", "#0E1B33"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* faux grid */}
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: ((i + 1) * height) / 9,
              height: 1,
              backgroundColor: colors.mapRoad,
              opacity: 0.4,
            }}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${((i + 1) * 100) / 7}%`,
              width: 1,
              backgroundColor: colors.mapRoad,
              opacity: 0.4,
            }}
          />
        ))}

        {path && (
          <>
            <View
              style={{
                position: "absolute",
                left: "20%",
                top: "70%",
                width: "60%",
                height: 3,
                backgroundColor: colors.gold,
                transform: [{ rotate: "-20deg" }],
                borderRadius: 3,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: "30%",
                top: "55%",
                width: "45%",
                height: 3,
                backgroundColor: colors.gold,
                transform: [{ rotate: "-30deg" }],
                borderRadius: 3,
              }}
            />
          </>
        )}

        {carIcon && (
          <View
            style={{
              position: "absolute",
              left: "32%",
              top: "55%",
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.gold,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.gold,
              shadowOpacity: 0.6,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="car" size={18} color="#1a1f2e" />
          </View>
        )}

        {pin && (
          <View style={{ position: "absolute", left: "50%", top: "40%", marginLeft: -16 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.sos,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.sos,
                shadowOpacity: 0.8,
                shadowRadius: 10,
              }}
            >
              <Ionicons name="location" size={18} color="#fff" />
            </View>
          </View>
        )}

        <Text style={{ position: "absolute", bottom: 8, right: 10, color: colors.textSubtle, fontSize: 10 }}>
          Map preview
        </Text>
      </LinearGradient>
    </View>
  );
}
