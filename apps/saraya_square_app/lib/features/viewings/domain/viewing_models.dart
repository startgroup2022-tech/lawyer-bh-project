import 'package:saraya_square_app/core/network/api_error.dart';

enum ViewingSlotStatus { active, disabled, cancelled }

enum ViewingAppointmentStatus { confirmed, completed, noShow, cancelled }

final class PublicViewingSlot {
  const PublicViewingSlot({
    required this.id,
    required this.startAt,
    required this.endAt,
    required this.remainingCapacity,
    this.instructionsAr,
    this.instructionsEn,
  });

  factory PublicViewingSlot.fromJson(Map<String, Object?> json) =>
      PublicViewingSlot(
        id: _requiredString(json, 'id'),
        startAt: _requiredDate(json, 'startAt'),
        endAt: _requiredDate(json, 'endAt'),
        remainingCapacity: _requiredInt(json, 'remainingCapacity'),
        instructionsAr: _optionalString(json['instructionsAr']),
        instructionsEn: _optionalString(json['instructionsEn']),
      );

  final String id;
  final DateTime startAt;
  final DateTime endAt;
  final int remainingCapacity;
  final String? instructionsAr;
  final String? instructionsEn;
}

final class PublicViewingAppointmentInput {
  const PublicViewingAppointmentInput({
    required this.propertyId,
    required this.unitId,
    required this.slotId,
    required this.visitorName,
    required this.visitorPhone,
    required this.visitorEmail,
    required this.locale,
  });

  final String propertyId;
  final String unitId;
  final String slotId;
  final String visitorName;
  final String visitorPhone;
  final String visitorEmail;
  final String locale;

  Map<String, Object?> toJson(String idempotencyKey) => {
    'propertyId': propertyId,
    'unitId': unitId,
    'slotId': slotId,
    'visitorName': visitorName.trim(),
    'visitorPhone': visitorPhone.trim(),
    'visitorEmail': visitorEmail.trim(),
    'locale': locale,
    'idempotencyKey': idempotencyKey,
  };
}

final class ViewingAppointmentConfirmation {
  const ViewingAppointmentConfirmation({
    required this.reference,
    required this.status,
    required this.startAt,
    required this.endAt,
  });

  factory ViewingAppointmentConfirmation.fromJson(Map<String, Object?> json) =>
      ViewingAppointmentConfirmation(
        reference: _requiredString(json, 'reference'),
        status: _appointmentStatus(json['status']),
        startAt: _requiredDate(json, 'startAt'),
        endAt: _requiredDate(json, 'endAt'),
      );

  final String reference;
  final ViewingAppointmentStatus status;
  final DateTime startAt;
  final DateTime endAt;
}

final class ViewingSlotInput {
  const ViewingSlotInput({
    required this.startAt,
    required this.endAt,
    required this.capacity,
    this.unitId,
    this.instructionsAr,
    this.instructionsEn,
  });

  final DateTime startAt;
  final DateTime endAt;
  final int capacity;
  final String? unitId;
  final String? instructionsAr;
  final String? instructionsEn;

  Map<String, Object?> toJson(String idempotencyKey) => {
    if (unitId != null) 'unitId': unitId,
    'startAt': startAt.toUtc().toIso8601String(),
    'endAt': endAt.toUtc().toIso8601String(),
    'capacity': capacity,
    if (instructionsAr != null) 'instructionsAr': instructionsAr,
    if (instructionsEn != null) 'instructionsEn': instructionsEn,
    'idempotencyKey': idempotencyKey,
  };
}

final class ViewingSlotUpdate {
  const ViewingSlotUpdate({
    this.startAt,
    this.endAt,
    this.capacity,
    this.status,
    this.instructionsAr,
    this.instructionsEn,
  });

  final DateTime? startAt;
  final DateTime? endAt;
  final int? capacity;
  final ViewingSlotStatus? status;
  final String? instructionsAr;
  final String? instructionsEn;

  Map<String, Object?> toJson(String idempotencyKey) => {
    if (startAt != null) 'startAt': startAt!.toUtc().toIso8601String(),
    if (endAt != null) 'endAt': endAt!.toUtc().toIso8601String(),
    if (capacity != null) 'capacity': capacity,
    if (status != null) 'status': viewingSlotStatusValue(status!),
    if (instructionsAr != null) 'instructionsAr': instructionsAr,
    if (instructionsEn != null) 'instructionsEn': instructionsEn,
    'idempotencyKey': idempotencyKey,
  };
}

