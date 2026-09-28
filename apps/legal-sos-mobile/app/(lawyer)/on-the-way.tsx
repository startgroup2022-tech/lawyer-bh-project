import { View, Text, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import Button from "../../components/Button";
import LiveMap from "../../components/LiveMap";
import LawyerAvatar from "../../components/LawyerAvatar";
import { comingSoon } from "../../components/comingSoon";
import { colors } from "../../constants/theme";

export default function OnTheWay() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="On the way" subtitle="You are on the way to the client" />
      <LiveMap height={300} />
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 14,
          marginTop: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <LawyerAvatar name="Mr Ali" size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>CLIENT</Text>
          <Text style={{ color: colors.white, fontWeight: "800", marginTop: 2 }}>Mr. Ali Hasan</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => Linking.openURL("tel:+97336470706")}>
          <Ionicons name="call" size={22} color={colors.gold} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => comingSoon("In-app chat")}>
          <Ionicons name="chatbubble" size={22} color={colors.gold} />
        </Pressable>
      </View>
      <View style={{ height: 14 }} />
      <Button label="I've Arrived" onPress={() => router.push("/(lawyer)/arrived")} />
    </Screen>
  );
}
