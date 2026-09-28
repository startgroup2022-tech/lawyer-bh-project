import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import { colors } from "../../constants/theme";

export default function Completed() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Service Completed" subtitle="Request has been completed" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 28,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: colors.success,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.success,
            shadowOpacity: 0.6,
            shadowRadius: 14,
          }}
        >
          <Ionicons name="checkmark" size={50} color="#fff" />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 28 }}>EARNINGS</Text>
        <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 30, marginTop: 6 }}>BHD 50.000</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>Thank you for your service.</Text>
      </View>
      <View style={{ height: 18 }} />
      <Button label="Finish" onPress={() => router.replace("/(lawyer)/earnings")} />
    </Screen>
  );
}
