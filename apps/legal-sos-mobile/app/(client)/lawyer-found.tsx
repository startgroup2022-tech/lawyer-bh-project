import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import LawyerAvatar from "../../components/LawyerAvatar";
import { comingSoon } from "../../components/comingSoon";
import { colors } from "../../constants/theme";

export default function LawyerFound() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Lawyer Found!" subtitle="Nearest available lawyer" />
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
        <LawyerAvatar name="Ahmed AlDoseri" size={92} />
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: "800", marginTop: 14 }}>Ahmed Al Doseri</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Criminal Lawyer</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
          <Text style={{ color: colors.gold, fontWeight: "700", fontSize: 15 }}>4.9</Text>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons key={s} name="star" size={14} color={colors.gold} />
          ))}
        </View>

        <View style={{ flexDirection: "row", marginTop: 22, width: "100%", justifyContent: "space-around" }}>
          <Stat label="ETA" value="5 min" />
          <Divider />
          <Stat label="Distance" value="1.2 km" />
          <Divider />
          <Stat label="Fees" value="BHD 50.000" />
        </View>
      </View>
      <View style={{ height: 18 }} />
      <Pressable
        onPress={() => comingSoon("Lawyer profile")}
        style={({ pressed }) => ({
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
          marginBottom: 12,
        })}
      >
        <Ionicons name="person-circle-outline" size={20} color={colors.gold} />
        <Text style={{ color: colors.gold, fontWeight: "700" }}>View Profile</Text>
      </Pressable>
      <Button label="Request Lawyer" onPress={() => router.push("/(client)/accepted")} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }}>{label}</Text>
      <Text style={{ color: colors.white, fontWeight: "800", fontSize: 14, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
function Divider() {
  return <View style={{ width: 1, backgroundColor: colors.divider }} />;
}
