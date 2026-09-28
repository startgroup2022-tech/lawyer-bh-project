import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/leases/domain/lease.dart';

void main() {
  test('loads property-scoped leases', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiLeaseRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final leases = await repository.list('property / 1');

    expect(leases.single.unitNumber, 'OFF-101');
    expect(leases.single.tenantNameEn, 'Bahrain Company');
    expect(leases.single.rentAmount, '450.000');
    expect(adapter.request?.uri.path, '/api/saraya/v1/leases');
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
  });

  test('sends lease lifecycle commands to the scoped route', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiLeaseRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    await repository.command(
      'property / 1',
      'lease / 1',
      LeaseAction.terminate,
      reason: 'Tenant request',
    );

    expect(adapter.request?.method, 'POST');
    expect(
      adapter.request?.uri.path,
      '/api/saraya/v1/leases/lease%20%2F%201/terminate',
    );
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
    expect(adapter.request?.data, {'reason': 'Tenant request'});
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
    return ResponseBody.fromString(
      jsonEncode({
        'items': [
          {
            'id': 'lease-1',
            'propertyId': 'property-1',
            'unitId': 'unit-1',
            'tenantOrganizationId': 'tenant-1',
            'status': 'active',
            'currentVersion': 1,
            'unitNumber': 'OFF-101',
            'unitNameAr': 'مكتب 101',
            'unitNameEn': 'Office 101',
            'tenantNameAr': 'شركة البحرين',
            'tenantNameEn': 'Bahrain Company',
            'startDate': '2026-01-01',
            'endDate': '2026-12-31',
            'rentAmount': '450.000',
            'depositAmount': '450.000',
            'frequency': 'monthly',
            'dueDay': 1,
            'graceDays': 5,
            'createdAt': '2026-01-01T08:00:00.000Z',
            'updatedAt': '2026-01-01T08:00:00.000Z',
          },
        ],
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _SessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
