import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/leases/domain/lease.dart';

abstract interface class LeaseRepository {
  Future<List<LeaseRecord>> list(String propertyId);
  Future<void> command(
    String propertyId,
    String leaseId,
    LeaseAction action, {
    LeaseRenewalTerms? terms,
    String? reason,
  });
}

final class EmptyLeaseRepository implements LeaseRepository {
  const EmptyLeaseRepository();

  @override
  Future<List<LeaseRecord>> list(String propertyId) async => const [];

  @override
  Future<void> command(
    String propertyId,
    String leaseId,
    LeaseAction action, {
    LeaseRenewalTerms? terms,
    String? reason,
  }) async {}
}

final class ApiLeaseRepository implements LeaseRepository {
  const ApiLeaseRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<List<LeaseRecord>> list(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/leases',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    final items = response['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return LeaseRecord.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<void> command(
    String propertyId,
    String leaseId,
    LeaseAction action, {
    LeaseRenewalTerms? terms,
    String? reason,
  }) async {
    final segment = switch (action) {
      LeaseAction.approve => 'approve',
      LeaseAction.requestRenewal => 'renew-request',
      LeaseAction.approveRenewal ||
      LeaseAction.rejectRenewal => 'renew-decision',
      LeaseAction.terminate => 'terminate',
      LeaseAction.close => 'close',
    };
    final data = switch (action) {
      LeaseAction.approveRenewal => {
        'decision': 'approve',
        'terms': terms!.toJson(),
      },
      LeaseAction.rejectRenewal => <String, Object>{'decision': 'reject'},
      LeaseAction.terminate when reason != null && reason.trim().isNotEmpty => {
        'reason': reason.trim(),
      },
      _ => null,
    };
    await _apiClient.postJson(
      '/api/saraya/v1/leases/${Uri.encodeComponent(leaseId)}/$segment?propertyId=${Uri.encodeQueryComponent(propertyId)}',
      data: data,
    );
  }
}
