import { Stack } from "expo-router";
import { colors } from "../../constants/theme";

export default function LawyerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    />
  );
}
