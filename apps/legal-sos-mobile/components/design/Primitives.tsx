// Atomic design primitives — ported from mobile/styles.css.
// Pure React Native; no web-only properties.

import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii } from "../../constants/theme";

// ───── Tag pill ──────────────────────────────────────────────────────

type PillTone = "default" | "gold" | "green" | "red";

export function Pill({
  tone = "default",
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  const palette = {
    default: { bg: colors.whiteAlpha04, border: colors.whiteAlpha08, fg: colors.textMuted },
    gold: { bg: colors.goldTint12, border: colors.goldBorder30, fg: colors.gold2 },
    green: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.30)", fg: colors.success },
    red: { bg: colors.sosTint, border: "rgba(211, 47, 47, 0.30)", fg: "#ff6b6b" },
  }[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      {typeof children === "string" ? (
        <Text style={{ color: palette.fg, fontSize: 11, fontWeight: "500", letterSpacing: 0.2 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ───── Card ─────────────────────────────────────────────────────────

export function Card({
  goldGlow = false,
  style,
  children,
}: {
  goldGlow?: boolean;
  style?: object;
  children: ReactNode;
}) {
  if (goldGlow) {
    return (
      <LinearGradient
        colors={["rgba(212, 168, 90, 0.10)", "rgba(212, 168, 90, 0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radii.lg,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.goldBorder40,
            backgroundColor: colors.card,
          },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: radii.lg,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ───── Primary / secondary / danger buttons ────────────────────────

interface ButtonProps {
  label: string | ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  height?: number;
  fontSize?: number;
  disabled?: boolean;
  style?: object;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function Btn({
  label,
  onPress,
  variant = "primary",
  height,
  fontSize,
  disabled,
  style,
  iconLeft,
  iconRight,
}: ButtonProps) {
  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
        <LinearGradient
          colors={["#e8c281", "#d4a85a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            height: height ?? 56,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 18,
            shadowColor: "#d4a85a",
            shadowOpacity: disabled ? 0 : 0.55,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          {iconLeft}
          {typeof label === "string" ? (
            <Text
              style={{
                color: "#1a0f00",
                fontSize: fontSize ?? 16,
                fontWeight: "600",
                letterSpacing: -0.2,
              }}
            >
              {label}
            </Text>
          ) : (
            label
          )}
          {iconRight}
        </LinearGradient>
      </Pressable>
    );
  }
  if (variant === "danger") {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
        <LinearGradient
          colors={["#ef4444", "#d32f2f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            height: height ?? 56,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 18,
            shadowColor: colors.sos,
            shadowOpacity: 0.55,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
          }}
        >
          {iconLeft}
          {typeof label === "string" ? (
            <Text style={{ color: "#fff", fontSize: fontSize ?? 16, fontWeight: "600" }}>{label}</Text>
          ) : (
            label
          )}
          {iconRight}
        </LinearGradient>
      </Pressable>
    );
  }
  // secondary
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: height ?? 52,
          borderRadius: 14,
          backgroundColor: colors.whiteAlpha06,
          borderWidth: 1,
          borderColor: colors.whiteAlpha10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 16,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {iconLeft}
      {typeof label === "string" ? (
        <Text style={{ color: colors.white, fontSize: fontSize ?? 15, fontWeight: "500" }}>{label}</Text>
      ) : (
        label
      )}
      {iconRight}
    </Pressable>
  );
}

// ───── Top nav bar (inside screen body, after status bar) ──────────

export function TopNav({
  title,
  left,
  right,
}: {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View
      style={{
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
      }}
    >
      {left ?? <View style={{ width: 36 }} />}
      {typeof title === "string" ? (
        <Text style={{ color: colors.white, fontSize: 14, fontWeight: "500", letterSpacing: -0.1 }}>
          {title}
        </Text>
      ) : title ? (
        title
      ) : (
        <View />
      )}
      {right ?? <View style={{ width: 36 }} />}
    </View>
  );
}

// ───── Round icon button (used in top nav + call controls) ─────────

export function IconBtn({
  children,
  size = 36,
  onPress,
  bg,
  border,
}: {
  children: ReactNode;
  size?: number;
  onPress?: () => void;
  bg?: string;
  border?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg ?? colors.whiteAlpha06,
        borderWidth: 1,
        borderColor: border ?? colors.whiteAlpha08,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

// ───── Avatar (initials in a gold gradient circle) ─────────────────

export function Avatar({
  init,
  size = 36,
  fontSize,
}: {
  init: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <LinearGradient
      colors={["#e8c281", "#9c7a3d"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#1a0f00", fontWeight: "600", fontSize: fontSize ?? size * 0.36 }}>
        {init}
      </Text>
    </LinearGradient>
  );
}
