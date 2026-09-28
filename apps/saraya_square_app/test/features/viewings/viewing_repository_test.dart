import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';

void main() {
  test('lists public slots from the anonymous unit endpoint', () async {
    final adapter = _Adapter();
    final repository = _repository(adapter);

    final slots = await repository.listPublicSlots('unit / 101');

    expect(slots.single.id, 'slot-1');
    expect(slots.single.remainingCapacity, 2);
    expect(
      adapter.requests.single.uri.path,
      '/api/saraya/v1/public/units/unit%20%2F%20101/viewing-slots',
    );
    expect(adapter.requests.single.headers['Authorization'], isNull);
  });

  test('books with one stable idempotency key per submitted attempt', () async {
    final adapter = _Adapter();
    var generated = 0;
    final repository = _repository(
      adapter,
      idempotencyKeyFactory: () => 'visit-${++generated}',
    );
    const input = PublicViewingAppointmentInput(
      propertyId: 'property-1',
      unitId: 'unit-101',
      slotId: 'slot-1',
      visitorName: 'Ahmed Ali',
      visitorPhone: '+97339000000',
      visitorEmail: 'ahmed@example.com',
      locale: 'en',
    );

    final confirmation = await repository.bookPublicAppointment(input);

    expect(confirmation.reference, 'SV-000001');
    expect(generated, 1);
    expect(adapter.requests.single.method, 'POST');
    expect(
      adapter.requests.single.uri.path,
      '/api/saraya/v1/public/viewing-appointments',
    );
    expect(
      adapter.requests.single.data,
      containsPair('idempotencyKey', 'visit-1'),
    );
  });

  test('booking retry reuses the pending action idempotency key', () async {
    final adapter = _Adapter(failFirstBooking: true);
    var generated = 0;
    final repository = _repository(
      adapter,
      idempotencyKeyFactory: () => 'visit-${++generated}',
    );
    const input = PublicViewingAppointmentInput(
      propertyId: 'property-1',
      unitId: 'unit-101',
      slotId: 'slot-1',
      visitorName: 'Ahmed Ali',
      visitorPhone: '+97339000000',
      visitorEmail: 'ahmed@example.com',
      locale: 'en',
    );

    await expectLater(
      repository.bookPublicAppointment(input),
      throwsA(anything),
    );
    await repository.bookPublicAppointment(input);

    final keys = adapter.requests
        .where((request) => request.uri.path.endsWith('viewing-appointments'))
        .map((request) => (request.data as Map)['idempotencyKey'])
        .toList();
    expect(keys, ['visit-1', 'visit-1']);
    expect(generated, 1);
  });

  test('loads previously published management slots', () async {
    final adapter = _Adapter();
    final repository = _repository(adapter);

    final slots = await repository.listSlots('property / 1');

    expect(slots.single.id, 'slot-2');
    expect(adapter.requests.single.method, 'GET');
    expect(
      adapter.requests.single.uri.queryParameters['propertyId'],
      'property / 1',
    );
  });

  test(
    'loads property appointments and changes status with a command key',
    () async {
      final adapter = _Adapter();
      var generated = 0;
      final repository = _repository(
        adapter,
        idempotencyKeyFactory: () => 'command-${++generated}',
      );

      final appointments = await repository.listAppointments('property / 1');
      final updated = await repository.updateAppointmentStatus(
        'property / 1',
        'appointment-1',
        ViewingAppointmentStatus.completed,
      );

      expect(appointments.single.visitorName, 'Ahmed Ali');
      expect(updated.status, ViewingAppointmentStatus.completed);
      expect(adapter.requests.last.method, 'PATCH');
      expect(
        adapter.requests.last.uri.queryParameters['propertyId'],
        'property / 1',
      );
      expect(adapter.requests.last.data, {
        'status': 'completed',
        'idempotencyKey': 'command-1',
      });
    },
  );

  test('creates a property-wide management slot', () async {
    final adapter = _Adapter();
    final repository = _repository(
      adapter,
      idempotencyKeyFactory: () => 'slot-command-1',
    );

    final slot = await repository.createSlot(
      'property-1',
      ViewingSlotInput(
        startAt: DateTime.parse('2026-10-02T08:00:00.000Z'),
        endAt: DateTime.parse('2026-10-02T09:00:00.000Z'),
        capacity: 4,
        instructionsEn: 'Reception desk',
      ),
    );

    expect(slot.unitId, isNull);
    expect(adapter.requests.single.data, isNot(contains('unitId')));
    expect(
      adapter.requests.single.data,
      containsPair('idempotencyKey', 'slot-command-1'),
    );
  });

  test('updates a management slot with a fresh command key', () async {
    final adapter = _Adapter();
    final repository = _repository(
      adapter,
      idempotencyKeyFactory: () => 'slot-update-1',
    );

    final slot = await repository.updateSlot(
      'property-1',
      'slot-2',
      const ViewingSlotUpdate(capacity: 6),
    );

    expect(slot.capacity, 6);
    expect(adapter.requests.single.method, 'PATCH');
    expect(
      adapter.requests.single.uri.path,
      '/api/saraya/v1/viewing-slots/slot-2',
    );
    expect(adapter.requests.single.data, {
      'capacity': 6,
      'idempotencyKey': 'slot-update-1',
    });
  });
}

