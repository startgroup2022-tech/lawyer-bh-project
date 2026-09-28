import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/domain/client_onboarding.dart';

void main() {
  test('loads properties before property-scoped available assets', () async {
    final adapter = _Adapter();
    final repository = _repository(adapter);

    final properties = await repository.options();
    final assets = await repository.options(propertyId: 'property-1');

    expect(properties.properties.single.nameEn, 'Saraya Square');
    expect(assets.units.single.unitNumber, '101');
    expect(assets.virtualAddresses.single.code, 'VA-001');
    expect(adapter.requests[0].uri.queryParameters, isEmpty);
    expect(adapter.requests[1].uri.queryParameters, {
      'propertyId': 'property-1',
    });
  });

  test('posts mixed tenant onboarding payload', () async {
    final adapter = _Adapter();
    final repository = _repository(adapter);
    const input = TenantOnboardingInput(
      propertyId: 'property-1',
      nameAr: 'شركة ألف',
      nameEn: 'Alpha',
      units: [
        TenantUnitSelection(
          unitId: 'unit-1',
          startDate: '2026-10-01',
          endDate: '2027-09-30',
          rentAmount: '500.000',
          depositAmount: '0.000',
          frequency: 'monthly',
          dueDay: 1,
          graceDays: 5,
        ),
      ],
      virtualAddresses: [
        TenantVirtualAddressSelection(
          virtualAddressId: 'address-1',
          businessNameAr: 'شركة ألف',
          businessNameEn: 'Alpha',
          monthlyFee: '35.000',
          startDate: '2026-10-01',
          endDate: '2027-09-30',
        ),
      ],
    );

    await repository.createTenant(input);

    expect(
      adapter.requests.last.uri.path,
      '/api/saraya/v1/client-onboarding/tenants',
    );
    expect(
      adapter.requests.last.data,
      containsPair('propertyId', 'property-1'),
    );
    expect((adapter.requests.last.data as Map)['units'], hasLength(1));
    expect(
      (adapter.requests.last.data as Map)['virtualAddresses'],
      hasLength(1),
    );
  });

  test('posts all selected owner properties', () async {
    final adapter = _Adapter();
    final repository = _repository(adapter);

    await repository.createOwner(
      const OwnerOnboardingInput(
        propertyIds: ['property-1', 'property-2'],
        nameAr: 'المالك',
        nameEn: 'Owner',
      ),
    );

    expect(
      adapter.requests.last.uri.path,
      '/api/saraya/v1/client-onboarding/owners',
    );
    expect(
      adapter.requests.last.data,
      containsPair('propertyIds', ['property-1', 'property-2']),
    );
  });
}

ApiClientOnboardingRepository _repository(_Adapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiClientOnboardingRepository(
    SarayaApiClient(dio: dio, sessionStore: _SessionStore(), isNative: false),
  );
}

final class _Adapter implements HttpClientAdapter {
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final Object payload;
    if (options.uri.path.endsWith('/options')) {
      payload = {
        'properties': [
          {
            'id': 'property-1',
            'code': 'SQ',
            'nameAr': 'سرايا سكوير',
            'nameEn': 'Saraya Square',
            'currencyCode': 'BHD',
          },
        ],
        if (options.uri.queryParameters.containsKey('propertyId')) ...{
          'units': [
            {
              'id': 'unit-1',
              'propertyId': 'property-1',
              'unitNumber': '101',
              'displayNameAr': 'مكتب 101',
              'displayNameEn': 'Office 101',
              'marketRent': '500.000',
            },
          ],
          'virtualAddresses': [
            {
              'id': 'address-1',
              'propertyId': 'property-1',
              'code': 'VA-001',
              'slotNumber': 1,
              'monthlyFee': '35.000',
            },
          ],
        },
      };
    } else if (options.uri.path.endsWith('/tenants')) {
      payload = {
        'tenantId': 'tenant-1',
        'leaseIds': ['lease-1'],
        'virtualAddressIds': ['address-1'],
      };
    } else {
      payload = {
        'ownerIds': ['owner-1', 'owner-2'],
      };
    }
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

final class _SessionStore implements SessionStore {
  @override
  Future<void> clear() async {}
  @override
  Future<SessionTokens?> read() async => null;
  @override
  Future<void> write(SessionTokens value) async {}
}
