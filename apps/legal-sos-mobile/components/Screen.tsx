import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View, type ViewStyle, type ScrollViewProps } from "react-native";
import { colors } from "../constants/theme";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** When true, content scrolls. Default false (fixed layout, useful for tracking/map screens). */
  scroll?: boolean;
  /** Pads sides; set false for screens that render edge-to-edge maps. */
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}

export default function Screen({ children, scroll = true, padded = true, style, contentContainerStyle }: Props) {
  const inner: ViewStyle = {
    flex: 1,
    paddingHorizontal: padded ? 20 : 0,
    backgroundColor: colors.bg,
    ...style,
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ paddingHorizontal: padded ? 20 : 0, paddingBottom: 32 }, contentContainerStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={inner}>{children}</View>
      )}
    </SafeAreaView>
  );
}