ApiViewingRepository _repository(
  _Adapter adapter, {
  String Function()? idempotencyKeyFactory,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiViewingRepository(
    SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    idempotencyKeyFactory: idempotencyKeyFactory ?? () => 'generated-key',
  );
}

final class _Adapter implements HttpClientAdapter {
  _Adapter({this.failFirstBooking = false});

  final bool failFirstBooking;
  final List<RequestOptions> requests = [];
  var bookingAttempts = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (options.uri.path == '/api/saraya/v1/public/viewing-appointments' &&
        failFirstBooking &&
        bookingAttempts++ == 0) {
      return ResponseBody.fromString(
        jsonEncode({'code': 'TEMPORARY'}),
        503,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }
    final payload = switch (options.uri.path) {
      '/api/saraya/v1/public/units/unit%20%2F%20101/viewing-slots' => {
        'items': [_publicSlotJson],
      },
      '/api/saraya/v1/public/viewing-appointments' => _confirmationJson,
      '/api/saraya/v1/viewing-appointments' => {
        'items': [_appointmentJson],
      },
      '/api/saraya/v1/viewing-appointments/appointment-1' => {
        ..._appointmentJson,
        'status': 'completed',
      },
      '/api/saraya/v1/viewing-slots' =>
        options.method == 'GET'
            ? {
                'items': [_managementSlotJson],
              }
            : _managementSlotJson,
      '/api/saraya/v1/viewing-slots/slot-2' => {
        ..._managementSlotJson,
        'capacity': 6,
      },
      _ => <String, Object?>{},
    };
    return ResponseBody.fromString(
      jsonEncode(payload),
      options.method == 'POST' ? 201 : 200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

const _publicSlotJson = {
  'id': 'slot-1',
  'startAt': '2026-10-01T08:00:00.000Z',
  'endAt': '2026-10-01T09:00:00.000Z',
  'remainingCapacity': 2,
  'instructionsAr': 'الاستقبال',
  'instructionsEn': 'Reception desk',
};

const _confirmationJson = {
  'reference': 'SV-000001',
  'status': 'confirmed',
  'startAt': '2026-10-01T08:00:00.000Z',
  'endAt': '2026-10-01T09:00:00.000Z',
};

const _managementSlotJson = {
  'id': 'slot-2',
  'propertyId': 'property-1',
  'unitId': null,
  'startAt': '2026-10-02T08:00:00.000Z',
  'endAt': '2026-10-02T09:00:00.000Z',
  'capacity': 4,
  'bookedCount': 0,
  'status': 'active',
  'instructionsAr': null,
  'instructionsEn': 'Reception desk',
  'createdByUserId': 'user-1',
};

const _appointmentJson = {
  'id': 'appointment-1',
  'propertyId': 'property-1',
  'unitId': 'unit-101',
  'slotId': 'slot-1',
  'reference': 'SV-000001',
  'visitorName': 'Ahmed Ali',
  'visitorPhone': '+97339000000',
  'visitorEmail': 'ahmed@example.com',
  'locale': 'en',
  'status': 'confirmed',
  'idempotencyKey': 'private-key',
  'internalNotes': null,
  'startAt': '2026-10-01T08:00:00.000Z',
  'endAt': '2026-10-01T09:00:00.000Z',
};

final class _SessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
