import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import LawyerAvatar from "../../components/LawyerAvatar";
import { colors } from "../../constants/theme";

export default function Accepted() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Your Request Has Been Accepted" subtitle="Lawyer is on the way" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 22,
          alignItems: "center",
        }}
      >
        <View style={{ position: "absolute", top: -22, alignSelf: "center", backgroundColor: colors.success, padding: 10, borderRadius: 22 }}>
          <Ionicons name="checkmark" size={22} color="#fff" />
        </View>
        <View style={{ height: 16 }} />
        <LawyerAvatar name="Ahmed AlDoseri" size={88} />
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: "800", marginTop: 14 }}>Ahmed Al Doseri</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Text style={{ color: colors.gold, fontWeight: "700", fontSize: 13 }}>4.9</Text>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons key={s} name="star" size={12} color={colors.gold} />
          ))}
        </View>
        <View style={{ marginTop: 22 }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textAlign: "center" }}>ETA</Text>
          <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 28, marginTop: 4 }}>5 min</Text>
        </View>
        <Text style={{ color: colors.textMuted, marginTop: 18, textAlign: "center" }}>
          We will notify you when the lawyer arrives.
        </Text>
      </View>
      <View style={{ height: 14 }} />
      <Pressable
        onPress={() => router.push("/(client)/tracking")}
        style={({ pressed }) => ({
          backgroundColor: colors.gold,
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#1A1F2E", fontWeight: "800" }}>Track on map</Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/(client)/home")}
        style={({ pressed }) => ({
          marginTop: 12,
          borderRadius: 14,
          padding: 14,
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: colors.sos,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: colors.sos, fontWeight: "800" }}>Cancel Request</Text>
      </Pressable>
    </Screen>
  );
}
