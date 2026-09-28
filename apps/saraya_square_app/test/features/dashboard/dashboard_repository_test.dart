import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';

void main() {
  test('parses every Task 3 dashboard field without converting money', () {
    final summary = DashboardSummary.fromJson({
      'propertyId': 'property-1',
      'role': 'property_manager',
      'occupiedUnits': 14,
      'vacantUnits': 6,
      'tenantCount': 12,
      'pendingRequests': 3,
      'dueAmount': '1250.500',
      'paidAmount': '9200.125',
      'overdueAmount': '400.250',
      'currencyCode': 'BHD',
    });

    expect(summary.propertyId, 'property-1');
    expect(summary.role, 'property_manager');
    expect(summary.occupiedUnits, 14);
    expect(summary.vacantUnits, 6);
    expect(summary.tenantCount, 12);
    expect(summary.pendingRequests, 3);
    expect(summary.dueAmount, '1250.500');
    expect(summary.paidAmount, '9200.125');
    expect(summary.overdueAmount, '400.250');
    expect(summary.currencyCode, 'BHD');
  });

  test('rejects a response with any missing required field', () {
    final json = _validJson()..remove('overdueAmount');

    expect(
      () => DashboardSummary.fromJson(json),
      throwsA(
        isA<ApiError>().having(
          (error) => error.code,
          'code',
          'INVALID_RESPONSE',
        ),
      ),
    );
  });

  test(
    'loads the selected property through the exact dashboard endpoint',
    () async {
      final adapter = _DashboardAdapter(_validJson());
      final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
        ..httpClientAdapter = adapter;
      final repository = ApiDashboardRepository(
        SarayaApiClient(
          dio: dio,
          sessionStore: _EmptySessionStore(),
          isNative: false,
        ),
      );

      final summary = await repository.load('property / 1');

      expect(summary.propertyId, 'property-1');
      expect(
        adapter.request?.path,
        '/api/saraya/v1/dashboard?propertyId=property+%2F+1',
      );
      expect(Uri.parse(adapter.request!.path).queryParameters, {
        'propertyId': 'property / 1',
      });
    },
  );
}

Map<String, Object?> _validJson() => {
  'propertyId': 'property-1',
  'role': 'property_manager',
  'occupiedUnits': 14,
  'vacantUnits': 6,
  'tenantCount': 12,
  'pendingRequests': 3,
  'dueAmount': '1250.500',
  'paidAmount': '9200.125',
  'overdueAmount': '400.250',
  'currencyCode': 'BHD',
};

final class _DashboardAdapter implements HttpClientAdapter {
  _DashboardAdapter(this.body);

  final Object body;
  RequestOptions? request;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    request = options;
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
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
