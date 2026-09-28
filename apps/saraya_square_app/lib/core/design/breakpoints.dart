abstract final class SarayaBreakpoints {
  static const double compact = 700;
  static const double expanded = 1100;

  static bool isCompact(double width) => width < compact;
  static bool isExpanded(double width) => width >= expanded;
}
