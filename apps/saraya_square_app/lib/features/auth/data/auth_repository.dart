import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';

import '../domain/auth_state.dart';

export '../domain/auth_state.dart' show Account, AccountMembership;

abstract interface class AuthRepository {
  Future<Account> login(String identity, String password);
  Future<Account?> restore();
  Future<void> logout();
}

final class ApiAuthRepository implements AuthRepository {
  const ApiAuthRepository({
    required SarayaApiClient apiClient,
    required SessionStore sessionStore,
    required bool isNative,
  }) : _apiClient = apiClient,
       _sessionStore = sessionStore,
       _isNative = isNative;

  final SarayaApiClient _apiClient;
  final SessionStore _sessionStore;
  final bool _isNative;

  @override
  Future<Account> login(String identity, String password) async {
    await _sessionStore.clear();
    try {
      final response = await _apiClient.postJson(
        '/api/saraya/v1/auth/login',
        data: {'identity': identity.trim(), 'password': password},
      );
      final payload = _jsonObject(response, 200);
      final accessToken = _requiredString(payload, 'accessToken', 200);
      final session = _isNative
          ? SessionTokens(
              accessToken: accessToken,
              refreshToken: _requiredString(payload, 'refreshToken', 200),
            )
          : SessionTokens(
              accessToken: accessToken,
              csrfToken: _requiredString(payload, 'csrfToken', 200),
            );
      await _sessionStore.write(session);
      return await _loadAccount();
    } catch (_) {
      await _sessionStore.clear();
      rethrow;
    }
  }

  @override
  Future<Account?> restore() async {
    if (await _sessionStore.read() == null) return null;
    try {
      return await _loadAccount();
    } on ApiError catch (error) {
      if (error.status == 401 || error.status == 403) {
        await _sessionStore.clear();
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _apiClient.postJson('/api/saraya/v1/auth/logout');
    } finally {
      await _sessionStore.clear();
    }
  }

  Future<Account> _loadAccount() async {
    final response = await _apiClient.getJson('/api/saraya/v1/account');
    final payload = _jsonObject(response, 200);
    final rawMemberships = payload['memberships'];
    if (rawMemberships is! List) throw ApiError.invalidResponse(200);

    return Account(
      id: _requiredString(payload, 'id', 200),
      displayNameAr: _requiredString(payload, 'displayNameAr', 200),
      displayNameEn: _requiredString(payload, 'displayNameEn', 200),
      email: _optionalString(payload['email']),
      phone: _optionalString(payload['phone']),
      memberships: rawMemberships
          .map((value) => _membership(value, 200))
          .toList(growable: false),
    );
  }
}

Map<String, Object?> _jsonObject(Object? value, int status) {
  if (value is Map) return Map<String, Object?>.from(value);
  throw ApiError.invalidResponse(status);
}

String _requiredString(Map<String, Object?> payload, String key, int status) {
  final value = payload[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(status);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;

AccountMembership _membership(Object? value, int status) {
  if (value is! Map) throw ApiError.invalidResponse(status);
  final payload = Map<String, Object?>.from(value);
  final propertyId = _requiredString(payload, 'propertyId', status);
  final propertyNameAr = _requiredString(payload, 'propertyNameAr', status);
  final propertyNameEn = _requiredString(payload, 'propertyNameEn', status);
  final rawRole = _requiredString(payload, 'role', status);
  final role = switch (rawRole) {
    'super_admin' => AppRole.superAdmin,
    'property_manager' => AppRole.propertyManager,
    'accountant' => AppRole.accountant,
    'maintenance' => AppRole.maintenance,
    'owner' => AppRole.owner,
    'tenant' => AppRole.tenant,
    'visitor' => AppRole.visitor,
    _ => throw ApiError.invalidResponse(status),
  };
  return AccountMembership(
    propertyId: propertyId,
    propertyNameAr: propertyNameAr,
    propertyNameEn: propertyNameEn,
    role: role,
  );
}
