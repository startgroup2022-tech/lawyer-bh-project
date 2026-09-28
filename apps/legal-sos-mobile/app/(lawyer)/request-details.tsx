import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import LiveMap from "../../components/LiveMap";
import { colors } from "../../constants/theme";

export default function RequestDetails() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Request Details" />
      <Field icon="alert-circle-outline" label="Type" value="Arrest / Detention" />
      <Field icon="location-outline" label="Location" value="Building 123, Road 456" sub="Manama, Bahrain" />
      <View style={{ height: 12 }} />
      <LiveMap height={180} />
      <Field icon="walk-outline" label="Distance" value="1.2 km" inline />
      <Field icon="time-outline" label="ETA" value="5 min" inline />
      <Field icon="person-outline" label="Client Note" value="I need a lawyer urgently. I am at the police station." />
      <Field icon="cash-outline" label="Fees" value="BHD 50.000" gold />
      <View style={{ height: 18 }} />
      <Button label="Continue" onPress={() => router.push("/(lawyer)/accept-decline")} />
    </Screen>
  );
}

function Field({
  icon,
  label,
  value,
  sub,
  gold,
  inline,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
  gold?: boolean;
  inline?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 12,
        flexDirection: inline ? "row" : "column",
        alignItems: inline ? "center" : "flex-start",
        marginTop: 10,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={16} color={colors.gold} />
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
      </View>
      <Text style={{ color: gold ? colors.gold : colors.white, fontWeight: "700", marginTop: inline ? 0 : 2, flex: inline ? 1 : undefined, textAlign: inline ? "right" : "left" }}>
        {value}
      </Text>
      {sub && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{sub}</Text>}
    </View>
  );
}
