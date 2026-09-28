import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import SignaturePadField from "../../components/SignaturePadField";
import { colors } from "../../constants/theme";
import { CASE_TYPES, formatFee } from "../../constants/caseTypes";
import { getDraft, updateDraft } from "../../lib/sosDraft";

export default function ConsentFieldScreen() {
  const router = useRouter();
  const draft = getDraft();
  const caseType = draft.caseSlug ? CASE_TYPES.find((c) => c.slug === draft.caseSlug) : null;

  const [agreed, setAgreed] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  function confirm() {
    if (!agreed || !signatureDataUrl) {
      Alert.alert(
        "Almost there",
        !agreed
          ? "Please confirm you have read the SOS Service Agreement."
          : "Please sign in the box above and tap Save.",
      );
      return;
    }
    updateDraft({
      bookingConsented: true,
      signatureDataUrl,
      agreedAtClient: new Date().toISOString(),
    });
    router.push("/(client)/searching");
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: 8 }}>
          <ScreenHeader title="Service Agreement" subtitle="اتفاقية خدمة الطوارئ القانونية" />
        </View>

        {/* Case summary */}
        {caseType && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: caseType.accent + "55",
              padding: 14,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: caseType.accent + "22",
              }}
            >
              <Ionicons name={caseType.icon} size={20} color={caseType.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.white, fontWeight: "800", fontSize: 14 }}>
                {caseType.label.en}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                Field service · Initial Response Fee {formatFee(caseType.baseFeeBhd)}
              </Text>
            </View>
          </View>
        )}

        {/* Agreement card EN */}
        <View style={consentCardStyle}>
          <Text style={consentLabelStyle}>EN — SOS SERVICE AGREEMENT (SUMMARY)</Text>
          <Text style={consentTextStyle}>
            By submitting this request, the client confirms they need urgent legal assistance and
            authorises Legal SOS to dispatch the nearest available licensed advocate to the
            location provided. The fee shown is the Initial Response Fee — final fees may vary
            based on case complexity, time on site, and follow-up work. The client may cancel
            for free before an advocate accepts the request. After acceptance, a partial refund
            (max 50% of the Initial Response Fee) may apply per the Legal SOS Service Agreement.
          </Text>
        </View>

        {/* Agreement card AR */}
        <View style={consentCardStyle}>
          <Text style={[consentLabelStyle, { textAlign: "right" }]}>
            AR — اتفاقية خدمة الطوارئ القانونية (موجز)
          </Text>
          <Text style={[consentTextStyle, { textAlign: "right", writingDirection: "rtl" }]}>
            بإرسال هذا الطلب، يقرّ العميل أنه بحاجة إلى مساعدة قانونية عاجلة، ويفوّض ليجال SOS
            بإيفاد أقرب محامي مرخّص متاح إلى الموقع المُحدد. الرسوم المعروضة هي رسوم الاستجابة
            الأولية، وقد تختلف الرسوم النهائية بحسب تعقيد القضية ومدة الحضور الميداني والمتابعات.
            يمكن للعميل الإلغاء مجانًا قبل قبول المحامي للطلب. بعد القبول، يُطبَّق استرداد جزئي
            (بحد أقصى 50% من رسوم الاستجابة الأولية) وفقًا لاتفاقية خدمة ليجال SOS.
          </Text>
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
            I have read and agree to the SOS Service Agreement.
            {"\n"}
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              قرأت ووافقت على اتفاقية خدمة الطوارئ القانونية.
            </Text>
          </Text>
        </Pressable>

        {/* Signature */}
        <SignaturePadField
          height={180}
          onCapture={(sig) => setSignatureDataUrl(sig)}
          onClear={() => setSignatureDataUrl(null)}
        />

        <View style={{ height: 18 }} />
        <Button
          label="Submit Request"
          onPress={confirm}
          disabled={!agreed || !signatureDataUrl}
        />
        <Text
          style={{
            color: colors.textSubtle,
            textAlign: "center",
            marginTop: 10,
            fontSize: 11,
            lineHeight: 14,
          }}
        >
          A signed consent record is created and timestamped on submit.
        </Text>
      </ScrollView>
    </Screen>
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
