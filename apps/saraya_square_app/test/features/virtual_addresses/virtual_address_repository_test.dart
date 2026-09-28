import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/virtual_addresses/domain/virtual_address.dart';

void main() {
  test('loads property-scoped virtual addresses', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiVirtualAddressRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    final items = await repository.list('property / 1');

    expect(items.single.code, 'VA-001');
    expect(items.single.status, 'available');
    expect(adapter.request?.uri.path, '/api/saraya/v1/virtual-addresses');
    expect(adapter.request?.uri.queryParameters, {
      'propertyId': 'property / 1',
    });
  });

  test('updates a virtual address through its property-scoped item route', () async {
    final adapter = _Adapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiVirtualAddressRepository(
      SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
    );

    await repository.update(
      'property / 1',
      'address / 1',
      const VirtualAddressInput(
        status: 'active',
        businessNameAr: 'شركة المثال',
        businessNameEn: 'Example Company',
        monthlyFee: '35.000',
      ),
    );

    expect(adapter.request?.method, 'PATCH');
    expect(adapter.request?.uri.path, '/api/saraya/v1/virtual-addresses/address%20%2F%201');
    expect(adapter.request?.uri.queryParameters, {'propertyId': 'property / 1'});
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
        if (options.method == 'PATCH') ..._addressJson,
        'items': [
          _addressJson,
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

const _addressJson = {
  'id': 'address-1',
  'propertyId': 'property-1',
  'slotNumber': 1,
  'code': 'VA-001',
  'status': 'available',
  'tenantOrganizationId': null,
  'tenantNameAr': null,
  'tenantNameEn': null,
  'businessNameAr': null,
  'businessNameEn': null,
  'monthlyFee': null,
  'startDate': null,
  'endDate': null,
};

final class _SessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
