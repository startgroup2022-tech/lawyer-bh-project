import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../components/Screen";
import { colors } from "../constants/theme";
import { COUNTRIES, type Country } from "../constants/countries";
import {
  getSelectedCountry,
  setSelectedCountry,
} from "../lib/secureStore";

export default function CountrySelectScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // On first mount, see if a country was already picked. If yes,
  // skip straight to the role selector. User can always come back
  // here from the role screen's country chip.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const existing = await getSelectedCountry();
      if (existing && mounted) {
        router.replace("/role");
        return;
      }
      if (mounted) setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function pickCountry(c: Country) {
    if (!c.available) {
      // Still let the user "explore" the demo for now — coming-soon
      // markets route to the same role screen but their content
      // will gradually be country-aware in later phases.
    }
    await setSelectedCountry(c.code);
    router.replace("/role");
  }

  if (checking) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={{ alignItems: "center", marginTop: 36, marginBottom: 8 }}>
          <LinearGradient
            colors={[colors.gold, "#A07F3F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 78,
              height: 78,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="shield" size={38} color="#1A1F2E" />
          </LinearGradient>
          <Text style={{ color: colors.white, fontSize: 26, fontWeight: "800" }}>
            LEGAL SOS
          </Text>
          <Text
            style={{
              color: colors.gold,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
              marginTop: 4,
            }}
          >
            24/7 LEGAL EMERGENCY
          </Text>
        </View>

        <Text
          style={{
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 18,
            marginBottom: 6,
            fontSize: 13,
          }}
        >
          Where do you need legal help?
        </Text>
        <Text
          style={{
            color: colors.textSubtle,
            textAlign: "center",
            marginBottom: 22,
            fontSize: 11,
          }}
        >
          Select your country to continue
        </Text>

        {/* Country grid */}
        {COUNTRIES.map((c) => (
          <CountryRow key={c.code} country={c} onPress={() => pickCountry(c)} />
        ))}

        <Text
          style={{
            color: colors.textSubtle,
            textAlign: "center",
            marginTop: 22,
            fontSize: 10,
            lineHeight: 16,
          }}
        >
          More markets coming soon. We expand based on demand —{"\n"}
          tap a coming-soon country to register interest.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function CountryRow({
  country,
  onPress,
}: {
  country: Country;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1,
        borderColor: country.available ? colors.gold + "55" : colors.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        <Text style={{ fontSize: 26 }}>{country.flag}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.white,
            fontWeight: "800",
            fontSize: 15,
          }}
        >
          {country.name}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {country.nameAr} · {country.dialCode}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: country.available
            ? colors.success + "22"
            : colors.textSubtle + "22",
        }}
      >
        <Text
          style={{
            color: country.available ? colors.success : colors.textSubtle,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.5,
          }}
        >
          {country.available ? "AVAILABLE" : "SOON"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gold} />
    </Pressable>
  );
}
