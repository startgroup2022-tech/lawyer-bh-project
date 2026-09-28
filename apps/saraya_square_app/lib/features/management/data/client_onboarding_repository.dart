import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/management/domain/client_onboarding.dart';

abstract interface class ClientOnboardingRepository {
  Future<ClientOnboardingOptions> options({String? propertyId});
  Future<void> createTenant(TenantOnboardingInput input);
  Future<void> createOwner(OwnerOnboardingInput input);
}

final class EmptyClientOnboardingRepository
    implements ClientOnboardingRepository {
  const EmptyClientOnboardingRepository();
  @override
  Future<ClientOnboardingOptions> options({String? propertyId}) async =>
      const ClientOnboardingOptions(properties: []);
  @override
  Future<void> createTenant(TenantOnboardingInput input) =>
      throw UnsupportedError('Tenant onboarding is unavailable.');
  @override
  Future<void> createOwner(OwnerOnboardingInput input) =>
      throw UnsupportedError('Owner onboarding is unavailable.');
}

final class ApiClientOnboardingRepository
    implements ClientOnboardingRepository {
  const ApiClientOnboardingRepository(this._apiClient);
  final SarayaApiClient _apiClient;

  @override
  Future<ClientOnboardingOptions> options({String? propertyId}) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/client-onboarding/options',
        queryParameters: propertyId == null ? null : {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return ClientOnboardingOptions.fromJson(
      Map<String, Object?>.from(response),
    );
  }

  @override
  Future<void> createTenant(TenantOnboardingInput input) async {
    await _apiClient.postJson(
      '/api/saraya/v1/client-onboarding/tenants',
      data: input.toJson(),
    );
  }

  @override
  Future<void> createOwner(OwnerOnboardingInput input) async {
    await _apiClient.postJson(
      '/api/saraya/v1/client-onboarding/owners',
      data: input.toJson(),
    );
  }
}
