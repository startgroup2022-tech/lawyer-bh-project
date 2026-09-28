import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import { colors } from "../../constants/theme";
import { updateDraft, getDraft } from "../../lib/sosDraft";

export default function ConsultationConsentScreen() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const draft = getDraft();
  const language = draft.language ?? "en";

  function confirm() {
    if (!agreed) return;
    updateDraft({
      bookingConsented: true,
      agreedAtClient: new Date().toISOString(),
    });
    router.push("/(client)/searching");
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 8 }}>
          <ScreenHeader title="Booking Consent" subtitle="موافقة الحجز" />
        </View>

        {/* Service summary */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.gold + "55",
            padding: 14,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.gold + "22",
              }}
            >
              <Ionicons name="call" size={18} color={colors.gold} />
            </View>
            <Text style={{ color: colors.white, fontWeight: "800", fontSize: 14, flex: 1 }}>
              Emergency Consultation
            </Text>
            <Text style={{ color: colors.gold, fontWeight: "800", fontSize: 14 }}>BHD 25</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
            15-minute legal call · {language === "ar" ? "العربية" : "English"}
          </Text>
        </View>

        {/* English consent */}
        <View style={consentCardStyle}>
          <Text style={consentLabelStyle}>EN — Booking Acknowledgement</Text>
          <Text style={consentTextStyle}>
            By accepting this service, the client acknowledges that the consultation is
            preliminary and time-limited, based only on the information shared during the
            call, and that any further action may require a separate booking, field service,
            or written legal opinion.
          </Text>
        </View>

        {/* Arabic consent */}
        <View style={consentCardStyle}>
          <Text style={[consentLabelStyle, { textAlign: "right" }]}>
            AR — إقرار الحجز
          </Text>
          <Text
            style={[
              consentTextStyle,
              { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            بالموافقة على هذه الخدمة، يقرّ العميل أن الاستشارة أولية وسريعة، وأنها تعتمد على
            المعلومات المقدمة وقت المكالمة فقط، وأن أي إجراء لاحق قد يتطلب حجزًا منفصلًا أو
            خدمة ميدانية أو رأيًا قانونيًا مكتوبًا.
          </Text>
        </View>

        {/* Service rules summary */}
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <RuleRow icon="time-outline" text="Lawyer connects within 3 minutes (target)" />
          <RuleRow icon="refresh-outline" text="Auto-refund if no lawyer connects within 5 minutes" />
          <RuleRow icon="lock-closed-outline" text="No call recording without explicit consent from both parties" />
          <RuleRow
            icon="arrow-up-circle-outline"
            text="Upgrade to a field service mid-call if the case requires presence"
            last
          />
        </View>

        {/* Agree checkbox */}
        <Pressable
          onPress={() => setAgreed((a) => !a)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: agreed ? 2 : 1,
            borderColor: agreed ? colors.gold : colors.cardBorder,
            opacity: pressed ? 0.85 : 1,
            marginBottom: 16,
          })}
        >
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={24}
            color={agreed ? colors.gold : colors.textSubtle}
          />
          <Text style={{ color: colors.white, flex: 1, fontWeight: "600", fontSize: 13, lineHeight: 18 }}>
            I have read and agree to the booking terms above.
            {"\n"}
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              قرأت ووافقت على شروط الحجز أعلاه.
            </Text>
          </Text>
        </Pressable>

        <Button
          label="Continue · BHD 25"
          onPress={confirm}
          disabled={!agreed}
        />
        {!agreed && (
          <Text
            style={{
              color: colors.textSubtle,
              textAlign: "center",
              marginTop: 10,
              fontSize: 11,
            }}
          >
            Tick the box above to enable Continue
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function RuleRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Ionicons name={icon} size={16} color={colors.gold} />
      <Text style={{ color: colors.white, fontSize: 12, flex: 1, lineHeight: 17 }}>{text}</Text>
    </View>
  );
}

const consentCardStyle = {
  backgroundColor: colors.card,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  padding: 14,
  marginBottom: 12,
} as const;

const consentLabelStyle = {
  color: colors.gold,
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 1.4,
  marginBottom: 8,
} as const;

const consentTextStyle = {
  color: colors.white,
  fontSize: 13,
  lineHeight: 20,
} as const;
