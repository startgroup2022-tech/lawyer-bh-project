import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';

abstract interface class AccountRepository {
  Future<AccountProfile> load();
  Future<AccountProfile> update(AccountUpdate input);
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}

final class ApiAccountRepository implements AccountRepository {
  const ApiAccountRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<AccountProfile> load() async =>
      AccountProfile.fromJson(_json(await _apiClient.getJson(_accountPath)));

  @override
  Future<AccountProfile> update(AccountUpdate input) async {
    final response = await _apiClient.patchJson(
      _accountPath,
      data: input.toJson(),
    );
    return AccountProfile.fromJson(_json(response));
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _apiClient.postJson(
      '$_accountPath/change-password',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }
}

const _accountPath = '/api/saraya/v1/account';

Map<String, Object?> _json(Object? value) {
  if (value is Map) return Map<String, Object?>.from(value);
  throw ApiError.invalidResponse(200);
}
