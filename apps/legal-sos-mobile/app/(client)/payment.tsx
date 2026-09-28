import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import { colors } from "../../constants/theme";

const METHODS = [
  { id: "benefit", label: "BenefitPay", icon: "card", accent: "#1062A8" },
  { id: "card", label: "Credit / Debit Card", icon: "card-outline", accent: colors.gold },
  { id: "apple", label: "Apple Pay", icon: "logo-apple", accent: "#fff" },
  { id: "cash", label: "Cash", icon: "cash-outline", accent: colors.success },
] as const;

export default function Payment() {
  const router = useRouter();
  const [picked, setPicked] = useState<string>("benefit");
  return (
    <Screen>
      <ScreenHeader title="Payment" />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 18,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>TOTAL AMOUNT</Text>
        <Text style={{ color: colors.gold, fontSize: 32, fontWeight: "900", marginTop: 6 }}>BHD 50.000</Text>
      </View>

      <Text style={{ color: colors.white, fontWeight: "800", marginTop: 22, marginBottom: 10 }}>Select Payment Method</Text>
      <View style={{ gap: 10 }}>
        {METHODS.map((m) => {
          const active = picked === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setPicked(m.id)}
              style={({ pressed }) => ({
                backgroundColor: colors.card,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1.5,
                borderColor: active ? colors.gold : colors.cardBorder,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: m.accent + "22" }}>
                <Ionicons name={m.icon as any} size={20} color={m.accent} />
              </View>
              <Text style={{ color: colors.white, fontWeight: "700", flex: 1 }}>{m.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={22} color={colors.gold} />}
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 22 }} />
      <Button label="Pay BHD 50.000" onPress={() => router.push("/(client)/rate")} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
        <Ionicons name="lock-closed" size={12} color={colors.textSubtle} />
        <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Secure Payment</Text>
      </View>
    </Screen>
  );
}
