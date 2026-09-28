import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../components/Screen";
import { colors } from "../constants/theme";
import { COUNTRIES, getCountry } from "../constants/countries";
import {
  clearSelectedCountry,
  getSelectedCountry,
  type CountryCode,
} from "../lib/secureStore";

export default function RoleSelectScreen() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const c = await getSelectedCountry();
      if (mounted) setCountryCode(c);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const country = getCountry(countryCode) ?? COUNTRIES[0];
  const subtitle =
    `${country.name.toUpperCase()} 24/7 LEGAL EMERGENCY`;

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 32, marginBottom: 16 }}>
        <LinearGradient
          colors={[colors.gold, "#A07F3F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 84, height: 84, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 14 }}
        >
          <Ionicons name="shield" size={42} color="#1A1F2E" />
        </LinearGradient>
        <Text style={{ color: colors.white, fontSize: 28, fontWeight: "800" }}>LEGAL SOS</Text>
        <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "700", letterSpacing: 2, marginTop: 4 }}>
          {subtitle}
        </Text>
      </View>

      <Pressable
        hitSlop={6}
        onPress={async () => {
          await clearSelectedCountry();
          router.replace("/");
        }}
        style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, marginBottom: 6 }}
      >
        <Text style={{ fontSize: 18 }}>{country.flag}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}>{country.name}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textSubtle} />
      </Pressable>

      <Text style={{ color: colors.textMuted, textAlign: "center", marginVertical: 12, paddingHorizontal: 12 }}>
        Because the first hour defines your future.
      </Text>

      <RoleCard
        icon="warning"
        title="I'm a Client"
        subtitle="I need urgent legal help right now"
        accent={colors.sos}
        onPress={() => router.push("/(client)/home")}
      />
      <View style={{ height: 14 }} />
      <RoleCard
        icon="briefcase"
        title="I'm a Lawyer"
        subtitle="View incoming requests & earnings"
        accent={colors.gold}
        onPress={() => router.push("/(lawyer)/login")}
      />
    </Screen>
  );
}

function RoleCard({
  icon,
  title,
  subtitle,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: accent + "22" }}>
        <Ionicons name={icon} size={26} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.gold} />
    </Pressable>
  );
}
