import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/maintenance/domain/maintenance_ticket.dart';

abstract interface class MaintenanceRepository {
  Future<List<MaintenanceTicket>> list(String propertyId);
  Future<MaintenanceTicket> create(String propertyId, MaintenanceInput input);
  Future<MaintenanceTicket> update(String propertyId, String id, MaintenanceInput input);
}

final class EmptyMaintenanceRepository implements MaintenanceRepository {
  const EmptyMaintenanceRepository();

  @override
  Future<List<MaintenanceTicket>> list(String propertyId) async => const [];
  @override
  Future<MaintenanceTicket> create(String propertyId, MaintenanceInput input) => throw UnsupportedError('Maintenance creation is unavailable.');
  @override
  Future<MaintenanceTicket> update(String propertyId, String id, MaintenanceInput input) => throw UnsupportedError('Maintenance editing is unavailable.');
}

final class ApiMaintenanceRepository implements MaintenanceRepository {
  const ApiMaintenanceRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<List<MaintenanceTicket>> list(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/maintenance-tickets',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    final items = response['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return MaintenanceTicket.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<MaintenanceTicket> create(String propertyId, MaintenanceInput input) => _mutate('/api/saraya/v1/maintenance-tickets', propertyId, input, false);
  @override
  Future<MaintenanceTicket> update(String propertyId, String id, MaintenanceInput input) => _mutate('/api/saraya/v1/maintenance-tickets/${Uri.encodeComponent(id)}', propertyId, input, true);
  Future<MaintenanceTicket> _mutate(String path, String propertyId, MaintenanceInput input, bool patch) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = patch ? await _apiClient.patchJson('$path?$query', data: input.toJson()) : await _apiClient.postJson('$path?$query', data: input.toJson());
    if (response is! Map) throw ApiError.invalidResponse(200);
    return MaintenanceTicket.fromJson(Map<String, Object?>.from(response));
  }
}
