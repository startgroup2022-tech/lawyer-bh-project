import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';

void main() {
  test('unit approval inherit is serialized as an explicit null override', () {
    expect(
      const UnitInput(rentalApprovalOverride: null).toJson(),
      containsPair('rentalApprovalOverride', null),
    );
  });
  group('management list contracts', () {
    for (final scenario in _listScenarios) {
      test(
        '${scenario.resource.name} stays scoped and returns a typed model',
        () async {
          final adapter = _QueueAdapter([
            _Reply(200, {
              'items': [scenario.json],
              'nextCursor': 'next-cursor',
            }),
          ]);
          final repository = _repository(adapter);

          final page = await repository.list(
            scenario.resource,
            const ManagementQuery(
              propertyId: 'property / 1',
              cursor: 'opaque+/cursor==',
              limit: 17,
              search: 'Saraya & Co',
              status: 'vacant',
              role: 'property_manager',
            ),
          );

          expect(page.items.single, isA<ManagementRecord>());
          expect(page.items.single.runtimeType, scenario.type);
          expect(page.nextCursor, 'next-cursor');
          expect(adapter.requests.single.method, 'GET');
          expect(
            adapter.requests.single.uri.path,
            '/api/saraya/v1/${scenario.resource.apiName}',
          );
          expect(adapter.requests.single.uri.queryParameters, {
            'propertyId': 'property / 1',
            'cursor': 'opaque+/cursor==',
            'limit': '17',
            'search': 'Saraya & Co',
            'status': 'vacant',
            'role': 'property_manager',
          });
        },
      );
    }
  });

  test(
    'property creation is the only mutation without property scope',
    () async {
      final adapter = _QueueAdapter([
        _Reply(201, _propertyJson),
        _Reply(201, _unitJson),
      ]);
      final repository = _repository(adapter);

      await repository.create(
        ManagementResource.properties,
        const ManagementQuery(propertyId: 'property-1'),
        const PropertyInput(code: 'SS', nameAr: 'سرايا', nameEn: 'Saraya'),
      );
      await repository.create(
        ManagementResource.units,
        const ManagementQuery(propertyId: 'property-1'),
        const UnitInput(unitNumber: 'A-01'),
      );

      expect(adapter.requests[0].uri.queryParameters, isEmpty);
      expect(adapter.requests[1].uri.queryParameters, {
        'propertyId': 'property-1',
      });
    },
  );

  test('update and deactivate use scoped item routes', () async {
    final adapter = _QueueAdapter([
      _Reply(200, _tenantJson),
      const _Reply(204, null),
    ]);
    final repository = _repository(adapter);
    const query = ManagementQuery(propertyId: 'property-1');

    await repository.update(
      ManagementResource.tenants,
      query,
      'tenant-1',
      const TenantInput(nameAr: 'شركة', nameEn: 'Company'),
    );
    await repository.deactivate(ManagementResource.tenants, query, 'tenant-1');

    expect(adapter.requests[0].method, 'PATCH');
    expect(adapter.requests[1].method, 'DELETE');
    for (final request in adapter.requests) {
      expect(request.uri.path, '/api/saraya/v1/tenants/tenant-1');
      expect(request.uri.queryParameters, {'propertyId': 'property-1'});
    }
  });

  test(
    'staff mutations hydrate safe display fields from the item route',
    () async {
      final adapter = _QueueAdapter([
        const _Reply(201, {
          'id': 'membership-1',
          'userId': 'hidden-user-id',
          'role': 'property_manager',
          'isActive': true,
        }),
        const _Reply(200, _staffJson),
      ]);
      final repository = _repository(adapter);

      final record = await repository.create(
        ManagementResource.staff,
        const ManagementQuery(propertyId: 'property-1'),
        const StaffInput(
          identity: 'manager@example.com',
          role: 'property_manager',
          isActive: true,
        ),
      );

      expect((record as StaffRecord).displayNameEn, 'Saraya Manager');
      expect(adapter.requests.first.data, {
        'identity': 'manager@example.com',
        'role': 'property_manager',
        'isActive': true,
      });
      expect(
        (adapter.requests.first.data as Map).containsKey('userId'),
        isFalse,
      );
      expect(adapter.requests[1].method, 'GET');
      expect(adapter.requests[1].uri.path, '/api/saraya/v1/staff/membership-1');
      expect(adapter.requests[1].uri.queryParameters, {
        'propertyId': 'property-1',
      });
    },
  );

  test('server field errors stay attached to their form field', () async {
    final adapter = _QueueAdapter([
      const _Reply(422, {
        'error': {
          'code': 'INVALID_REQUEST',
          'messageAr': 'بيانات غير صالحة',
          'messageEn': 'Invalid request',
          'fieldErrors': {
            'nameAr': ['REQUIRED'],
            'registrationNumber': ['INVALID_FIELD'],
          },
        },
      }),
    ]);
    final repository = _repository(adapter);

    await expectLater(
      repository.create(
        ManagementResource.owners,
        const ManagementQuery(propertyId: 'property-1'),
        const OwnerInput(nameAr: '', nameEn: 'Owner'),
      ),
      throwsA(
        isA<ApiError>()
            .having((error) => error.fieldErrors['nameAr'], 'nameAr', [
              'REQUIRED',
            ])
            .having(
              (error) => error.fieldErrors['registrationNumber'],
              'registrationNumber',
              ['INVALID_FIELD'],
            ),
      ),
    );
  });
}

