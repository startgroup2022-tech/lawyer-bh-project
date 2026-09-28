import 'package:saraya_square_app/core/network/api_error.dart';

enum ManagementResource { properties, units, tenants, owners, staff }

extension ManagementResourceApi on ManagementResource {
  String get apiName => name;
}

final class ManagementQuery {
  const ManagementQuery({
    required this.propertyId,
    this.cursor,
    this.limit = 25,
    this.search,
    this.status,
    this.role,
  });

  final String propertyId;
  final String? cursor;
  final int limit;
  final String? search;
  final String? status;
  final String? role;

  ManagementQuery copyWith({
    String? cursor,
    bool clearCursor = false,
    String? search,
    bool clearSearch = false,
    String? status,
    bool clearStatus = false,
    String? role,
    bool clearRole = false,
  }) {
    return ManagementQuery(
      propertyId: propertyId,
      cursor: clearCursor ? null : cursor ?? this.cursor,
      limit: limit,
      search: clearSearch ? null : search ?? this.search,
      status: clearStatus ? null : status ?? this.status,
      role: clearRole ? null : role ?? this.role,
    );
  }
}

final class ManagementPage<T extends ManagementRecord> {
  const ManagementPage({required this.items, required this.nextCursor});

  final List<T> items;
  final String? nextCursor;
}

sealed class ManagementRecord {
  const ManagementRecord({required this.id});

  final String id;

  String displayName(bool isArabic);
}

final class PropertyRecord extends ManagementRecord {
  const PropertyRecord({
    required super.id,
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.isActive,
    this.addressAr,
    this.addressEn,
    this.timezone,
    this.currencyCode,
    this.rentalApprovalMode = 'owner_review',
  });

  factory PropertyRecord.fromJson(Map<String, Object?> json) => PropertyRecord(
    id: _requiredString(json, 'id'),
    code: _requiredString(json, 'code'),
    nameAr: _requiredString(json, 'nameAr'),
    nameEn: _requiredString(json, 'nameEn'),
    addressAr: _optionalString(json['addressAr']),
    addressEn: _optionalString(json['addressEn']),
    timezone: _optionalString(json['timezone']),
    currencyCode: _optionalString(json['currencyCode']),
    isActive: _requiredBool(json, 'isActive'),
    rentalApprovalMode:
        _optionalString(json['rentalApprovalMode']) ?? 'owner_review',
  );

  final String code;
  final String nameAr;
  final String nameEn;
  final String? addressAr;
  final String? addressEn;
  final String? timezone;
  final String? currencyCode;
  final bool isActive;
  final String rentalApprovalMode;

  @override
  String displayName(bool isArabic) => isArabic ? nameAr : nameEn;
}

final class UnitRecord extends ManagementRecord {
  const UnitRecord({
    required super.id,
    required this.unitNumber,
    required this.status,
    this.propertyId,
    this.unitTypeId,
    this.ownerId,
    this.floor,
    this.areaSquareMeters,
    this.marketRent,
    this.availableFrom,
    this.rentalApprovalOverride,
    this.resolvedRentalApprovalMode = 'owner_review',
  });

  factory UnitRecord.fromJson(Map<String, Object?> json) => UnitRecord(
    id: _requiredString(json, 'id'),
    propertyId: _optionalString(json['propertyId']),
    unitTypeId: _optionalString(json['unitTypeId']),
    ownerId: _optionalString(json['ownerId']),
    unitNumber: _requiredString(json, 'unitNumber'),
    floor: _optionalString(json['floor']),
    status: _requiredString(json, 'status'),
    areaSquareMeters: _optionalString(json['areaSquareMeters']),
    marketRent: _optionalString(json['marketRent']),
    availableFrom: _optionalString(json['availableFrom']),
    rentalApprovalOverride: _optionalString(json['rentalApprovalOverride']),
    resolvedRentalApprovalMode:
        _optionalString(json['resolvedRentalApprovalMode']) ?? 'owner_review',
  );

  final String? propertyId;
  final String? unitTypeId;
  final String? ownerId;
  final String unitNumber;
  final String? floor;
  final String status;
  final String? areaSquareMeters;
  final String? marketRent;
  final String? availableFrom;
  final String? rentalApprovalOverride;
  final String resolvedRentalApprovalMode;

  @override
  String displayName(bool isArabic) => unitNumber;
}

final class TenantRecord extends ManagementRecord {
  const TenantRecord({
    required super.id,
    required this.nameAr,
    required this.nameEn,
    required this.isActive,
    this.propertyId,
    this.registrationNumber,
    this.taxNumber,
  });

  factory TenantRecord.fromJson(Map<String, Object?> json) => TenantRecord(
    id: _requiredString(json, 'id'),
    propertyId: _optionalString(json['propertyId']),
    nameAr: _requiredString(json, 'nameAr'),
    nameEn: _requiredString(json, 'nameEn'),
    registrationNumber: _optionalString(json['registrationNumber']),
    taxNumber: _optionalString(json['taxNumber']),
    isActive: _requiredBool(json, 'isActive'),
  );

  final String? propertyId;
  final String nameAr;
  final String nameEn;
  final String? registrationNumber;
  final String? taxNumber;
  final bool isActive;

  @override
  String displayName(bool isArabic) => isArabic ? nameAr : nameEn;
}

