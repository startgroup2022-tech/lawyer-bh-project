import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/domain/meeting_room.dart';

void main() {
  test('loads property-scoped meeting rooms', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiMeetingRoomRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final rooms = await repository.list('property / 1');

    expect(rooms.single.code, 'MR-01');
    expect(rooms.single.capacity, 10);
    expect(rooms.single.hourlyRate, '15.000');
    expect(adapter.request?.uri.path, '/api/saraya/v1/meeting-rooms');
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
  });

  test('creates a property-scoped meeting-room booking', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiMeetingRoomRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final booking = await repository.createBooking(
      'property / 1',
      const MeetingRoomBookingInput(
        roomId: 'room-1',
        bookedForUserId: 'user-2',
        startAt: '2026-10-01T06:00:00.000Z',
        endAt: '2026-10-01T07:00:00.000Z',
        attendeeCount: 4,
        purpose: 'Client meeting',
        idempotencyKey: 'booking-1',
      ),
    );

    expect(booking.status, 'pending');
    expect(adapter.request?.method, 'POST');
    expect(adapter.request?.uri.path, '/api/saraya/v1/meeting-room-bookings');
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
    expect(adapter.request?.data, containsPair('bookedForUserId', 'user-2'));
  });

  test('loads active owner and tenant booking targets', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiMeetingRoomRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final targets = await repository.bookingTargets('property-1');

    expect(targets.single.displayNameEn, 'Alpha Tenant');
    expect(targets.single.role, 'tenant');
    expect(adapter.request?.uri.queryParameters['targets'], 'true');
  });
}

final class _Adapter implements HttpClientAdapter {
  RequestOptions? request;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    request = options;
    final payload =
        options.uri.path.contains('meeting-room-bookings') &&
            options.uri.queryParameters['targets'] == 'true'
        ? {
            'items': [
              {
                'userId': 'user-2',
                'role': 'tenant',
                'displayNameAr': 'شركة ألف',
                'displayNameEn': 'Alpha Tenant',
                'tenantOrganizationId': 'tenant-1',
              },
            ],
          }
        : options.uri.path.contains('meeting-room-bookings')
        ? _bookingJson
        : {
            'items': [
              {
                'id': 'room-1',
                'propertyId': 'property-1',
                'code': 'MR-01',
                'nameAr': 'قاعة الاجتماعات 1',
                'nameEn': 'Meeting Room 1',
                'descriptionAr': null,
                'descriptionEn': null,
                'capacity': 10,
                'hourlyRate': '15.000',
                'openingTime': '08:00:00',
                'closingTime': '22:00:00',
                'minimumMinutes': 60,
                'bookingIncrementMinutes': 30,
                'status': 'active',
              },
            ],
          };
    return ResponseBody.fromString(
      jsonEncode(payload),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

const _bookingJson = {
  'id': 'booking-1',
  'propertyId': 'property-1',
  'roomId': 'room-1',
  'bookedByUserId': 'user-1',
  'tenantOrganizationId': null,
  'status': 'pending',
  'startAt': '2026-10-01T06:00:00.000Z',
  'endAt': '2026-10-01T07:00:00.000Z',
  'attendeeCount': 4,
  'purpose': 'Client meeting',
  'amount': '15.000',
  'currency': 'BHD',
  'bookedByNameAr': 'شركة ألف',
  'bookedByNameEn': 'Alpha Tenant',
  'bookedByRole': 'tenant',
};

final class _SessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
