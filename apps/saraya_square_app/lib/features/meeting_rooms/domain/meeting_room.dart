import 'package:saraya_square_app/core/network/api_error.dart';

final class MeetingRoomRecord {
  const MeetingRoomRecord({
    required this.id,
    required this.propertyId,
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.capacity,
    required this.hourlyRate,
    required this.openingTime,
    required this.closingTime,
    required this.minimumMinutes,
    required this.bookingIncrementMinutes,
    required this.status,
    this.descriptionAr,
    this.descriptionEn,
  });

  factory MeetingRoomRecord.fromJson(Map<String, Object?> json) =>
      MeetingRoomRecord(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        code: _requiredString(json, 'code'),
        nameAr: _requiredString(json, 'nameAr'),
        nameEn: _requiredString(json, 'nameEn'),
        descriptionAr: _optionalString(json['descriptionAr']),
        descriptionEn: _optionalString(json['descriptionEn']),
        capacity: _requiredInt(json, 'capacity'),
        hourlyRate: _requiredString(json, 'hourlyRate'),
        openingTime: _requiredString(json, 'openingTime'),
        closingTime: _requiredString(json, 'closingTime'),
        minimumMinutes: _requiredInt(json, 'minimumMinutes'),
        bookingIncrementMinutes: _requiredInt(json, 'bookingIncrementMinutes'),
        status: _requiredString(json, 'status'),
      );

  final String id;
  final String propertyId;
  final String code;
  final String nameAr;
  final String nameEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final int capacity;
  final String hourlyRate;
  final String openingTime;
  final String closingTime;
  final int minimumMinutes;
  final int bookingIncrementMinutes;
  final String status;
}

final class MeetingRoomInput {
  const MeetingRoomInput({
    required this.code,
    required this.nameAr,
    required this.nameEn,
    required this.capacity,
    required this.hourlyRate,
    required this.openingTime,
    required this.closingTime,
    required this.minimumMinutes,
    required this.bookingIncrementMinutes,
    required this.status,
    this.descriptionAr,
    this.descriptionEn,
  });
  factory MeetingRoomInput.fromRecord(MeetingRoomRecord room) =>
      MeetingRoomInput(
        code: room.code,
        nameAr: room.nameAr,
        nameEn: room.nameEn,
        descriptionAr: room.descriptionAr,
        descriptionEn: room.descriptionEn,
        capacity: room.capacity,
        hourlyRate: room.hourlyRate,
        openingTime: room.openingTime,
        closingTime: room.closingTime,
        minimumMinutes: room.minimumMinutes,
        bookingIncrementMinutes: room.bookingIncrementMinutes,
        status: room.status,
      );
  final String code;
  final String nameAr;
  final String nameEn;
  final String? descriptionAr;
  final String? descriptionEn;
  final int capacity;
  final String hourlyRate;
  final String openingTime;
  final String closingTime;
  final int minimumMinutes;
  final int bookingIncrementMinutes;
  final String status;
  Map<String, Object?> toJson() => {
    'code': code,
    'nameAr': nameAr,
    'nameEn': nameEn,
    'descriptionAr': descriptionAr,
    'descriptionEn': descriptionEn,
    'capacity': capacity,
    'hourlyRate': hourlyRate,
    'openingTime': openingTime,
    'closingTime': closingTime,
    'minimumMinutes': minimumMinutes,
    'bookingIncrementMinutes': bookingIncrementMinutes,
    'status': status,
  };
}

final class MeetingRoomBookingRecord {
  const MeetingRoomBookingRecord({
    required this.id,
    required this.propertyId,
    required this.roomId,
    required this.bookedByUserId,
    required this.status,
    required this.startAt,
    required this.endAt,
    required this.attendeeCount,
    required this.purpose,
    required this.amount,
    required this.currency,
    this.tenantOrganizationId,
    this.bookedByNameAr,
    this.bookedByNameEn,
    this.bookedByRole,
  });

  factory MeetingRoomBookingRecord.fromJson(Map<String, Object?> json) =>
      MeetingRoomBookingRecord(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        roomId: _requiredString(json, 'roomId'),
        bookedByUserId: _requiredString(json, 'bookedByUserId'),
        tenantOrganizationId: _optionalString(json['tenantOrganizationId']),
        status: _requiredString(json, 'status'),
        startAt: _requiredString(json, 'startAt'),
        endAt: _requiredString(json, 'endAt'),
        attendeeCount: _requiredInt(json, 'attendeeCount'),
        purpose: _requiredString(json, 'purpose'),
        amount: _requiredString(json, 'amount'),
        currency: _requiredString(json, 'currency'),
        bookedByNameAr: _optionalString(json['bookedByNameAr']),
        bookedByNameEn: _optionalString(json['bookedByNameEn']),
        bookedByRole: _optionalString(json['bookedByRole']),
      );

  final String id;
  final String propertyId;
  final String roomId;
  final String bookedByUserId;
  final String? tenantOrganizationId;
  final String status;
  final String startAt;
  final String endAt;
  final int attendeeCount;
  final String purpose;
  final String amount;
  final String currency;
  final String? bookedByNameAr;
  final String? bookedByNameEn;
  final String? bookedByRole;
}

final class MeetingRoomBookingTarget {
  const MeetingRoomBookingTarget({
    required this.userId,
    required this.role,
    required this.displayNameAr,
    required this.displayNameEn,
    this.tenantOrganizationId,
  });

  factory MeetingRoomBookingTarget.fromJson(Map<String, Object?> json) =>
      MeetingRoomBookingTarget(
        userId: _requiredString(json, 'userId'),
        role: _requiredString(json, 'role'),
        displayNameAr: _requiredString(json, 'displayNameAr'),
        displayNameEn: _requiredString(json, 'displayNameEn'),
        tenantOrganizationId: _optionalString(json['tenantOrganizationId']),
      );

  final String userId;
  final String role;
  final String displayNameAr;
  final String displayNameEn;
  final String? tenantOrganizationId;
}

final class MeetingRoomBookingInput {
  const MeetingRoomBookingInput({
    required this.roomId,
    required this.startAt,
    required this.endAt,
    required this.attendeeCount,
    required this.purpose,
    required this.idempotencyKey,
    this.bookedForUserId,
  });
  final String roomId;
  final String startAt;
  final String endAt;
  final int attendeeCount;
  final String purpose;
  final String idempotencyKey;
  final String? bookedForUserId;
  Map<String, Object> toJson() => {
    'roomId': roomId,
    'startAt': startAt,
    'endAt': endAt,
    'attendeeCount': attendeeCount,
    'purpose': purpose,
    'idempotencyKey': idempotencyKey,
    'bookedForUserId': ?bookedForUserId,
  };
}

enum MeetingRoomBookingDecision { confirm, reject, cancel, complete }

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
