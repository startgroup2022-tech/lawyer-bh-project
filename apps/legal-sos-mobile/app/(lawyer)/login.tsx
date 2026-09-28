import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Btn } from "../../components/design/Primitives";
import { colors } from "../../constants/theme";
import { requestOtp, verifyOtp } from "../../lib/otp";
import { ApiError } from "../../lib/api";

type Step = "phone" | "otp";

export default function LawyerLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<TextInput>(null);

  // Resend countdown — ticks down once OTP is sent.
  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  // Auto-focus the hidden OTP input once we move to the OTP step.
  useEffect(() => {
    if (step === "otp") {
      const t = setTimeout(() => otpRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [step]);

  function normalizeBahrainPhone(localInput: string): string {
    // Strip everything except digits, then prepend +973.
    const digits = localInput.replace(/[^\d]/g, "");
    return `+973${digits}`;
  }

  async function sendOtp() {
    setError(null);
    const e164 = normalizeBahrainPhone(phone);
    if (!/^\+973[367]\d{7}$/.test(e164)) {
      setError("Enter a valid 8-digit Bahraini mobile (starts with 3, 6, or 7).");
      return;
    }
    setSending(true);
    try {
      await requestOtp({ phone: e164, role: "lawyer", locale: "en" });
      setStep("otp");
      setCode("");
      setResendIn(45);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body && typeof err.body === "object" && "message" in err.body
          ? String((err.body as { message: unknown }).message)
          : "Could not send code.");
      } else {
        setError("Network error. Try again.");
      }
    } finally {
      setSending(false);
    }
  }

  async function submitCode() {
    setError(null);
    const e164 = normalizeBahrainPhone(phone);
    setVerifying(true);
    try {
      await verifyOtp({ phone: e164, code, role: "lawyer", locale: "en", countryCode: "BH" });
      router.replace("/(lawyer)/home");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string; message?: string } | null;
        const code = body?.error ?? "";
        if (code === "lawyer_not_registered") {
          Alert.alert(
            "Not registered",
            "This number isn't registered as an advocate yet. Contact info@lawyers.bh.",
          );
        } else {
          setError(body?.message ?? "Verification failed.");
        }
      } else {
        setError("Network error. Try again.");
      }
    } finally {
      setVerifying(false);
    }
  }

  const codeChars = (code + "······").slice(0, 6).split("");
  const validCode = /^\d{6}$/.test(code);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 24,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <LinearGradient
              colors={["#e8c281", "#9c7a3d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.gold,
                shadowOpacity: 0.5,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 16 },
                elevation: 12,
              }}
            >
              <Text style={{ color: "#1a0f00", fontWeight: "700", fontSize: 20 }}>Au</Text>
            </LinearGradient>
            <Text
              style={{
                color: colors.white,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.7,
                marginTop: 22,
              }}
            >
              Advocate sign-in
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                marginTop: 8,
                paddingHorizontal: 12,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {step === "phone"
                ? "Enter the mobile registered with the Lawyers Affairs Dept. to receive an OTP."
                : `We sent a 6-digit code to +973 ${phone.replace(/(\d{4})(\d{4})/, "$1 $2")}.`}
            </Text>
          </View>

          {step === "phone" && (
            <View style={{ marginTop: 30 }}>
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
                Mobile
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.whiteAlpha04,
                  borderWidth: 1,
                  borderColor: colors.whiteAlpha08,
                  borderRadius: 12,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 13,
                    borderRightWidth: 1,
                    borderRightColor: colors.whiteAlpha08,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 14, fontVariant: ["tabular-nums"] }}>
                    🇧🇭 +973
                  </Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/[^\d ]/g, "").slice(0, 9))}
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
              {error && (
                <Text style={{ color: "#ff8a8a", fontSize: 12, marginTop: 10 }}>
                  {error}
                </Text>
              )}
            </View>
          )}

          {step === "otp" && (
            <>
              <Pressable
                onPress={() => otpRef.current?.focus()}
                style={{ flexDirection: "row", gap: 8, marginTop: 30, justifyContent: "center" }}
              >
                {codeChars.map((d, i) => {
                  const filled = i < code.length;
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

              {/* Off-screen text input that drives the visible boxes. */}
              <TextInput
                ref={otpRef}
                value={code}
                onChangeText={(v) => {
                  const digits = v.replace(/[^\d]/g, "").slice(0, 6);
                  setCode(digits);
                  setError(null);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                style={{ height: 0, opacity: 0 }}
              />

              {error && (
                <Text style={{ color: "#ff8a8a", fontSize: 12, marginTop: 12, textAlign: "center" }}>
                  {error}
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
                  <Pressable onPress={sendOtp} disabled={sending}>
                    <Text style={{ color: colors.gold2, fontSize: 13, fontWeight: "500" }}>
                      {sending ? "Sending…" : "Resend code"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          <View style={{ flex: 1 }} />

          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 16,
              padding: 12,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Ic.shield color={colors.gold2} size={16} />
            <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>
              By signing in you accept the Advocate Code of Conduct and the 24/7 on-call obligations.
            </Text>
          </View>

          {step === "phone" ? (
            <Btn
              label={sending ? "Sending code…" : "Send OTP"}
              onPress={sendOtp}
              disabled={sending || phone.replace(/\D/g, "").length !== 8}
            />
          ) : (
            <View style={{ gap: 8 }}>
              <Btn
                label={verifying ? "Verifying…" : "Verify & sign in"}
                onPress={submitCode}
                disabled={!validCode || verifying}
              />
              <Pressable onPress={() => { setStep("phone"); setCode(""); setError(null); }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", paddingVertical: 8 }}>
                  Use a different number
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
