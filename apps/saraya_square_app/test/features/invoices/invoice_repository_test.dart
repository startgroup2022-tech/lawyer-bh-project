import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';

void main() {
  test('loads property-scoped invoices without converting money', () async {
    final adapter = _QueueAdapter([
      _Reply(200, {
        'items': [_invoiceJson],
      }),
    ]);
    final repository = _repository(adapter);

    final invoices = await repository.list('property / 1');

    expect(invoices, hasLength(1));
    expect(invoices.single.number, 'INV-2026-001');
    expect(invoices.single.totalAmount, '1250.500');
    expect(invoices.single.paidAmount, '250.125');
    expect(invoices.single.paymentUrl, Uri.parse('https://pay.example/i/1'));
    expect(adapter.requests.single.method, 'GET');
    expect(adapter.requests.single.uri.path, '/api/saraya/v1/invoices');
    expect(adapter.requests.single.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
  });

  test('keeps payment unavailable when the API omits a usable link', () {
    final missing = InvoiceRecord.fromJson({
      ..._invoiceJson,
      'paymentUrl': null,
    });
    final invalid = InvoiceRecord.fromJson({
      ..._invoiceJson,
      'paymentUrl': 'javascript:alert(1)',
    });

    expect(missing.paymentUrl, isNull);
    expect(invalid.paymentUrl, isNull);
  });

  test('rejects incomplete invoice responses', () {
    final json = Map<String, Object?>.from(_invoiceJson)..remove('status');

    expect(
      () => InvoiceRecord.fromJson(json),
      throwsA(
        isA<ApiError>().having(
          (error) => error.code,
          'code',
          'INVALID_RESPONSE',
        ),
      ),
    );
  });

  test('loads invoice targets and creates an invoice', () async {
    final adapter = _QueueAdapter([
      _Reply(200, {
        'items': [
          {
            'rentalRequestId': 'request-1',
            'unitNumber': 'A-01',
            'tenantNameAr': 'شركة ألف',
            'tenantNameEn': 'Alpha Company',
          },
        ],
      }),
      _Reply(201, _invoiceJson),
    ]);
    final repository = _repository(adapter);

    final targets = await repository.targets('property-1');
    final created = await repository.create(
      'property-1',
      const InvoiceCreateInput(
        rentalRequestId: 'request-1',
        description: 'September rent',
        amount: '1250.500',
        issueDate: '2026-09-01',
        dueDate: '2026-09-30',
        status: 'due',
      ),
    );

    expect(targets.single.unitNumber, 'A-01');
    expect(created.number, 'INV-2026-001');
    expect(adapter.requests[0].uri.queryParameters['targets'], 'true');
    expect(adapter.requests[1].method, 'POST');
    expect(adapter.requests[1].data, {
      'propertyId': 'property-1',
      'rentalRequestId': 'request-1',
      'description': 'September rent',
      'amount': '1250.500',
      'issueDate': '2026-09-01',
      'dueDate': '2026-09-30',
      'status': 'due',
    });
  });
}

const _invoiceJson = <String, Object?>{
  'id': 'invoice-1',
  'propertyId': 'property-1',
  'rentalRequestId': 'request-1',
  'number': 'INV-2026-001',
  'status': 'partially_paid',
  'issueDate': '2026-09-01',
  'dueDate': '2026-09-30',
  'totalAmount': '1250.500',
  'paidAmount': '250.125',
  'currency': 'BHD',
  'unitId': 'unit-1',
  'unitNumber': 'A-01',
  'paymentDemandId': 'demand-1',
  'paymentStatus': 'pending',
  'paymentUrl': 'https://pay.example/i/1',
};

ApiInvoiceRepository _repository(_QueueAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiInvoiceRepository(
    SarayaApiClient(
      dio: dio,
      sessionStore: _EmptySessionStore(),
      isNative: false,
    ),
  );
}

final class _Reply {
  const _Reply(this.status, this.body);

  final int status;
  final Object? body;
}

final class _QueueAdapter implements HttpClientAdapter {
  _QueueAdapter(this.replies);

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

final class _EmptySessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
