import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const _primaryBlue = Color(0xFF3B82F6);
  static const _successGreen = Color(0xFF22C55E);
  static const _warningAmber = Color(0xFFF59E0B);
  static const _dangerRed = Color(0xFFEF4444);

  static Color get primaryBlue => _primaryBlue;
  static Color get successGreen => _successGreen;
  static Color get warningAmber => _warningAmber;
  static Color get dangerRed => _dangerRed;

  static Color recordTypeColor(String type) {
    switch (type) {
      case 'MRI': return const Color(0xFF8B5CF6);
      case 'XRAY': return _primaryBlue;
      case 'CT_SCAN': return _warningAmber;
      case 'ULTRASOUND': return _successGreen;
      default: return Colors.grey;
    }
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: _primaryBlue,
      brightness: Brightness.light,
      textTheme: GoogleFonts.interTextTheme(),
      appBarTheme: const AppBarTheme(centerTitle: false, elevation: 0),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
