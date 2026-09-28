import 'package:saraya_square_app/core/network/api_error.dart';

final class LeaseRecord {
  const LeaseRecord({
    required this.id,
    required this.propertyId,
    required this.unitId,
    required this.tenantOrganizationId,
    required this.status,
    required this.currentVersion,
    required this.unitNumber,
    required this.tenantNameAr,
    required this.tenantNameEn,
    required this.startDate,
    required this.endDate,
    required this.rentAmount,
    required this.depositAmount,
    required this.frequency,
    required this.dueDay,
    required this.graceDays,
    required this.createdAt,
    required this.updatedAt,
    this.unitNameAr,
    this.unitNameEn,
  });

  factory LeaseRecord.fromJson(Map<String, Object?> json) => LeaseRecord(
    id: _requiredString(json, 'id'),
    propertyId: _requiredString(json, 'propertyId'),
    unitId: _requiredString(json, 'unitId'),
    tenantOrganizationId: _requiredString(json, 'tenantOrganizationId'),
    status: _requiredString(json, 'status'),
    currentVersion: _requiredInt(json, 'currentVersion'),
    unitNumber: _requiredString(json, 'unitNumber'),
    unitNameAr: _optionalString(json['unitNameAr']),
    unitNameEn: _optionalString(json['unitNameEn']),
    tenantNameAr: _requiredString(json, 'tenantNameAr'),
    tenantNameEn: _requiredString(json, 'tenantNameEn'),
    startDate: _requiredString(json, 'startDate'),
    endDate: _requiredString(json, 'endDate'),
    rentAmount: _requiredMoney(json, 'rentAmount'),
    depositAmount: _requiredMoney(json, 'depositAmount'),
    frequency: _requiredString(json, 'frequency'),
    dueDay: _requiredInt(json, 'dueDay'),
    graceDays: _requiredInt(json, 'graceDays'),
    createdAt: _requiredString(json, 'createdAt'),
    updatedAt: _requiredString(json, 'updatedAt'),
  );

  final String id;
  final String propertyId;
  final String unitId;
  final String tenantOrganizationId;
  final String status;
  final int currentVersion;
  final String unitNumber;
  final String? unitNameAr;
  final String? unitNameEn;
  final String tenantNameAr;
  final String tenantNameEn;
  final String startDate;
  final String endDate;
  final String rentAmount;
  final String depositAmount;
  final String frequency;
  final int dueDay;
  final int graceDays;
  final String createdAt;
  final String updatedAt;
}

enum LeaseAction {
  approve,
  requestRenewal,
  approveRenewal,
  rejectRenewal,
  terminate,
  close,
}

final class LeaseRenewalTerms {
  const LeaseRenewalTerms({
    required this.startDate,
    required this.endDate,
    required this.rentAmount,
    required this.depositAmount,
    required this.frequency,
    required this.dueDay,
    required this.graceDays,
    this.discountAmount = '0.000',
    this.feeAmount = '0.000',
  });

  factory LeaseRenewalTerms.fromLease(LeaseRecord lease) => LeaseRenewalTerms(
    startDate: lease.startDate,
    endDate: lease.endDate,
    rentAmount: lease.rentAmount,
    depositAmount: lease.depositAmount,
    frequency: lease.frequency,
    dueDay: lease.dueDay,
    graceDays: lease.graceDays,
  );

  final String startDate;
  final String endDate;
  final String rentAmount;
  final String depositAmount;
  final String frequency;
  final int dueDay;
  final int graceDays;
  final String discountAmount;
  final String feeAmount;

  Map<String, Object> toJson() => {
    'startDate': startDate,
    'endDate': endDate,
    'rentAmount': rentAmount,
    'depositAmount': depositAmount,
    'frequency': frequency,
    'dueDay': dueDay,
    'graceDays': graceDays,
    'discountAmount': discountAmount,
    'feeAmount': feeAmount,
  };
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

String _requiredMoney(Map<String, Object?> json, String key) {
  final value = _requiredString(json, key);
  if (!RegExp(r'^\d+(?:\.\d+)?$').hasMatch(value)) {
    throw ApiError.invalidResponse(200);
  }
  return value;
}

int _requiredInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;
