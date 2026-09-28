import { useState } from "react";
import { View, Text, Switch, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import LawyerAvatar from "../../components/LawyerAvatar";
import { comingSoon } from "../../components/comingSoon";
import { colors } from "../../constants/theme";

export default function LawyerHome() {
  const router = useRouter();
  const [available, setAvailable] = useState(true);
  return (
    <Screen>
      <View style={{ height: 12 }} />
      {/* Profile card */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <LawyerAvatar name="Ahmed AlDoseri" size={54} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>Welcome back</Text>
          <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16, marginTop: 2 }}>Ahmed Al Doseri</Text>
        </View>
      </View>

      {/* Availability */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 18,
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>YOU ARE</Text>
          <Text style={{ color: available ? colors.success : colors.sos, fontSize: 22, fontWeight: "900", marginTop: 4 }}>
            {available ? "Available" : "Offline"}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ true: colors.success + "55", false: colors.sos + "55" }}
          thumbColor={available ? colors.success : colors.sos}
        />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Stat label="Total Requests" value="48" />
        <Stat label="Completed" value="42" />
        <Stat label="Rating" value="4.9" />
      </View>

      {/* Menu */}
      <View style={{ marginTop: 18, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, overflow: "hidden" }}>
        <MenuItem icon="notifications-outline" label="New Requests" onPress={() => router.push("/(lawyer)/new-request")} accent />
        <MenuItem icon="map-outline" label="My Trips" onPress={() => comingSoon("My Trips")} />
        <MenuItem icon="wallet-outline" label="Earnings" onPress={() => router.push("/(lawyer)/earnings")} />
        <MenuItem icon="person-outline" label="Profile" onPress={() => comingSoon("Lawyer profile")} />
        <MenuItem icon="settings-outline" label="Settings" onPress={() => comingSoon("Settings")} last />
      </View>

      <Pressable
        onPress={() => {
          setAvailable(false);
          router.replace("/");
        }}
        style={({ pressed }) => ({
          marginTop: 16,
          padding: 14,
          alignItems: "center",
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.sos,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: colors.sos, fontWeight: "800" }}>Go Offline</Text>
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, alignItems: "center" }}>
      <Text style={{ color: colors.gold, fontWeight: "900", fontSize: 20 }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  accent,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderBottomWidth: last ? 0 : 1,
        borderColor: colors.divider,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={accent ? colors.gold : colors.textMuted} />
      <Text style={{ color: accent ? colors.gold : colors.white, fontWeight: "700", flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
    </Pressable>
  );
}