ApiManagementRepository _repository(_QueueAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiManagementRepository(
    SarayaApiClient(
      dio: dio,
      sessionStore: _EmptySessionStore(),
      isNative: false,
    ),
  );
}

final class _ListScenario {
  const _ListScenario(this.resource, this.json, this.type);

  final ManagementResource resource;
  final Map<String, Object?> json;
  final Type type;
}

const _listScenarios = [
  _ListScenario(ManagementResource.properties, _propertyJson, PropertyRecord),
  _ListScenario(ManagementResource.units, _unitJson, UnitRecord),
  _ListScenario(ManagementResource.tenants, _tenantJson, TenantRecord),
  _ListScenario(ManagementResource.owners, _ownerJson, OwnerRecord),
  _ListScenario(ManagementResource.staff, _staffJson, StaffRecord),
];

const _propertyJson = <String, Object?>{
  'id': 'property-1',
  'code': 'SS',
  'nameAr': 'سرايا سكوير',
  'nameEn': 'Saraya Square',
  'addressAr': null,
  'addressEn': null,
  'timezone': 'Asia/Bahrain',
  'currencyCode': 'BHD',
  'isActive': true,
};
const _unitJson = <String, Object?>{
  'id': 'unit-1',
  'propertyId': 'property-1',
  'unitTypeId': null,
  'ownerId': null,
  'unitNumber': 'A-01',
  'floor': 'G',
  'status': 'vacant',
  'areaSquareMeters': '45.000',
  'marketRent': '500.000',
  'availableFrom': null,
};
const _tenantJson = <String, Object?>{
  'id': 'tenant-1',
  'propertyId': 'property-1',
  'nameAr': 'شركة المستأجر',
  'nameEn': 'Tenant Company',
  'registrationNumber': null,
  'taxNumber': null,
  'isActive': true,
};
const _ownerJson = <String, Object?>{
  'id': 'owner-1',
  'propertyId': 'property-1',
  'nameAr': 'المالك',
  'nameEn': 'Owner',
  'registrationNumber': null,
};
const _staffJson = <String, Object?>{
  'id': 'membership-1',
  'userId': 'hidden-user-id',
  'displayNameAr': 'مدير سرايا',
  'displayNameEn': 'Saraya Manager',
  'email': 'manager@example.com',
  'phone': null,
  'role': 'property_manager',
  'isActive': true,
};

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
      reply.body == null ? '' : jsonEncode(reply.body),
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
