import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import { comingSoon } from "../../components/comingSoon";
import { colors } from "../../constants/theme";

export default function Earnings() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Earnings" />
      <Row label="Today" value="BHD 150.000" />
      <Row label="This Week" value="BHD 850.000" />
      <Row label="This Month" value="BHD 3,200.000" />
      <View style={{ height: 8 }} />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 18,
          marginTop: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>TOTAL BALANCE</Text>
        <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 28, marginTop: 6 }}>BHD 5,450.000</Text>
        <Pressable
          onPress={() =>
            Alert.alert("Withdraw", "Request a payout of BHD 5,450.000 to your registered IBAN?", [
              { text: "Cancel", style: "cancel" },
              { text: "Confirm", onPress: () => Alert.alert("Submitted", "Your payout request has been queued.") },
            ])
          }
          style={({ pressed }) => ({
            marginTop: 16,
            backgroundColor: colors.gold,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 28,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#1A1F2E", fontWeight: "800" }}>Withdraw</Text>
        </Pressable>
      </View>

      {/* Bottom-ish tabs */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 28, paddingVertical: 16, borderTopWidth: 1, borderColor: colors.divider }}>
        <Tab icon="home" label="Home" onPress={() => router.replace("/(lawyer)/home")} />
        <Tab icon="time-outline" label="Trips" onPress={() => comingSoon("My Trips")} />
        <Tab icon="wallet-outline" label="Earnings" active onPress={() => {}} />
        <Tab icon="person-outline" label="Profile" onPress={() => comingSoon("Profile")} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
      }}
    >
      <Text style={{ color: colors.textMuted, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: colors.gold, fontWeight: "800", fontSize: 16 }}>{value}</Text>
    </View>
  );
}
function Tab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={20} color={active ? colors.gold : colors.textSubtle} />
      <Text style={{ color: active ? colors.gold : colors.textSubtle, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
