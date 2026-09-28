import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, Alert, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ic } from "../../components/design/Icons";
import { Avatar, IconBtn, Pill, TopNav } from "../../components/design/Primitives";
import { COUNTRIES, getCountry } from "../../constants/countries";
import {
  clearActiveCaseRef,
  clearSelectedCountry,
  clearSessionToken,
  getSelectedCountry,
  type CountryCode,
} from "../../lib/secureStore";
import { getDraft, resetDraft } from "../../lib/sosDraft";
import { CONTACT } from "../../constants/contact";
import { colors } from "../../constants/theme";

export default function Profile() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState<CountryCode | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const c = await getSelectedCountry();
      if (mounted) setCountryCode(c);
    })();
    return () => { mounted = false; };
  }, []);

  const country = getCountry(countryCode) ?? COUNTRIES[0];
  const draft = getDraft();
  const name = draft.kyc?.fullName ?? "Guest user";

  function signOut() {
    Alert.alert("Sign out?", "Clear your country, session, and any in-flight request.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearSessionToken();
          await clearActiveCaseRef();
          await clearSelectedCountry();
          resetDraft();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <TopNav
          left={<IconBtn onPress={() => router.back()}><Ic.back/></IconBtn>}
          title="Profile"
          right={<IconBtn><Ic.edit/></IconBtn>}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 }}
        >
          {/* Avatar header */}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Avatar init={name.charAt(0).toUpperCase()} size={76} fontSize={26} />
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: "500", marginTop: 12, letterSpacing: -0.2 }}>
              {name}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11.5, marginTop: 3, fontVariant: ["tabular-nums"] }}>
              Member since Jan 2026 · 3 cases
            </Text>
            <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 10 }}>
              <Pill tone="gold">{`${country.flag} ${country.name}`}</Pill>
              <Pill>EN · primary</Pill>
            </View>
          </View>

          <SectionH>ACCOUNT</SectionH>
          <Section>
            <Row label="Personal details" />
            <Row label="Identity (CPR)" value="••• 4271" />
            <Row label="Mobile" value="+973 3322 ••71" />
            <Row label="Email" value="hessa.m@…" last />
          </Section>

          <SectionH>PREFERENCES</SectionH>
          <Section>
            <Row
              label="Language"
              value={draft.language === "ar" ? "العربية" : "English"}
            />
            <Row
              label="Country"
              value={`${country.flag} ${country.name}`}
              onPress={async () => {
                await clearSelectedCountry();
                router.replace("/");
              }}
            />
            <Row label="Notifications" value="On" last />
          </Section>

          <SectionH>PAYMENT &amp; SECURITY</SectionH>
          <Section>
            <Row label="Payment methods" value="Apple Pay · •4823" />
            <Row label="Privacy & data" />
            <Row label="Receipts & invoices" last />
          </Section>

          <SectionH>SUPPORT</SectionH>
          <Section>
            <Row
              label="Call hotline"
              value={<Text style={{ color: colors.gold2, fontVariant: ["tabular-nums"] }}>+973 3231 7070</Text>}
              onPress={() => Linking.openURL(`tel:${CONTACT.hotline.replace(/\s/g, "")}`)}
            />
            <Row label="Help & FAQ" onPress={() => router.push("/help")} />
            <Row label="Sign out" danger last onPress={signOut} />
          </Section>

          <Text
            style={{
              color: colors.textSubtle,
              textAlign: "center",
              fontSize: 11,
              marginTop: 14,
              marginBottom: 8,
            }}
          >
            v1.0 · build 28 · Powered by lawyers.bh
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SectionH({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: colors.textSubtle,
        fontSize: 11.5,
        letterSpacing: 1,
        textTransform: "uppercase",
        fontWeight: "500",
        marginTop: 4,
        marginBottom: 6,
        marginLeft: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  last,
  danger,
  onPress,
}: {
  label: string;
  value?: ReactNode;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          color: danger ? "#ff6b6b" : colors.white,
          fontWeight: danger ? "500" : "400",
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {typeof value === "string" ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{value}</Text>
        ) : (
          value
        )}
        {!danger && <Ic.chevron color={colors.textSubtle} />}
      </View>
    </Pressable>
  );
}
