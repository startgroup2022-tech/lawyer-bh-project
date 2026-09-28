import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import LiveMap from "../../components/LiveMap";
import { colors } from "../../constants/theme";
import { updateDraft, type SosLocation } from "../../lib/sosDraft";

type Mode = "loading" | "ok" | "denied" | "error" | "manual";

export default function LocationScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [loc, setLoc] = useState<SosLocation | null>(null);
  const [manualAddress, setManualAddress] = useState("");

  async function detectLocation() {
    setMode("loading");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMode("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const detected: SosLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
      };

      // Best-effort reverse geocode. Some markets / network states
      // return empty — fall back to coords-only.
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: detected.lat,
          longitude: detected.lng,
        });
        const p = places[0];
        if (p) {
          const street = [p.streetNumber, p.street].filter(Boolean).join(" ");
          const city = [p.city ?? p.subregion, p.region, p.country]
            .filter(Boolean)
            .join(", ");
          detected.address = [street, city].filter(Boolean).join(" · ");
        }
      } catch {
        // ignore reverse-geocode failure
      }

      setLoc(detected);
      setMode("ok");
    } catch (e) {
      setMode("error");
    }
  }

  useEffect(() => {
    detectLocation();
  }, []);

  function confirm() {
    if (mode === "manual") {
      const trimmed = manualAddress.trim();
      if (!trimmed) {
        Alert.alert("Address required", "Please type your address before continuing.");
        return;
      }
      updateDraft({
        location: { lat: 0, lng: 0, address: trimmed, manual: true },
      });
    } else if (loc) {
      updateDraft({ location: loc });
    } else {
      Alert.alert("Location missing", "Detect or enter your address first.");
      return;
    }
    router.push("/(client)/kyc");
  }

  return (
    <Screen>
      <ScreenHeader title="Your Location" subtitle="Where do you need the lawyer?" />

      <LiveMap
        height={300}
        pin
        userLocation={loc ? { lat: loc.lat, lng: loc.lng } : undefined}
      />

      {mode === "loading" && (
        <View style={cardStyle}>
          <ActivityIndicator color={colors.gold} />
          <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
            Detecting your location…
          </Text>
        </View>
      )}

      {mode === "ok" && loc && (
        <View style={cardStyle}>
          <Text style={labelStyle}>DETECTED ADDRESS</Text>
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: "700", marginTop: 6 }}>
            {loc.address ?? "Coordinates only"}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 11 }}>
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
            {loc.accuracy ? ` · ±${Math.round(loc.accuracy)}m` : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
            <Pressable hitSlop={6} onPress={detectLocation}>
              <Text style={linkStyle}>Re-detect</Text>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => setMode("manual")}>
              <Text style={linkStyle}>Enter Manually</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "denied" && (
        <View style={cardStyle}>
          <Text style={labelStyle}>LOCATION PERMISSION DENIED</Text>
          <Text style={{ color: colors.white, fontSize: 14, marginTop: 6, lineHeight: 19 }}>
            Enable location in your phone Settings, or type your address manually.
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
            <Pressable hitSlop={6} onPress={detectLocation}>
              <Text style={linkStyle}>Try Again</Text>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => setMode("manual")}>
              <Text style={linkStyle}>Enter Manually</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "error" && (
        <View style={cardStyle}>
          <Text style={labelStyle}>COULDN'T GET YOUR LOCATION</Text>
          <Text style={{ color: colors.white, fontSize: 14, marginTop: 6 }}>
            Check that location services are on, or type your address manually.
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
            <Pressable hitSlop={6} onPress={detectLocation}>
              <Text style={linkStyle}>Try Again</Text>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => setMode("manual")}>
              <Text style={linkStyle}>Enter Manually</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "manual" && (
        <View style={cardStyle}>
          <Text style={labelStyle}>ENTER ADDRESS</Text>
          <TextInput
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Building, road, block, area, city"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={{
              color: colors.white,
              backgroundColor: colors.bgElevated,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 12,
              marginTop: 8,
              fontSize: 14,
              minHeight: 64,
            }}
          />
          <Pressable hitSlop={6} onPress={detectLocation} style={{ marginTop: 12 }}>
            <Text style={linkStyle}>Try GPS Again</Text>
          </Pressable>
        </View>
      )}

      <View style={{ height: 18 }} />
      <Button label="Confirm Location" onPress={confirm} />
    </Screen>
  );
}

const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  padding: 14,
  marginTop: 16,
} as const;

const labelStyle = {
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1,
} as const;

const linkStyle = {
  color: colors.gold,
  fontWeight: "700",
  fontSize: 13,
} as const;
