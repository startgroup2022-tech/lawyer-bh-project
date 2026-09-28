import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';

void main() {
  test('loads property-scoped maintenance tickets', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiMaintenanceRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final tickets = await repository.list('property / 1');

    expect(tickets.single.ticketNumber, 'MNT-0001');
    expect(tickets.single.unitNumber, 'OFF-101');
    expect(tickets.single.priority, 'urgent');
    expect(adapter.request?.uri.path, '/api/saraya/v1/maintenance-tickets');
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
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
            'id': 'ticket-1',
            'propertyId': 'property-1',
            'unitId': 'unit-1',
            'tenantOrganizationId': 'tenant-1',
            'ticketNumber': 'MNT-0001',
            'title': 'Air conditioner stopped',
            'description': 'The main office air conditioner is not cooling.',
            'priority': 'urgent',
            'status': 'in_progress',
            'expenseAmount': '25.000',
            'resolvedAt': null,
            'createdAt': '2026-09-26T08:00:00.000Z',
            'updatedAt': '2026-09-26T09:00:00.000Z',
            'unitNumber': 'OFF-101',
            'tenantNameAr': 'شركة البحرين',
            'tenantNameEn': 'Bahrain Company',
            'reportedByNameAr': 'أحمد',
            'reportedByNameEn': 'Ahmed',
            'assignedToNameAr': 'فريق الصيانة',
            'assignedToNameEn': 'Maintenance Team',
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
