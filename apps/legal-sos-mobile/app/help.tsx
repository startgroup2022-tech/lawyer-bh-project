import { View, Text, Pressable, Linking, Alert } from "react-native";
import Screen from "../components/Screen";
import ScreenHeader from "../components/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import { CONTACT } from "../constants/contact";

export default function HelpScreen() {
  function callHotline() {
    Linking.openURL(`tel:${CONTACT.hotline.replace(/\s/g, "")}`);
  }

  function emailComplaints() {
    const url = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Legal SOS — Support")}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Email", `Send to: ${CONTACT.email}`),
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Contact & Complaints" subtitle="التواصل والشكاوى" />

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: "700", fontSize: 14, lineHeight: 20 }}>
          For emergencies and complaints, call us or email us. Our team is available 24/7.
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: 8,
            lineHeight: 20,
            textAlign: "right",
          }}
        >
          للطوارئ والشكاوى، اتصل بنا أو راسلنا عبر البريد الإلكتروني، وفريقنا متاح على مدار الساعة.
        </Text>
      </View>

      {/* Call */}
      <ContactRow
        icon="call"
        accent={colors.success}
        title="Hotline"
        subtitle={CONTACT.hotlineDisplay}
        cta="Call now"
        rightBadge="24/7"
        onPress={callHotline}
      />

      <View style={{ height: 12 }} />

      {/* Email */}
      <ContactRow
        icon="mail"
        accent={colors.gold}
        title="Complaints Email"
        subtitle={CONTACT.email}
        cta="Open mail"
        onPress={emailComplaints}
      />

      <Text
        style={{
          color: colors.textSubtle,
          textAlign: "center",
          fontSize: 10,
          marginTop: 22,
          lineHeight: 14,
        }}
      >
        Legal SOS is operated under Bahraini privacy & data protection rules.{"\n"}
        All consultations are confidential unless both parties agree to recording.
      </Text>
    </Screen>
  );
}

function ContactRow({
  icon,
  accent,
  title,
  subtitle,
  cta,
  onPress,
  rightBadge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
  rightBadge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
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
          backgroundColor: accent + "22",
        }}
      >
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>
          {title.toUpperCase()}
        </Text>
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 15, marginTop: 2 }}>
          {subtitle}
        </Text>
        <Text style={{ color: accent, fontWeight: "700", fontSize: 12, marginTop: 4 }}>
          {cta} →
        </Text>
      </View>
      {rightBadge && (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: colors.success + "22",
          }}
        >
          <Text style={{ color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 }}>
            {rightBadge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
