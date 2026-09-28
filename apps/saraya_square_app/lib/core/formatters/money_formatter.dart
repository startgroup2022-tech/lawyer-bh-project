String formatMoney(String currencyCode, String value) {
  final match = RegExp(r'^(\d+)(?:\.(\d+))?$').firstMatch(value.trim());
  if (match == null) return '$currencyCode 0.000';
  final whole = match.group(1)!.replaceFirst(RegExp(r'^0+(?=\d)'), '');
  final fraction = match.group(2) ?? '';
  final padded = '${fraction}0000';
  var minorUnits = BigInt.parse(whole) * BigInt.from(1000);
  minorUnits += BigInt.parse(padded.substring(0, 3));
  if (int.parse(padded[3]) >= 5) minorUnits += BigInt.one;
  final roundedWhole = (minorUnits ~/ BigInt.from(1000)).toString();
  final roundedFraction = (minorUnits % BigInt.from(1000)).toString().padLeft(
    3,
    '0',
  );
  final groupedWhole = roundedWhole.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '$currencyCode $groupedWhole.$roundedFraction';
}
