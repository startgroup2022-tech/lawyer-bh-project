import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/meeting_rooms/domain/meeting_room.dart';

abstract interface class MeetingRoomRepository {
  Future<List<MeetingRoomRecord>> list(String propertyId);
  Future<MeetingRoomRecord> create(String propertyId, MeetingRoomInput input);
  Future<MeetingRoomRecord> update(
    String propertyId,
    String id,
    MeetingRoomInput input,
  );
  Future<List<MeetingRoomBookingRecord>> listBookings(String propertyId);
  Future<List<MeetingRoomBookingTarget>> bookingTargets(String propertyId);
  Future<MeetingRoomBookingRecord> createBooking(
    String propertyId,
    MeetingRoomBookingInput input,
  );
  Future<MeetingRoomBookingRecord> decideBooking(
    String propertyId,
    String bookingId,
    MeetingRoomBookingDecision decision, {
    String? reason,
  });
}

final class EmptyMeetingRoomRepository implements MeetingRoomRepository {
  const EmptyMeetingRoomRepository();

  @override
  Future<List<MeetingRoomRecord>> list(String propertyId) async => const [];
  @override
  Future<MeetingRoomRecord> create(String propertyId, MeetingRoomInput input) =>
      throw UnsupportedError('Meeting-room creation is unavailable.');
  @override
  Future<MeetingRoomRecord> update(
    String propertyId,
    String id,
    MeetingRoomInput input,
  ) => throw UnsupportedError('Meeting-room editing is unavailable.');
  @override
  Future<List<MeetingRoomBookingRecord>> listBookings(
    String propertyId,
  ) async => const [];
  @override
  Future<List<MeetingRoomBookingTarget>> bookingTargets(
    String propertyId,
  ) async => const [];
  @override
  Future<MeetingRoomBookingRecord> createBooking(
    String propertyId,
    MeetingRoomBookingInput input,
  ) => throw UnsupportedError('Meeting-room booking is unavailable.');
  @override
  Future<MeetingRoomBookingRecord> decideBooking(
    String propertyId,
    String bookingId,
    MeetingRoomBookingDecision decision, {
    String? reason,
  }) =>
      throw UnsupportedError('Meeting-room booking decisions are unavailable.');
}

final class ApiMeetingRoomRepository implements MeetingRoomRepository {
  const ApiMeetingRoomRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<List<MeetingRoomRecord>> list(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/meeting-rooms',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    final items = response['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return MeetingRoomRecord.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<MeetingRoomRecord> create(String propertyId, MeetingRoomInput input) =>
      _mutate('/api/saraya/v1/meeting-rooms', propertyId, input, false);

  @override
  Future<MeetingRoomRecord> update(
    String propertyId,
    String id,
    MeetingRoomInput input,
  ) => _mutate(
    '/api/saraya/v1/meeting-rooms/${Uri.encodeComponent(id)}',
    propertyId,
    input,
    true,
  );

  Future<MeetingRoomRecord> _mutate(
    String path,
    String propertyId,
    MeetingRoomInput input,
    bool patch,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = patch
        ? await _apiClient.patchJson('$path?$query', data: input.toJson())
        : await _apiClient.postJson('$path?$query', data: input.toJson());
    if (response is! Map) throw ApiError.invalidResponse(200);
    return MeetingRoomRecord.fromJson(Map<String, Object?>.from(response));
  }

  @override
  Future<List<MeetingRoomBookingRecord>> listBookings(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/meeting-room-bookings',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map || response['items'] is! List) {
      throw ApiError.invalidResponse(200);
    }
    return List.unmodifiable(
      (response['items'] as List).map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return MeetingRoomBookingRecord.fromJson(
          Map<String, Object?>.from(item),
        );
      }),
    );
  }

  @override
  Future<List<MeetingRoomBookingTarget>> bookingTargets(
    String propertyId,
  ) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/meeting-room-bookings',
        queryParameters: {'propertyId': propertyId, 'targets': 'true'},
      ).toString(),
    );
    if (response is! Map || response['items'] is! List) {
      throw ApiError.invalidResponse(200);
    }
    return List.unmodifiable(
      (response['items'] as List).map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return MeetingRoomBookingTarget.fromJson(
          Map<String, Object?>.from(item),
        );
      }),
    );
  }

  @override
  Future<MeetingRoomBookingRecord> createBooking(
    String propertyId,
    MeetingRoomBookingInput input,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.postJson(
      '/api/saraya/v1/meeting-room-bookings?$query',
      data: input.toJson(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return MeetingRoomBookingRecord.fromJson(
      Map<String, Object?>.from(response),
    );
  }

  @override
  Future<MeetingRoomBookingRecord> decideBooking(
    String propertyId,
    String bookingId,
    MeetingRoomBookingDecision decision, {
    String? reason,
  }) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.postJson(
      '/api/saraya/v1/meeting-room-bookings/${Uri.encodeComponent(bookingId)}/decision?$query',
      data: {
        'decision': decision.name,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return MeetingRoomBookingRecord.fromJson(
      Map<String, Object?>.from(response),
    );
  }
}
