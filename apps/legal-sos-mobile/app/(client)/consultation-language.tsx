import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import { colors } from "../../constants/theme";
import { updateDraft, type ConsultationLanguage } from "../../lib/sosDraft";

export default function ConsultationLanguageScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<ConsultationLanguage | null>(null);

  function confirm() {
    if (!lang) return;
    updateDraft({ language: lang });
    router.push("/(client)/consultation-consent");
  }

  return (
    <Screen>
      <ScreenHeader title="Consultation Language" subtitle="لغة الاستشارة" />

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
          15 MIN · BHD 25
        </Text>
        <Text style={{ color: colors.white, fontWeight: "800", marginTop: 6, fontSize: 15 }}>
          Choose your language and start the call immediately.
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, textAlign: "right" }}>
          اختر اللغة، وابدأ الاتصال فورًا.
        </Text>
      </View>

      <LanguageCard
        flag="🇬🇧"
        label="English"
        subtitle="Talk to the lawyer in English"
        selected={lang === "en"}
        onPress={() => setLang("en")}
      />
      <View style={{ height: 12 }} />
      <LanguageCard
        flag="🇧🇭"
        label="العربية"
        subtitle="تحدّث مع المحامي بالعربية"
        selected={lang === "ar"}
        onPress={() => setLang("ar")}
        rtl
      />

      <View style={{ height: 24 }} />
      <Button label="Continue" onPress={confirm} />

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 10,
          textAlign: "center",
          marginTop: 16,
          lineHeight: 14,
        }}
      >
        We route you to a language-capable lawyer subject to availability.
      </Text>
    </Screen>
  );
}

function LanguageCard({
  flag,
  label,
  subtitle,
  selected,
  onPress,
  rtl = false,
}: {
  flag: string;
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  rtl?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.gold : colors.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgElevated,
        }}
      >
        <Text style={{ fontSize: 28 }}>{flag}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.white,
            fontWeight: "800",
            fontSize: 18,
            textAlign: rtl ? "right" : "left",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            marginTop: 2,
            textAlign: rtl ? "right" : "left",
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={26}
        color={selected ? colors.gold : colors.textSubtle}
      />
    </Pressable>
  );
}
