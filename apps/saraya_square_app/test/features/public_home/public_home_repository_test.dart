import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';

void main() {
  test('loads anonymous public units and virtual-address totals', () async {
    final adapter = _Adapter(_validJson());
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiPublicHomeRepository(
      SarayaApiClient(
        dio: dio,
        sessionStore: _EmptySessionStore(),
        isNative: false,
      ),
    );

    final inventory = await repository.load();

    expect(adapter.request?.uri.path, '/api/saraya/v1/public/home');
    expect(adapter.request?.uri.queryParameters, {'limit': '12'});
    expect(inventory.units.single.displayNameEn, 'Office 101');
    expect(inventory.units.single.marketRent, '450.000');
    expect(inventory.virtualAddresses.total, 50);
    expect(inventory.virtualAddresses.available, 47);
  });

  test('rejects malformed public inventory without leaking raw data', () async {
    final malformed = _validJson()..remove('virtualAddresses');
    final adapter = _Adapter(malformed);
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiPublicHomeRepository(
      SarayaApiClient(
        dio: dio,
        sessionStore: _EmptySessionStore(),
        isNative: false,
      ),
    );

    await expectLater(
      repository.load(),
      throwsA(
        isA<ApiError>().having(
          (error) => error.code,
          'code',
          'INVALID_RESPONSE',
        ),
      ),
    );
  });
}

Map<String, Object?> _validJson() => {
  'units': [
    {
      'id': 'unit-101',
      'propertyId': 'property-1',
      'propertyNameAr': 'سرايا سكوير',
      'propertyNameEn': 'Saraya Square',
      'unitNumber': '101',
      'unitType': 'office',
      'displayNameAr': 'مكتب ١٠١',
      'displayNameEn': 'Office 101',
      'descriptionAr': 'مكتب متاح',
      'descriptionEn': 'Available office',
      'imageKey': 'office_101',
      'floor': '1',
      'marketRent': '450.000',
      'areaSquareMeters': '20.000',
      'availableFrom': null,
      'status': 'vacant',
    },
  ],
  'virtualAddresses': {'total': 50, 'available': 47},
};

final class _Adapter implements HttpClientAdapter {
  _Adapter(this.body);

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
