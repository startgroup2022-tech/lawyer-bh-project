import 'package:saraya_square_app/core/network/api_error.dart';

final class VirtualAddressRecord {
  const VirtualAddressRecord({
    required this.id,
    required this.propertyId,
    required this.slotNumber,
    required this.code,
    required this.status,
    this.tenantOrganizationId,
    this.tenantNameAr,
    this.tenantNameEn,
    this.businessNameAr,
    this.businessNameEn,
    this.monthlyFee,
    this.startDate,
    this.endDate,
  });

  factory VirtualAddressRecord.fromJson(Map<String, Object?> json) =>
      VirtualAddressRecord(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        slotNumber: _requiredInt(json, 'slotNumber'),
        code: _requiredString(json, 'code'),
        status: _requiredString(json, 'status'),
        tenantOrganizationId: _optionalString(json['tenantOrganizationId']),
        tenantNameAr: _optionalString(json['tenantNameAr']),
        tenantNameEn: _optionalString(json['tenantNameEn']),
        businessNameAr: _optionalString(json['businessNameAr']),
        businessNameEn: _optionalString(json['businessNameEn']),
        monthlyFee: _optionalString(json['monthlyFee']),
        startDate: _optionalString(json['startDate']),
        endDate: _optionalString(json['endDate']),
      );

  final String id;
  final String propertyId;
  final int slotNumber;
  final String code;
  final String status;
  final String? tenantOrganizationId;
  final String? tenantNameAr;
  final String? tenantNameEn;
  final String? businessNameAr;
  final String? businessNameEn;
  final String? monthlyFee;
  final String? startDate;
  final String? endDate;
}

final class VirtualAddressInput {
  const VirtualAddressInput({
    required this.status,
    this.tenantOrganizationId,
    this.businessNameAr,
    this.businessNameEn,
    this.monthlyFee,
    this.startDate,
    this.endDate,
  });
  final String status;
  final String? tenantOrganizationId;
  final String? businessNameAr;
  final String? businessNameEn;
  final String? monthlyFee;
  final String? startDate;
  final String? endDate;
  Map<String, Object?> toJson() => {
    'status': status,
    'tenantOrganizationId': tenantOrganizationId,
    'businessNameAr': businessNameAr,
    'businessNameEn': businessNameEn,
    'monthlyFee': monthlyFee,
    'startDate': startDate,
    'endDate': endDate,
  };
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

int _requiredInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;
