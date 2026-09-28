import { Pressable, Text, View, ActivityIndicator } from "react-native";
import { colors } from "../constants/theme";

type Variant = "gold" | "outline" | "danger" | "success";

export default function Button({
  label,
  onPress,
  variant = "gold",
  loading,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg =
    variant === "gold" ? colors.gold :
    variant === "danger" ? colors.sos :
    variant === "success" ? colors.success :
    "transparent";
  const border = variant === "outline" ? colors.gold : "transparent";
  const textColor = variant === "outline" ? colors.gold :
    variant === "gold" ? "#1A1F2E" : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderWidth: variant === "outline" ? 1.5 : 0,
        borderColor: border,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed || disabled ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {loading && <ActivityIndicator color={textColor} size="small" />}
        <Text style={{ color: textColor, fontWeight: "800", fontSize: 15, letterSpacing: 0.2 }}>{label}</Text>
      </View>
    </Pressable>
  );
}
