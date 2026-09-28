import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/rental_requests/domain/rental_request.dart';

void main() {
  test('parses the safe queue and sends stable mutation keys', () async {
    final adapter = _Adapter([
      _Reply(200, {
        'items': [
          {
            'id': 'request-1',
            'unitNumber': 'A-01',
            'applicantDisplayName': 'Tenant',
            'startDate': '2030-01-01',
            'endDate': '2030-12-31',
            'rentAmount': '500.000',
            'depositAmount': '500.000',
            'feeAmount': '10.000',
            'currency': 'BHD',
            'status': 'pending_owner_review',
            'resolvedApprovalMode': 'owner_review',
            'paymentState': 'verification_pending',
            'demandId': 'demand-1',
            'identityDocumentPresent': true,
            'paymentProofPresent': true,
            'canApprove': true,
            'canVerifyOfflinePayment': false,
            'canDownloadIdentityDocument': true,
            'canDownloadPaymentProof': false,
            'timeline': const <Object?>[],
          },
        ],
        'nextCursor': 'cursor-2',
      }),
      const _Reply(200, {'status': 'approved_awaiting_payment'}),
    ]);
    final repository = _repository(adapter);
    final page = await repository.list('property-1', limit: 10);
    await repository.decide(
      'property-1',
      'request-1',
      approve: true,
      idempotencyKey: 'approve-request-1',
    );

    expect(page.items.single.canApprove, isTrue);
    expect(page.nextCursor, 'cursor-2');
    expect(
      adapter.requests.first.path,
      '/api/saraya/v1/rental-requests?propertyId=property-1&limit=10',
    );
    expect(
      adapter.requests.last.headers['idempotency-key'],
      'approve-request-1',
    );
    expect(adapter.requests.last.data, {
      'propertyId': 'property-1',
      'decision': 'approve',
      'idempotencyKey': 'approve-request-1',
    });
  });

  test(
    'downloads a document only through the authenticated binary endpoint',
    () async {
      final store = _Store()
        ..tokens = const SessionTokens(accessToken: 'access-token');
      final adapter = _BinaryAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
        ..httpClientAdapter = adapter;
      final repository = ApiRentalRequestRepository(
        SarayaApiClient(dio: dio, sessionStore: store, isNative: true),
      );
      final document = await repository.downloadDocument(
        'property-1',
        'request-1',
        RentalRequestDocumentKind.identity,
      );
      expect(document.fileName, 'identity.pdf');
      expect(adapter.request.headers['Authorization'], 'Bearer access-token');
      expect(
        adapter.request.path,
        contains('/rental-requests/request-1/documents/identity'),
      );
    },
  );

  test('forwards an opaque cursor when loading the next page', () async {
    final adapter = _Adapter([
      const _Reply(200, {'items': <Object?>[], 'nextCursor': null}),
    ]);
    final repository = _repository(adapter);
    await repository.list('property-1', cursor: 'opaque+cursor', limit: 25);
    expect(adapter.requests.single.uri.queryParameters, {
      'propertyId': 'property-1',
      'limit': '25',
      'cursor': 'opaque+cursor',
    });
  });
}

ApiRentalRequestRepository _repository(HttpClientAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiRentalRequestRepository(
    SarayaApiClient(dio: dio, sessionStore: _Store(), isNative: false),
  );
}

final class _Reply {
  const _Reply(this.status, this.body);
  final int status;
  final Object body;
}

final class _Adapter implements HttpClientAdapter {
  _Adapter(this.replies);
  final List<_Reply> replies;
  final List<RequestOptions> requests = [];
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final reply = replies.removeAt(0);
    return ResponseBody.fromString(
      jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
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
        'content-disposition': ['attachment; filename="identity.pdf"'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _Store implements SessionStore {
  SessionTokens? tokens;
  @override
  Future<void> clear() async => tokens = null;
  @override
  Future<SessionTokens?> read() async => tokens;
  @override
  Future<void> write(SessionTokens value) async => tokens = value;
}
