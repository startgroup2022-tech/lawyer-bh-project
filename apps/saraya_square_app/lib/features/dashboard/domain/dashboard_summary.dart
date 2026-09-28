import 'package:saraya_square_app/core/network/api_error.dart';

final class DashboardSummary {
  const DashboardSummary({
    required this.propertyId,
    required this.role,
    required this.occupiedUnits,
    required this.vacantUnits,
    required this.tenantCount,
    required this.pendingRequests,
    required this.dueAmount,
    required this.paidAmount,
    required this.overdueAmount,
    required this.currencyCode,
  });

  factory DashboardSummary.fromJson(Map<String, Object?> json) {
    final propertyId = _requiredString(json, 'propertyId');
    final role = _requiredString(json, 'role');
    final occupiedUnits = _requiredInteger(json, 'occupiedUnits');
    final vacantUnits = _requiredInteger(json, 'vacantUnits');
    final tenantCount = _requiredInteger(json, 'tenantCount');
    final pendingRequests = _requiredInteger(json, 'pendingRequests');
    final dueAmount = _requiredMoney(json, 'dueAmount');
    final paidAmount = _requiredMoney(json, 'paidAmount');
    final overdueAmount = _requiredMoney(json, 'overdueAmount');
    final currencyCode = _requiredString(json, 'currencyCode');

    return DashboardSummary(
      propertyId: propertyId,
      role: role,
      occupiedUnits: occupiedUnits,
      vacantUnits: vacantUnits,
      tenantCount: tenantCount,
      pendingRequests: pendingRequests,
      dueAmount: dueAmount,
      paidAmount: paidAmount,
      overdueAmount: overdueAmount,
      currencyCode: currencyCode,
    );
  }

  final String propertyId;
  final String role;
  final int occupiedUnits;
  final int vacantUnits;
  final int tenantCount;
  final int pendingRequests;
  final String dueAmount;
  final String paidAmount;
  final String overdueAmount;
  final String currencyCode;

  static String _requiredString(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is String && value.isNotEmpty) return value;
    throw ApiError.invalidResponse(200);
  }

  static int _requiredInteger(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is int && value >= 0) return value;
    throw ApiError.invalidResponse(200);
  }

  static String _requiredMoney(Map<String, Object?> json, String key) {
    final value = _requiredString(json, key);
    if (RegExp(r'^\d+(?:\.\d+)?$').hasMatch(value)) return value;
    throw ApiError.invalidResponse(200);
  }
}
