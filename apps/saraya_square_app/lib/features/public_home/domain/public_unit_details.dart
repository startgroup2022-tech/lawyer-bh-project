import 'public_home_inventory.dart';

final class PublicUnitDetails {
  const PublicUnitDetails({
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

  factory PublicUnitDetails.fromListing(PublicUnitListing listing) =>
      PublicUnitDetails(
        id: listing.id,
        propertyId: listing.propertyId,
        propertyNameAr: listing.propertyNameAr,
        propertyNameEn: listing.propertyNameEn,
        unitNumber: listing.unitNumber,
        unitType: listing.unitType,
        displayNameAr: listing.displayNameAr,
        displayNameEn: listing.displayNameEn,
        descriptionAr: listing.descriptionAr,
        descriptionEn: listing.descriptionEn,
        imageKey: listing.imageKey,
        status: listing.status,
        floor: listing.floor,
        marketRent: listing.marketRent,
        areaSquareMeters: listing.areaSquareMeters,
        availableFrom: listing.availableFrom,
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
  final String status;
  final String? floor;
  final String? marketRent;
  final String? areaSquareMeters;
  final String? availableFrom;
}
