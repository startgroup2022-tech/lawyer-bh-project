import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Btn, IconBtn, TopNav } from "../../components/design/Primitives";
import { updateDraft, getDraft } from "../../lib/sosDraft";
import { getSelectedCountry } from "../../lib/secureStore";
import { COUNTRIES, getCountry, type Country } from "../../constants/countries";
import { colors } from "../../constants/theme";
import { requestOtp, verifyOtp } from "../../lib/otp";
import { ApiError } from "../../lib/api";

export default function Kyc() {
  const router = useRouter();
  const existing = getDraft().kyc ?? {};
  const [fullName, setFullName] = useState<string>(existing.fullName ?? "");
  const [idNumber, setIdNumber] = useState<string>(existing.idNumber ?? "");
  const [phone, setPhone] = useState<string>(existing.phone ?? "");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);

  // OTP flow state — drives the modal.
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const code = await getSelectedCountry();
      const c = getCountry(code) ?? COUNTRIES[0];
      if (mounted) setCountry(c);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!otpOpen || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [otpOpen, resendIn]);

  useEffect(() => {
    if (otpOpen) {
      const t = setTimeout(() => otpRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [otpOpen]);

  const phoneDigits = phone.replace(/[^\d]/g, "");
  const phoneValid = phoneDigits.length >= 8;
  const e164Phone = `${country.dialCode}${phoneDigits}`;

  async function startOtp() {
    setOtpError(null);
    setOtpCode("");
    setOtpSending(true);
    try {
      await requestOtp({ phone: e164Phone, role: "client", locale: language });
      setOtpOpen(true);
      setResendIn(45);
    } catch (err) {
      const msg =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "Could not send code. Check the number and try again.";
      setOtpError(msg);
      setOtpOpen(true);
    } finally {
      setOtpSending(false);
    }
  }

  async function submitOtp() {
    setOtpError(null);
    setOtpVerifying(true);
    try {
      const trimmedName = fullName.trim();
      const trimmedId = idNumber.trim();
      await verifyOtp({
        phone: e164Phone,
        code: otpCode,
        role: "client",
        fullName: trimmedName || undefined,
        idNumber: trimmedId || undefined,
        countryCode: country.code,
        locale: language,
      });

      // Persist KYC locally too (existing draft flow still wants this).
      updateDraft({
        kyc: {
          fullName: trimmedName,
          idType: "cpr",
          idNumber: trimmedId || "•••0000",
          phone: e164Phone,
        },
        language,
      });

      setOtpOpen(false);
      router.push("/(client)/consent-field");
    } catch (err) {
      const msg =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "Verification failed. Try again.";
      setOtpError(msg);
    } finally {
      setOtpVerifying(false);
    }
  }

  const codeChars = (otpCode + "······").slice(0, 6).split("");
  const otpValid = /^\d{6}$/.test(otpCode);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <TopNav
            left={<IconBtn onPress={() => router.back()}><Ic.back/></IconBtn>}
            title="Identity"
          />
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ color: colors.white, fontSize: 22, fontWeight: "500", letterSpacing: -0.4 }}>
              Tell us who's{" "}
              <Text style={{ color: colors.gold2, fontStyle: "italic" }}>here</Text>.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
              Required by Bahraini law before we can dispatch counsel. Step 2 of 4.
            </Text>

            {/* progress */}
            <View style={{ flexDirection: "row", gap: 4, marginTop: 16, marginBottom: 22 }}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: i <= 2 ? colors.gold2 : "rgba(143,160,189,0.18)",
                  }}
                />
              ))}
            </View>

            <Field label="Full legal name">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="As shown on your ID"
                placeholderTextColor={colors.textSubtle}
                style={inputStyle}
              />
            </Field>

            <Field label={`${country.code === "BH" ? "Bahrain CPR" : "National ID"} / Passport`}>
              <TextInput
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder={country.code === "BH" ? "9-digit CPR" : "ID number"}
                placeholderTextColor={colors.textSubtle}
                keyboardType="number-pad"
                style={[inputStyle, { fontVariant: ["tabular-nums"] }]}
              />
            </Field>

            <Field label="Mobile">
              <View style={prefixStyle}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 13,
                    borderRightWidth: 1,
                    borderRightColor: colors.whiteAlpha08,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 14,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {country.flag} {country.dialCode}
                  </Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/[^\d ]/g, ""))}
                  placeholder="3322 4471"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    color: colors.white,
                    fontSize: 15,
                  }}
                />
              </View>
              {phoneValid && (
                <Text style={{ color: colors.textSubtle, fontSize: 11, marginTop: 6 }}>
                  <Text style={{ color: colors.success }}>✓</Text> We'll send a 6-digit code by SMS
                </Text>
              )}
            </Field>

            <Field label="Preferred language">
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  padding: 3,
                  backgroundColor: colors.whiteAlpha04,
                  borderWidth: 1,
                  borderColor: colors.whiteAlpha08,
                  borderRadius: 12,
                }}
              >
                <Pressable
                  onPress={() => setLanguage("en")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: language === "en" ? colors.goldTint16 : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: language === "en" ? colors.gold2 : colors.textMuted,
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    English
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLanguage("ar")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor: language === "ar" ? colors.goldTint16 : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: language === "ar" ? colors.gold2 : colors.textMuted,
                      fontSize: 14,
                      fontWeight: "500",
                    }}
                  >
                    العربية
                  </Text>
                </Pressable>
              </View>
            </Field>

            <View
              style={{
                marginTop: 4,
                marginBottom: 18,
                backgroundColor: colors.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                flexDirection: "row",
                gap: 10,
                padding: 14,
                alignItems: "flex-start",
              }}
            >
              <Ic.shield color={colors.gold2} size={16} />
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, flex: 1 }}>
                Your details are end-to-end encrypted and shared only with the lawyer assigned to your case.
              </Text>
            </View>

            <Btn
              label={otpSending ? "Sending code…" : "Verify mobile to continue"}
              onPress={startOtp}
              disabled={!fullName.trim() || !phoneValid || otpSending}
            />
          </ScrollView>
        </View>

        {/* ── OTP Modal ── */}
        <Modal
          visible={otpOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setOtpOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
            <View
              style={{
                backgroundColor: colors.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 24,
                paddingBottom: 32,
                paddingHorizontal: 20,
                borderTopWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <View style={{ width: 36, height: 4, backgroundColor: colors.whiteAlpha08, borderRadius: 2, alignSelf: "center", marginBottom: 18 }} />

              <Text style={{ color: colors.white, fontSize: 20, fontWeight: "500", letterSpacing: -0.4 }}>
                Enter the code
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                Sent to {country.flag} {country.dialCode} {phone.trim()}.
              </Text>

              <Pressable
                onPress={() => otpRef.current?.focus()}
                style={{ flexDirection: "row", gap: 8, marginTop: 22, justifyContent: "center" }}
              >
                {codeChars.map((d, i) => {
                  const filled = i < otpCode.length;
                  return (
                    <View
                      key={i}
                      style={{
                        width: 42,
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: filled ? colors.goldTint12 : colors.whiteAlpha04,
                        borderWidth: 1,
                        borderColor: filled ? colors.goldBorder40 : colors.whiteAlpha08,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "500",
                          color: filled ? colors.gold2 : colors.textSubtle,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {filled ? d : "•"}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={otpRef}
                value={otpCode}
                onChangeText={(v) => {
                  setOtpCode(v.replace(/[^\d]/g, "").slice(0, 6));
                  setOtpError(null);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                style={{ height: 0, opacity: 0 }}
              />

              {otpError && (
                <Text style={{ color: "#ff8a8a", fontSize: 12, marginTop: 12, textAlign: "center" }}>
                  {otpError}
                </Text>
              )}

              <View style={{ alignItems: "center", marginTop: 14 }}>
                {resendIn > 0 ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 11.5,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    Resend in 00:{resendIn.toString().padStart(2, "0")}
                  </Text>
                ) : (
                  <Pressable onPress={startOtp} disabled={otpSending}>
                    <Text style={{ color: colors.gold2, fontSize: 13, fontWeight: "500" }}>
                      {otpSending ? "Sending…" : "Resend code"}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={{ height: 18 }} />

              <Btn
                label={otpVerifying ? "Verifying…" : "Verify & continue"}
                onPress={submitOtp}
                disabled={!otpValid || otpVerifying}
              />

              <Pressable onPress={() => setOtpOpen(false)} style={{ marginTop: 8, paddingVertical: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center" }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 11.5,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          fontWeight: "500",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.whiteAlpha04,
  borderWidth: 1,
  borderColor: colors.whiteAlpha08,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontSize: 15,
  color: colors.white,
} as const;

const prefixStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  backgroundColor: colors.whiteAlpha04,
  borderWidth: 1,
  borderColor: colors.whiteAlpha08,
  borderRadius: 12,
  overflow: "hidden" as const,
};
