import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';

void main() {
  test('rejects non-HTTPS payment URLs supplied by the API', () {
    expect(
      () => PaymentSession.fromJson({
        'paymentUrl': 'http://tap.example/pay',
        'demandId': 'demand-1',
        'requestId': 'request-1',
      }),
      throwsFormatException,
    );
  });

  test('maps server timeline codes without inventing a client status', () {
    final application = RentalApplication.fromJson({
      'id': 'request-1',
      'propertyId': 'property-1',
      'unitId': 'unit-1',
      'status': 'pending_owner_review',
      'resolvedApprovalMode': 'owner_review',
      'timeline': [
        {'code': 'submitted', 'occurredAt': '2026-09-27T10:00:00.000Z'},
      ],
    });

    expect(application.status, RentalApplicationStatus.pendingOwnerReview);
    expect(application.timeline.single.code, 'submitted');
  });

  test(
    'parses enriched and compatible submit response using requestId',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(201, {
          'requestId': 'request-1',
          'propertyId': 'property-1',
          'unitId': 'unit-1',
          'status': 'approved_awaiting_payment',
          'resolvedApprovalMode': 'instant',
          'paymentDemandId': 'demand-1',
          'paymentStatus': 'pending',
          'timeline': const <Object?>[],
        }),
      ]);
      final repository = _repository(
        adapter,
        _MemorySessionStore(),
        isNative: false,
      );
      final result = await repository.submit(
        const RentalApplicationInput(
          propertyId: 'property-1',
          unitId: 'unit-1',
          applicantType: 'individual',
          applicantNameAr: 'مستأجر',
          applicantNameEn: 'Tenant',
          startDate: '2026-10-01',
          endDate: '2027-09-30',
          durationMonths: 12,
          idDocumentId: 'document-1',
          idempotencyKey: 'submit-1',
        ),
      );
      expect(result.id, 'request-1');
      expect(result.paymentStatus, 'pending');
    },
  );

  test(
    'OTP verification adopts native access and refresh tokens securely',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(200, {
          'accessToken': 'access-token',
          'refreshToken': 'refresh-token',
          'userId': 'user-1',
          'reused': false,
        }),
      ]);
      final store = _MemorySessionStore();
      final repository = _repository(adapter, store, isNative: true);

      await repository.verifyOtp(
        const OtpVerification(
          challengeId: 'challenge-1',
          code: '123456',
          displayNameAr: 'أحمد علي',
          displayNameEn: 'Ahmed Ali',
        ),
      );

      expect(
        store.value,
        const SessionTokens(
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        ),
      );
      expect(adapter.requests.single.headers['x-saraya-client'], 'native');
    },
  );

  test('native payment requests a fixed native return mode', () async {
    final adapter = _ScriptedAdapter([
      _JsonResponse(201, {
        'requestId': 'request-1',
        'demandId': 'demand-1',
        'paymentUrl': 'https://tap.example/pay/1',
      }),
    ]);
    final repository = _repository(
      adapter,
      _MemorySessionStore(),
      isNative: true,
    );
    await repository.createOnlinePayment(
      'request-1',
      idempotencyKey: 'payment-action-1',
    );
    expect(adapter.requests.single.data, {
      'idempotencyKey': 'payment-action-1',
      'returnMode': 'native',
    });
  });

  test('lease PDF is downloaded with authenticated API bytes', () async {
    final store = _MemorySessionStore()
      ..value = const SessionTokens(
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      );
    final adapter = _BinaryAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiPublicRentalRepository(
      apiClient: SarayaApiClient(dio: dio, sessionStore: store, isNative: true),
      sessionStore: store,
      isNative: true,
    );
    final document = await repository.downloadLeaseDocument('lease-1');
    expect(document.bytes, Uint8List.fromList([37, 80, 68, 70]));
    expect(document.fileName, 'lease.pdf');
    expect(adapter.request.headers['Authorization'], 'Bearer access-token');
  });

  test(
    'online payment sends a stable idempotency header and accepts HTTPS only',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(201, {
          'requestId': 'request-1',
          'demandId': 'demand-1',
          'paymentUrl': 'https://tap.example/pay/1',
        }),
      ]);
      final repository = _repository(
        adapter,
        _MemorySessionStore(),
        isNative: false,
      );

      final session = await repository.createOnlinePayment(
        'request-1',
        idempotencyKey: 'payment-action-1',
      );

      expect(session.paymentUrl, Uri.parse('https://tap.example/pay/1'));
      expect(
        adapter.requests.single.headers['idempotency-key'],
        'payment-action-1',
      );
      expect(adapter.requests.single.data, {
        'idempotencyKey': 'payment-action-1',
      });
    },
  );

  test(
    'applicant upload sends the backend title and identity category contract',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(201, {'id': 'document-1'}),
      ]);
      final repository = _repository(
        adapter,
        _MemorySessionStore(),
        isNative: true,
      );

      final id = await repository.uploadIdentity(
        'unit-1',
        RentalDocument(
          fileName: 'identity.pdf',
          contentType: 'application/pdf',
          bytes: Uint8List.fromList([37, 80, 68, 70]),
        ),
        category: 'identity',
        idempotencyKey: 'document-action-1',
      );

      final form = adapter.requests.single.data as FormData;
      expect(id, 'document-1');
      expect(Map.fromEntries(form.fields)['title'], 'identity.pdf');
      expect(Map.fromEntries(form.fields)['category'], 'identity');
      expect(
        adapter.requests.single.headers['idempotency-key'],
        'document-action-1',
      );
    },
  );
}

ApiPublicRentalRepository _repository(
  _ScriptedAdapter adapter,
  SessionStore store, {
  required bool isNative,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiPublicRentalRepository(
    apiClient: SarayaApiClient(
      dio: dio,
      sessionStore: store,
      isNative: isNative,
    ),
    sessionStore: store,
    isNative: isNative,
  );
}

final class _MemorySessionStore implements SessionStore {
  SessionTokens? value;
  @override
  Future<void> clear() async => value = null;
  @override
  Future<SessionTokens?> read() async => value;
  @override
  Future<void> write(SessionTokens value) async => this.value = value;
}

final class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.responses);
  final List<_JsonResponse> responses;
  final List<RequestOptions> requests = [];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final response = responses.removeAt(0);
    return ResponseBody.fromString(
      jsonEncode(response.body),
      response.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _JsonResponse {
  const _JsonResponse(this.status, this.body);
  final int status;
  final Object body;
}

final class _BinaryAdapter implements HttpClientAdapter {
  late RequestOptions request;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    request = options;
    return ResponseBody.fromBytes(
      [37, 80, 68, 70],
      200,
      headers: {
        Headers.contentTypeHeader: ['application/pdf'],
        'content-disposition': ['attachment; filename="lease.pdf"'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