final class OwnerRecord extends ManagementRecord {
  const OwnerRecord({
    required super.id,
    required this.nameAr,
    required this.nameEn,
    this.propertyId,
    this.registrationNumber,
  });

  factory OwnerRecord.fromJson(Map<String, Object?> json) => OwnerRecord(
    id: _requiredString(json, 'id'),
    propertyId: _optionalString(json['propertyId']),
    nameAr: _requiredString(json, 'nameAr'),
    nameEn: _requiredString(json, 'nameEn'),
    registrationNumber: _optionalString(json['registrationNumber']),
  );

  final String? propertyId;
  final String nameAr;
  final String nameEn;
  final String? registrationNumber;

  @override
  String displayName(bool isArabic) => isArabic ? nameAr : nameEn;
}

final class StaffRecord extends ManagementRecord {
  const StaffRecord({
    required super.id,
    required this.userId,
    required this.displayNameAr,
    required this.displayNameEn,
    required this.role,
    required this.isActive,
    this.email,
    this.phone,
  });

  factory StaffRecord.fromJson(Map<String, Object?> json) => StaffRecord(
    id: _requiredString(json, 'id'),
    userId: _requiredString(json, 'userId'),
    displayNameAr: _requiredString(json, 'displayNameAr'),
    displayNameEn: _requiredString(json, 'displayNameEn'),
    email: _optionalString(json['email']),
    phone: _optionalString(json['phone']),
    role: _requiredString(json, 'role'),
    isActive: _requiredBool(json, 'isActive'),
  );

  final String userId;
  final String displayNameAr;
  final String displayNameEn;
  final String? email;
  final String? phone;
  final String role;
  final bool isActive;

  @override
  String displayName(bool isArabic) => isArabic ? displayNameAr : displayNameEn;
}

sealed class ManagementInput {
  const ManagementInput();

  Map<String, Object?> toJson();
}

final class PropertyInput extends ManagementInput {
  const PropertyInput({
    this.code,
    this.nameAr,
    this.nameEn,
    this.addressAr,
    this.addressEn,
    this.timezone,
    this.currencyCode,
    this.isActive,
    this.rentalApprovalMode,
  });

  final String? code;
  final String? nameAr;
  final String? nameEn;
  final String? addressAr;
  final String? addressEn;
  final String? timezone;
  final String? currencyCode;
  final bool? isActive;
  final String? rentalApprovalMode;

  @override
  Map<String, Object?> toJson() => _compact({
    'code': code,
    'nameAr': nameAr,
    'nameEn': nameEn,
    'addressAr': addressAr,
    'addressEn': addressEn,
    'timezone': timezone,
    'currencyCode': currencyCode,
    'isActive': isActive,
    'rentalApprovalMode': rentalApprovalMode,
  });
}

final class UnitInput extends ManagementInput {
  const UnitInput({
    this.unitTypeId,
    this.ownerId,
    this.unitNumber,
    this.floor,
    this.status,
    this.areaSquareMeters,
    this.marketRent,
    this.availableFrom,
    this.rentalApprovalOverride,
  });

  final String? unitTypeId;
  final String? ownerId;
  final String? unitNumber;
  final String? floor;
  final String? status;
  final String? areaSquareMeters;
  final String? marketRent;
  final String? availableFrom;
  final String? rentalApprovalOverride;

  @override
  Map<String, Object?> toJson() => Map.unmodifiable({
    ..._compact({
      'unitTypeId': unitTypeId,
      'ownerId': ownerId,
      'unitNumber': unitNumber,
      'floor': floor,
      'status': status,
      'areaSquareMeters': areaSquareMeters,
      'marketRent': marketRent,
      'availableFrom': availableFrom,
    }),
    'rentalApprovalOverride': rentalApprovalOverride,
  });
}

final class TenantInput extends ManagementInput {
  const TenantInput({
    this.nameAr,
    this.nameEn,
    this.registrationNumber,
    this.taxNumber,
    this.isActive,
  });

  final String? nameAr;
  final String? nameEn;
  final String? registrationNumber;
  final String? taxNumber;
  final bool? isActive;

  @override
  Map<String, Object?> toJson() => _compact({
    'nameAr': nameAr,
    'nameEn': nameEn,
    'registrationNumber': registrationNumber,
    'taxNumber': taxNumber,
    'isActive': isActive,
  });
}

final class OwnerInput extends ManagementInput {
  const OwnerInput({this.nameAr, this.nameEn, this.registrationNumber});

  final String? nameAr;
  final String? nameEn;
  final String? registrationNumber;

  @override
  Map<String, Object?> toJson() => _compact({
    'nameAr': nameAr,
    'nameEn': nameEn,
    'registrationNumber': registrationNumber,
  });
}

final class StaffInput extends ManagementInput {
  const StaffInput({this.identity, this.role, this.isActive});

  final String? identity;
  final String? role;
  final bool? isActive;

  @override
  Map<String, Object?> toJson() =>
      _compact({'identity': identity, 'role': role, 'isActive': isActive});
}

Map<String, Object?> _compact(Map<String, Object?> values) => Map.unmodifiable(
  Map<String, Object?>.fromEntries(
    values.entries.where((entry) => entry.value != null),
  ),
);

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

bool _requiredBool(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is bool) return value;
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;
