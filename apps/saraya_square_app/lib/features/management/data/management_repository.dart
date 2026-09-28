import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';

abstract interface class ManagementRepository {
  Future<ManagementPage<ManagementRecord>> list(
    ManagementResource resource,
    ManagementQuery query,
  );

  Future<ManagementRecord> create(
    ManagementResource resource,
    ManagementQuery query,
    ManagementInput input,
  );

  Future<ManagementRecord> update(
    ManagementResource resource,
    ManagementQuery query,
    String id,
    ManagementInput input,
  );

  Future<void> deactivate(
    ManagementResource resource,
    ManagementQuery query,
    String id,
  );
}

final class ApiManagementRepository implements ManagementRepository {
  const ApiManagementRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<ManagementPage<ManagementRecord>> list(
    ManagementResource resource,
    ManagementQuery query,
  ) async {
    final response = await _apiClient.getJson(_collectionPath(resource, query));
    final json = _jsonObject(response);
    final rawItems = json['items'];
    if (rawItems is! List) throw ApiError.invalidResponse(200);
    return ManagementPage(
      items: List.unmodifiable(
        rawItems.map((item) => _record(resource, _jsonObject(item))),
      ),
      nextCursor: _optionalString(json['nextCursor']),
    );
  }

  @override
  Future<ManagementRecord> create(
    ManagementResource resource,
    ManagementQuery query,
    ManagementInput input,
  ) async {
    final response = await _apiClient.postJson(
      _collectionPath(resource, query, propertyCreation: true),
      data: input.toJson(),
    );
    return _mutationRecord(resource, query, response);
  }

  @override
  Future<ManagementRecord> update(
    ManagementResource resource,
    ManagementQuery query,
    String id,
    ManagementInput input,
  ) async {
    final response = await _apiClient.patchJson(
      _itemPath(resource, query, id),
      data: input.toJson(),
    );
    return _mutationRecord(resource, query, response);
  }

  @override
  Future<void> deactivate(
    ManagementResource resource,
    ManagementQuery query,
    String id,
  ) async {
    await _apiClient.delete(_itemPath(resource, query, id));
  }

  Future<ManagementRecord> _mutationRecord(
    ManagementResource resource,
    ManagementQuery query,
    Object? response,
  ) async {
    final json = _jsonObject(response);
    if (resource != ManagementResource.staff) return _record(resource, json);
    final id = json['id'];
    if (id is! String || id.isEmpty) throw ApiError.invalidResponse(200);
    final hydrated = await _apiClient.getJson(_itemPath(resource, query, id));
    return StaffRecord.fromJson(_jsonObject(hydrated));
  }

  String _collectionPath(
    ManagementResource resource,
    ManagementQuery query, {
    bool propertyCreation = false,
  }) {
    final parameters = <String, String>{};
    if (!(propertyCreation && resource == ManagementResource.properties)) {
      parameters['propertyId'] = query.propertyId;
    }
    if (!propertyCreation) {
      parameters['limit'] = query.limit.toString();
      if (query.cursor case final value?) parameters['cursor'] = value;
      if (query.search case final value? when value.isNotEmpty) {
        parameters['search'] = value;
      }
      if (query.status case final value? when value.isNotEmpty) {
        parameters['status'] = value;
      }
      if (query.role case final value? when value.isNotEmpty) {
        parameters['role'] = value;
      }
    }
    return Uri(
      path: '/api/saraya/v1/${resource.apiName}',
      queryParameters: parameters.isEmpty ? null : parameters,
    ).toString();
  }

  String _itemPath(
    ManagementResource resource,
    ManagementQuery query,
    String id,
  ) => Uri(
    path: '/api/saraya/v1/${resource.apiName}/$id',
    queryParameters: {'propertyId': query.propertyId},
  ).toString();
}

ManagementRecord _record(
  ManagementResource resource,
  Map<String, Object?> json,
) => switch (resource) {
  ManagementResource.properties => PropertyRecord.fromJson(json),
  ManagementResource.units => UnitRecord.fromJson(json),
  ManagementResource.tenants => TenantRecord.fromJson(json),
  ManagementResource.owners => OwnerRecord.fromJson(json),
  ManagementResource.staff => StaffRecord.fromJson(json),
};

Map<String, Object?> _jsonObject(Object? value) {
  if (value is Map) return Map<String, Object?>.from(value);
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;
