import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';

abstract final class SarayaTheme {
  static final ThemeData light = _buildLightTheme();

  static ThemeData _buildLightTheme() {
    const colorScheme = ColorScheme.light(
      primary: SarayaColors.deepGreen,
      onPrimary: SarayaColors.white,
      secondary: SarayaColors.mutedGold,
      onSecondary: SarayaColors.ink,
      error: SarayaColors.danger,
      onError: SarayaColors.white,
      surface: SarayaColors.warmSurface,
      onSurface: SarayaColors.ink,
      outline: SarayaColors.border,
    );
    const roundedShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(16)),
    );
    const minimumControlSize = Size(44, 44);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: SarayaColors.warmSurface,
      focusColor: SarayaColors.mutedGold.withValues(alpha: 0.28),
      hoverColor: SarayaColors.green.withValues(alpha: 0.08),
      splashColor: SarayaColors.green.withValues(alpha: 0.12),
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      cardTheme: const CardThemeData(
        color: SarayaColors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: roundedShape,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: SarayaColors.warmSurface,
        foregroundColor: SarayaColors.ink,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: minimumControlSize,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: minimumControlSize,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: minimumControlSize),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: SarayaColors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: SarayaColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: SarayaColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: SarayaColors.mutedGold, width: 2),
        ),
      ),
      dividerTheme: const DividerThemeData(color: SarayaColors.border),
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          color: SarayaColors.ink,
          fontSize: 24,
          fontWeight: FontWeight.w700,
          height: 1.25,
        ),
        titleMedium: TextStyle(
          color: SarayaColors.ink,
          fontSize: 16,
          fontWeight: FontWeight.w700,
          height: 1.35,
        ),
        bodyMedium: TextStyle(
          color: SarayaColors.ink,
          fontSize: 14,
          height: 1.5,
        ),
        bodySmall: TextStyle(
          color: SarayaColors.mutedInk,
          fontSize: 12,
          height: 1.45,
        ),
      ),
    );
  }
}
