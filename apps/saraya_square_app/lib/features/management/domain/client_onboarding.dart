import 'package:saraya_square_app/core/network/api_error.dart';

final class OnboardingProperty {
  const OnboardingProperty({
    required this.id,
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.currencyCode,
  });
  factory OnboardingProperty.fromJson(Map<String, Object?> json) =>
      OnboardingProperty(
        id: _requiredString(json, 'id'),
        code: _requiredString(json, 'code'),
        nameAr: _requiredString(json, 'nameAr'),
        nameEn: _requiredString(json, 'nameEn'),
        currencyCode: _requiredString(json, 'currencyCode'),
      );
  final String id;
  final String code;
  final String nameAr;
  final String nameEn;
  final String currencyCode;
}

final class OnboardingUnit {
  const OnboardingUnit({
    required this.id,
    required this.propertyId,
    required this.unitNumber,
    this.displayNameAr,
    this.displayNameEn,
    this.marketRent,
  });
  factory OnboardingUnit.fromJson(Map<String, Object?> json) => OnboardingUnit(
    id: _requiredString(json, 'id'),
    propertyId: _requiredString(json, 'propertyId'),
    unitNumber: _requiredString(json, 'unitNumber'),
    displayNameAr: _optionalString(json['displayNameAr']),
    displayNameEn: _optionalString(json['displayNameEn']),
    marketRent: _optionalString(json['marketRent']),
  );
  final String id;
  final String propertyId;
  final String unitNumber;
  final String? displayNameAr;
  final String? displayNameEn;
  final String? marketRent;
}

final class OnboardingVirtualAddress {
  const OnboardingVirtualAddress({
    required this.id,
    required this.propertyId,
    required this.code,
    required this.slotNumber,
    this.monthlyFee,
  });
  factory OnboardingVirtualAddress.fromJson(Map<String, Object?> json) =>
      OnboardingVirtualAddress(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        code: _requiredString(json, 'code'),
        slotNumber: _requiredInt(json, 'slotNumber'),
        monthlyFee: _optionalString(json['monthlyFee']),
      );
  final String id;
  final String propertyId;
  final String code;
  final int slotNumber;
  final String? monthlyFee;
}

final class ClientOnboardingOptions {
  const ClientOnboardingOptions({
    required this.properties,
    this.units = const [],
    this.virtualAddresses = const [],
  });
  factory ClientOnboardingOptions.fromJson(Map<String, Object?> json) =>
      ClientOnboardingOptions(
        properties: _list(json, 'properties', OnboardingProperty.fromJson),
        units: _list(json, 'units', OnboardingUnit.fromJson),
        virtualAddresses: _list(
          json,
          'virtualAddresses',
          OnboardingVirtualAddress.fromJson,
        ),
      );
  final List<OnboardingProperty> properties;
  final List<OnboardingUnit> units;
  final List<OnboardingVirtualAddress> virtualAddresses;
}

final class TenantUnitSelection {
  const TenantUnitSelection({
    required this.unitId,
    required this.startDate,
    required this.endDate,
    required this.rentAmount,
    required this.depositAmount,
    required this.frequency,
    required this.dueDay,
    required this.graceDays,
  });
  final String unitId;
  final String startDate;
  final String endDate;
  final String rentAmount;
  final String depositAmount;
  final String frequency;
  final int dueDay;
  final int graceDays;
  Map<String, Object> toJson() => {
    'unitId': unitId,
    'startDate': startDate,
    'endDate': endDate,
    'rentAmount': rentAmount,
    'depositAmount': depositAmount,
    'frequency': frequency,
    'dueDay': dueDay,
    'graceDays': graceDays,
  };
}

final class TenantVirtualAddressSelection {
  const TenantVirtualAddressSelection({
    required this.virtualAddressId,
    required this.businessNameAr,
    required this.businessNameEn,
    required this.monthlyFee,
    required this.startDate,
    required this.endDate,
  });
  final String virtualAddressId;
  final String businessNameAr;
  final String businessNameEn;
  final String monthlyFee;
  final String startDate;
  final String endDate;
  Map<String, Object> toJson() => {
    'virtualAddressId': virtualAddressId,
    'businessNameAr': businessNameAr,
    'businessNameEn': businessNameEn,
    'monthlyFee': monthlyFee,
    'startDate': startDate,
    'endDate': endDate,
  };
}

final class TenantOnboardingInput {
  const TenantOnboardingInput({
    required this.propertyId,
    required this.nameAr,
    required this.nameEn,
    required this.units,
    required this.virtualAddresses,
    this.registrationNumber,
    this.taxNumber,
  });
  final String propertyId;
  final String nameAr;
  final String nameEn;
  final String? registrationNumber;
  final String? taxNumber;
  final List<TenantUnitSelection> units;
  final List<TenantVirtualAddressSelection> virtualAddresses;
  Map<String, Object?> toJson() => {
    'propertyId': propertyId,
    'nameAr': nameAr,
    'nameEn': nameEn,
    if (registrationNumber != null) 'registrationNumber': registrationNumber,
    if (taxNumber != null) 'taxNumber': taxNumber,
    'units': units.map((item) => item.toJson()).toList(),
    'virtualAddresses': virtualAddresses.map((item) => item.toJson()).toList(),
  };
}

final class OwnerOnboardingInput {
  const OwnerOnboardingInput({
    required this.propertyIds,
    required this.nameAr,
    required this.nameEn,
    this.registrationNumber,
  });
  final List<String> propertyIds;
  final String nameAr;
  final String nameEn;
  final String? registrationNumber;
  Map<String, Object?> toJson() => {
    'propertyIds': propertyIds,
    'nameAr': nameAr,
    'nameEn': nameEn,
    if (registrationNumber != null) 'registrationNumber': registrationNumber,
  };
}

List<T> _list<T>(
  Map<String, Object?> json,
  String key,
  T Function(Map<String, Object?>) parse,
) {
  final value = json[key];
  if (value == null) return const [];
  if (value is! List) throw ApiError.invalidResponse(200);
  return List.unmodifiable(
    value.map((item) {
      if (item is! Map) throw ApiError.invalidResponse(200);
      return parse(Map<String, Object?>.from(item));
    }),
  );
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
