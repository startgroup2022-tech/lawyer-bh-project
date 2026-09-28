// Floating glass-ish tab bar (no real backdrop blur on RN — uses
// translucent surface + light border). Sits absolutely positioned
// at the bottom of the screen.

import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../../constants/theme";

interface Tab {
  key: string;
  label: string;
  icon: ReactNode;
  onPress?: () => void;
}

export function TabBar({
  active,
  tabs,
}: {
  active?: string;
  tabs: Tab[];
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 24,
        height: 64,
        borderRadius: 22,
        backgroundColor: "rgba(15, 25, 45, 0.92)",
        borderWidth: 1,
        borderColor: colors.whiteAlpha06,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 8,
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 20 },
        elevation: 12,
      }}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={t.onPress}
            style={{
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 6,
              paddingHorizontal: 14,
            }}
          >
            {t.icon}
            <Text
              style={{
                color: on ? colors.gold2 : colors.textSubtle,
                fontSize: 10,
                fontWeight: "500",
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
