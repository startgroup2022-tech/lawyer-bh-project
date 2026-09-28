import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

/** Stylised lawyer avatar — golden ring + initials. (Avoids needing real
 *  photos to demo the mockups visually.) */
export default function LawyerAvatar({ name = "AD", size = 72 }: { name?: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: colors.gold,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {initials ? (
        <Text style={{ color: colors.gold, fontWeight: "800", fontSize: size * 0.32 }}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.gold} />
      )}
    </View>
  );
}
