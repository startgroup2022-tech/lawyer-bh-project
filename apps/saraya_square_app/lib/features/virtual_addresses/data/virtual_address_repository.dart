import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/virtual_addresses/domain/virtual_address.dart';

abstract interface class VirtualAddressRepository {
  Future<List<VirtualAddressRecord>> list(String propertyId);
  Future<VirtualAddressRecord> update(String propertyId, String id, VirtualAddressInput input);
}

final class EmptyVirtualAddressRepository implements VirtualAddressRepository {
  const EmptyVirtualAddressRepository();

  @override
  Future<List<VirtualAddressRecord>> list(String propertyId) async => const [];
  @override
  Future<VirtualAddressRecord> update(String propertyId, String id, VirtualAddressInput input) => throw UnsupportedError('Virtual-address editing is unavailable.');
}

final class ApiVirtualAddressRepository implements VirtualAddressRepository {
  const ApiVirtualAddressRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<List<VirtualAddressRecord>> list(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/virtual-addresses',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    final items = response['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return VirtualAddressRecord.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<VirtualAddressRecord> update(String propertyId, String id, VirtualAddressInput input) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.patchJson(
      '/api/saraya/v1/virtual-addresses/${Uri.encodeComponent(id)}?$query',
      data: input.toJson(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return VirtualAddressRecord.fromJson(Map<String, Object?>.from(response));
  }
}
