import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';

abstract interface class DashboardRepository {
  Future<DashboardSummary> load(String propertyId);
}

final class ApiDashboardRepository implements DashboardRepository {
  const ApiDashboardRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<DashboardSummary> load(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/dashboard',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return DashboardSummary.fromJson(Map<String, Object?>.from(response));
  }
}