final class ViewingSlot {
  const ViewingSlot({
    required this.id,
    required this.propertyId,
    required this.startAt,
    required this.endAt,
    required this.capacity,
    required this.bookedCount,
    required this.status,
    this.unitId,
    this.instructionsAr,
    this.instructionsEn,
  });

  factory ViewingSlot.fromJson(Map<String, Object?> json) => ViewingSlot(
    id: _requiredString(json, 'id'),
    propertyId: _requiredString(json, 'propertyId'),
    unitId: _optionalString(json['unitId']),
    startAt: _requiredDate(json, 'startAt'),
    endAt: _requiredDate(json, 'endAt'),
    capacity: _requiredInt(json, 'capacity'),
    bookedCount: _requiredInt(json, 'bookedCount'),
    status: _slotStatus(json['status']),
    instructionsAr: _optionalString(json['instructionsAr']),
    instructionsEn: _optionalString(json['instructionsEn']),
  );

  final String id;
  final String propertyId;
  final String? unitId;
  final DateTime startAt;
  final DateTime endAt;
  final int capacity;
  final int bookedCount;
  final ViewingSlotStatus status;
  final String? instructionsAr;
  final String? instructionsEn;
}

final class ViewingAppointment {
  const ViewingAppointment({
    required this.id,
    required this.propertyId,
    required this.unitId,
    required this.slotId,
    required this.reference,
    required this.visitorName,
    required this.visitorPhone,
    required this.visitorEmail,
    required this.locale,
    required this.status,
    required this.startAt,
    required this.endAt,
  });

  factory ViewingAppointment.fromJson(Map<String, Object?> json) =>
      ViewingAppointment(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        unitId: _requiredString(json, 'unitId'),
        slotId: _requiredString(json, 'slotId'),
        reference: _requiredString(json, 'reference'),
        visitorName: _requiredString(json, 'visitorName'),
        visitorPhone: _requiredString(json, 'visitorPhone'),
        visitorEmail: _requiredString(json, 'visitorEmail'),
        locale: _requiredString(json, 'locale'),
        status: _appointmentStatus(json['status']),
        startAt: _requiredDate(json, 'startAt'),
        endAt: _requiredDate(json, 'endAt'),
      );

  final String id;
  final String propertyId;
  final String unitId;
  final String slotId;
  final String reference;
  final String visitorName;
  final String visitorPhone;
  final String visitorEmail;
  final String locale;
  final ViewingAppointmentStatus status;
  final DateTime startAt;
  final DateTime endAt;

  ViewingAppointment copyWith({ViewingAppointmentStatus? status}) =>
      ViewingAppointment(
        id: id,
        propertyId: propertyId,
        unitId: unitId,
        slotId: slotId,
        reference: reference,
        visitorName: visitorName,
        visitorPhone: visitorPhone,
        visitorEmail: visitorEmail,
        locale: locale,
        status: status ?? this.status,
        startAt: startAt,
        endAt: endAt,
      );
}

String viewingAppointmentStatusValue(ViewingAppointmentStatus status) =>
    switch (status) {
      ViewingAppointmentStatus.confirmed => 'confirmed',
      ViewingAppointmentStatus.completed => 'completed',
      ViewingAppointmentStatus.noShow => 'no_show',
      ViewingAppointmentStatus.cancelled => 'cancelled',
    };

String viewingSlotStatusValue(ViewingSlotStatus status) => switch (status) {
  ViewingSlotStatus.active => 'active',
  ViewingSlotStatus.disabled => 'disabled',
  ViewingSlotStatus.cancelled => 'cancelled',
};

ViewingAppointmentStatus _appointmentStatus(Object? value) => switch (value) {
  'confirmed' => ViewingAppointmentStatus.confirmed,
  'completed' => ViewingAppointmentStatus.completed,
  'no_show' => ViewingAppointmentStatus.noShow,
  'cancelled' => ViewingAppointmentStatus.cancelled,
  _ => throw ApiError.invalidResponse(200),
};

ViewingSlotStatus _slotStatus(Object? value) => switch (value) {
  'active' => ViewingSlotStatus.active,
  'disabled' => ViewingSlotStatus.disabled,
  'cancelled' => ViewingSlotStatus.cancelled,
  _ => throw ApiError.invalidResponse(200),
};

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) throw ApiError.invalidResponse(200);
  return value;
}

DateTime _requiredDate(Map<String, Object?> json, String key) {
  final value = json[key];
  final date = value is String ? DateTime.tryParse(value) : null;
  if (date == null) throw ApiError.invalidResponse(200);
  return date;
}

int _requiredInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! int) throw ApiError.invalidResponse(200);
  return value;
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;
