import 'package:saraya_square_app/core/network/api_error.dart';

final class PublicHomeInventory {
  const PublicHomeInventory({
    required this.units,
    required this.virtualAddresses,
  });

  factory PublicHomeInventory.fromJson(Map<String, Object?> json) {
    final rawUnits = json['units'];
    final rawVirtualAddresses = json['virtualAddresses'];
    if (rawUnits is! List || rawVirtualAddresses is! Map) {
      throw ApiError.invalidResponse(200);
    }
    return PublicHomeInventory(
      units: List.unmodifiable(
        rawUnits.map((item) {
          if (item is! Map) throw ApiError.invalidResponse(200);
          return PublicUnitListing.fromJson(Map<String, Object?>.from(item));
        }),
      ),
      virtualAddresses: PublicVirtualAddressSummary.fromJson(
        Map<String, Object?>.from(rawVirtualAddresses),
      ),
    );
  }

  final List<PublicUnitListing> units;
  final PublicVirtualAddressSummary virtualAddresses;
}

final class PublicUnitListing {
  const PublicUnitListing({
    required this.id,
    required this.propertyId,
    required this.propertyNameAr,
    required this.propertyNameEn,
    required this.unitNumber,
    required this.unitType,
    required this.displayNameAr,
    required this.displayNameEn,
    required this.descriptionAr,
    required this.descriptionEn,
    required this.imageKey,
    required this.status,
    this.floor,
    this.marketRent,
    this.areaSquareMeters,
    this.availableFrom,
  });

  factory PublicUnitListing.fromJson(Map<String, Object?> json) =>
      PublicUnitListing(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        propertyNameAr: _requiredString(json, 'propertyNameAr'),
        propertyNameEn: _requiredString(json, 'propertyNameEn'),
        unitNumber: _requiredString(json, 'unitNumber'),
        unitType: _requiredString(json, 'unitType'),
        displayNameAr: _requiredString(json, 'displayNameAr'),
        displayNameEn: _requiredString(json, 'displayNameEn'),
        descriptionAr: _requiredString(json, 'descriptionAr'),
        descriptionEn: _requiredString(json, 'descriptionEn'),
        imageKey: _requiredString(json, 'imageKey'),
        floor: _optionalString(json['floor']),
        marketRent: _optionalString(json['marketRent']),
        areaSquareMeters: _optionalString(json['areaSquareMeters']),
        availableFrom: _optionalString(json['availableFrom']),
        status: _requiredString(json, 'status'),
      );

  final String id;
  final String propertyId;
  final String propertyNameAr;
  final String propertyNameEn;
  final String unitNumber;
  final String unitType;
  final String displayNameAr;
  final String displayNameEn;
  final String descriptionAr;
  final String descriptionEn;
  final String imageKey;
  final String? floor;
  final String? marketRent;
  final String? areaSquareMeters;
  final String? availableFrom;
  final String status;
}

final class PublicVirtualAddressSummary {
  const PublicVirtualAddressSummary({
    required this.total,
    required this.available,
  });

  factory PublicVirtualAddressSummary.fromJson(Map<String, Object?> json) =>
      PublicVirtualAddressSummary(
        total: _requiredInt(json, 'total'),
        available: _requiredInt(json, 'available'),
      );

  final int total;
  final int available;
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;

int _requiredInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int && value >= 0) return value;
  throw ApiError.invalidResponse(200);
}
