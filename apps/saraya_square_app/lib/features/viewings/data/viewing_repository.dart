import 'dart:math';

import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';

typedef IdempotencyKeyFactory = String Function();

abstract interface class ViewingRepository {
  Future<List<PublicViewingSlot>> listPublicSlots(String unitId);
  Future<ViewingAppointmentConfirmation> bookPublicAppointment(
    PublicViewingAppointmentInput input,
  );
  Future<List<ViewingAppointment>> listAppointments(String propertyId);
  Future<List<ViewingSlot>> listSlots(String propertyId);
  Future<ViewingSlot> createSlot(String propertyId, ViewingSlotInput input);
  Future<ViewingSlot> updateSlot(
    String propertyId,
    String slotId,
    ViewingSlotUpdate input,
  );
  Future<ViewingAppointment> updateAppointmentStatus(
    String propertyId,
    String appointmentId,
    ViewingAppointmentStatus status,
  );
}

class EmptyViewingRepository implements ViewingRepository {
  const EmptyViewingRepository();

  @override
  Future<List<PublicViewingSlot>> listPublicSlots(String unitId) async =>
      const [];

  @override
  Future<ViewingAppointmentConfirmation> bookPublicAppointment(
    PublicViewingAppointmentInput input,
  ) => throw UnsupportedError('Viewing booking is unavailable.');

  @override
  Future<List<ViewingAppointment>> listAppointments(String propertyId) async =>
      const [];

  @override
  Future<List<ViewingSlot>> listSlots(String propertyId) async => const [];

  @override
  Future<ViewingSlot> createSlot(String propertyId, ViewingSlotInput input) =>
      throw UnsupportedError('Viewing slot creation is unavailable.');

  @override
  Future<ViewingSlot> updateSlot(
    String propertyId,
    String slotId,
    ViewingSlotUpdate input,
  ) => throw UnsupportedError('Viewing slot editing is unavailable.');

  @override
  Future<ViewingAppointment> updateAppointmentStatus(
    String propertyId,
    String appointmentId,
    ViewingAppointmentStatus status,
  ) => throw UnsupportedError('Viewing status updates are unavailable.');
}

final class ApiViewingRepository implements ViewingRepository {
  ApiViewingRepository(
    this._apiClient, {
    IdempotencyKeyFactory? idempotencyKeyFactory,
  }) : _idempotencyKeyFactory = idempotencyKeyFactory ?? _defaultIdempotencyKey;

  final SarayaApiClient _apiClient;
  final IdempotencyKeyFactory _idempotencyKeyFactory;
  final Map<String, String> _pendingBookingKeys = {};

  @override
  Future<List<PublicViewingSlot>> listPublicSlots(String unitId) async {
    final response = await _apiClient.getJson(
      '/api/saraya/v1/public/units/${Uri.encodeComponent(unitId)}/viewing-slots',
    );
    return _items(response, PublicViewingSlot.fromJson);
  }

  @override
  Future<ViewingAppointmentConfirmation> bookPublicAppointment(
    PublicViewingAppointmentInput input,
  ) async {
    final action = _bookingActionKey(input);
    final key = _pendingBookingKeys.putIfAbsent(action, _idempotencyKeyFactory);
    final response = await _apiClient.postJson(
      '/api/saraya/v1/public/viewing-appointments',
      data: input.toJson(key),
    );
    final confirmation = ViewingAppointmentConfirmation.fromJson(
      _object(response),
    );
    if (_pendingBookingKeys[action] == key) {
      _pendingBookingKeys.remove(action);
    }
    return confirmation;
  }

  @override
  Future<List<ViewingSlot>> listSlots(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/viewing-slots',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    return _items(response, ViewingSlot.fromJson);
  }

  @override
  Future<List<ViewingAppointment>> listAppointments(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/viewing-appointments',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    return _items(response, ViewingAppointment.fromJson);
  }

  @override
  Future<ViewingSlot> createSlot(
    String propertyId,
    ViewingSlotInput input,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.postJson(
      '/api/saraya/v1/viewing-slots?$query',
      data: input.toJson(_idempotencyKeyFactory()),
    );
    return ViewingSlot.fromJson(_object(response));
  }

  @override
  Future<ViewingSlot> updateSlot(
    String propertyId,
    String slotId,
    ViewingSlotUpdate input,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.patchJson(
      '/api/saraya/v1/viewing-slots/${Uri.encodeComponent(slotId)}?$query',
      data: input.toJson(_idempotencyKeyFactory()),
    );
    return ViewingSlot.fromJson(_object(response));
  }

  @override
  Future<ViewingAppointment> updateAppointmentStatus(
    String propertyId,
    String appointmentId,
    ViewingAppointmentStatus status,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.patchJson(
      '/api/saraya/v1/viewing-appointments/${Uri.encodeComponent(appointmentId)}?$query',
      data: {
        'status': viewingAppointmentStatusValue(status),
        'idempotencyKey': _idempotencyKeyFactory(),
      },
    );
    return ViewingAppointment.fromJson(_object(response));
  }
}

List<T> _items<T>(Object? response, T Function(Map<String, Object?>) parse) {
  final payload = _object(response);
  final items = payload['items'];
  if (items is! List) throw ApiError.invalidResponse(200);
  return List.unmodifiable(
    items.map((item) {
      if (item is! Map) throw ApiError.invalidResponse(200);
      return parse(Map<String, Object?>.from(item));
    }),
  );
}

Map<String, Object?> _object(Object? value) {
  if (value is! Map) throw ApiError.invalidResponse(200);
  return Map<String, Object?>.from(value);
}

String _defaultIdempotencyKey() {
  final random = Random.secure();
  final suffix = List.generate(
    4,
    (_) => random.nextInt(0x10000).toRadixString(16).padLeft(4, '0'),
  ).join();
  return 'saraya-${DateTime.now().microsecondsSinceEpoch}-$suffix';
}

String _bookingActionKey(PublicViewingAppointmentInput input) => [
  input.propertyId,
  input.unitId,
  input.slotId,
  input.visitorName.trim(),
  input.visitorPhone.trim(),
  input.visitorEmail.trim().toLowerCase(),
  input.locale,
].join('\u0000');
