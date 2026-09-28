import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';

abstract interface class PublicHomeRepository {
  Future<PublicHomeInventory> load();
}

final class ApiPublicHomeRepository implements PublicHomeRepository {
  const ApiPublicHomeRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<PublicHomeInventory> load() async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/public/home',
        queryParameters: {'limit': '12'},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return PublicHomeInventory.fromJson(Map<String, Object?>.from(response));
  }
}

final class EmptyPublicHomeRepository implements PublicHomeRepository {
  const EmptyPublicHomeRepository();

  @override
  Future<PublicHomeInventory> load() async => const PublicHomeInventory(
    units: [],
    virtualAddresses: PublicVirtualAddressSummary(total: 0, available: 0),
  );
}
