import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Centralized design tokens. Hardcoded colors are forbidden in screens —
/// always use AppTheme.*. White-label: these defaults can be overridden per tenant.
class AppTheme {
  AppTheme._();

  // Colors
  static const Color primary = Color(0xFF0EA5E9);
  static const Color accent = Color(0xFF16A34A);
  static const Color textPrimary = Color(0xFF1A1A2E);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color bgBody = Color(0xFFF8FAFC);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color cardBorder = Color(0xFFE5E7EB);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color successColor = Color(0xFF16A34A);
  static const Color warningColor = Color(0xFFF59E0B);

  // Table status (restaurant)
  static const Color tableFree = Color(0xFF16A34A);
  static const Color tableOccupied = Color(0xFFF59E0B);
  static const Color tableBill = Color(0xFF0EA5E9);

  // Radius
  static const double radiusSmall = 8;
  static const double radiusMedium = 12;
  static const double radiusLarge = 16;
  static const double radiusXLarge = 24;

  // Spacing
  static const double spacingXS = 4;
  static const double spacingS = 8;
  static const double spacingM = 16;
  static const double spacingL = 24;
  static const double spacingXL = 32;

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: bgBody,
        colorScheme: ColorScheme.fromSeed(seedColor: primary, primary: primary),
        textTheme: GoogleFonts.outfitTextTheme(),
        appBarTheme: const AppBarTheme(
          backgroundColor: cardBg,
          foregroundColor: textPrimary,
          elevation: 0,
        ),
      );
}
