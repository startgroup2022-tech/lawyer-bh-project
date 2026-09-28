import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

/** Title row + optional back button. The phone's native status bar is used
 *  for time / wifi / battery — no faux row. When called with no title, nothing
 *  is rendered (callers can omit the component in that case). */
export default function ScreenHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  if (!title) return null;
  return (
    <View style={{ marginBottom: 18, marginTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          {back && (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color={colors.gold} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {right}
      </View>
    </View>
  );
}
