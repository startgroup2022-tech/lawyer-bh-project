import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/auth/data/auth_repository.dart';

void main() {
  test(
    'invalid credentials are returned without refreshing a stale session',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(401, {
          'error': {
            'code': 'INVALID_CREDENTIALS',
            'messageAr': 'بيانات الدخول غير صحيحة',
            'messageEn': 'Invalid credentials',
          },
        }),
      ]);
      final store = _MemorySessionStore(
        const SessionTokens(
          accessToken: 'stale-access',
          refreshToken: 'stale-refresh',
        ),
      );
      final repository = _repository(adapter, store, isNative: true);

      await expectLater(
        repository.login('admin@example.com', 'not-the-password'),
        throwsA(
          isA<ApiError>().having(
            (error) => error.code,
            'code',
            'INVALID_CREDENTIALS',
          ),
        ),
      );

      expect(adapter.requests, hasLength(1));
      expect(adapter.requests.single.path, '/api/saraya/v1/auth/login');
      expect(store.value, isNull);
    },
  );

  test(
    'web login stores access and CSRF tokens without a refresh token',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(200, {
          'accessToken': 'web-access',
          'csrfToken': 'web-csrf',
        }),
        _JsonResponse(200, _account()),
      ]);
      final store = _MemorySessionStore(null);
      final repository = _repository(adapter, store, isNative: false);

      final account = await repository.login(
        'admin@example.com',
        'valid-value',
      );

      expect(account.displayNameEn, 'Saraya Admin');
      expect(account.memberships.single.propertyNameAr, 'سرايا سكوير');
      expect(account.memberships.single.propertyNameEn, 'Saraya Square');
      expect(
        store.value,
        const SessionTokens(accessToken: 'web-access', csrfToken: 'web-csrf'),
      );
      expect(adapter.requests.first.headers['x-saraya-client'], isNull);
      expect(adapter.requests[1].headers['Authorization'], 'Bearer web-access');
    },
  );

  test('native login stores access and refresh tokens', () async {
    final adapter = _ScriptedAdapter([
      _JsonResponse(200, {
        'accessToken': 'native-access',
        'refreshToken': 'native-refresh',
      }),
      _JsonResponse(200, _account()),
    ]);
    final store = _MemorySessionStore(null);
    final repository = _repository(adapter, store, isNative: true);

    await repository.login('+97339000000', 'valid-value');

    expect(
      store.value,
      const SessionTokens(
        accessToken: 'native-access',
        refreshToken: 'native-refresh',
      ),
    );
    expect(adapter.requests.first.headers['x-saraya-client'], 'native');
  });

  test(
    'restores a web session through CSRF and the HttpOnly cookie path',
    () async {
      final adapter = _ScriptedAdapter([
        _JsonResponse(401, {
          'error': {'code': 'ACCESS_TOKEN_REQUIRED'},
        }),
        _JsonResponse(200, {
          'accessToken': 'restored-access',
          'csrfToken': 'rotated-csrf',
        }),
        _JsonResponse(200, _account()),
      ]);
      final store = _MemorySessionStore(
        const SessionTokens(accessToken: '', csrfToken: 'persisted-csrf'),
      );
      final repository = _repository(adapter, store, isNative: false);

      final account = await repository.restore();

      expect(account?.id, 'user-1');
      expect(adapter.requests.map((request) => request.path), [
        '/api/saraya/v1/account',
        '/api/saraya/v1/auth/refresh',
        '/api/saraya/v1/account',
      ]);
      expect(adapter.requests[1].data, isNull);
      expect(adapter.requests[1].headers['x-saraya-csrf'], 'persisted-csrf');
      expect(
        store.value,
        const SessionTokens(
          accessToken: 'restored-access',
          csrfToken: 'rotated-csrf',
        ),
      );
    },
  );

  test('logout clears the local session after the server call', () async {
    final adapter = _ScriptedAdapter([const _JsonResponse(204, null)]);
    final store = _MemorySessionStore(
      const SessionTokens(accessToken: 'access', refreshToken: 'refresh'),
    );
    final repository = _repository(adapter, store, isNative: true);

    await repository.logout();

    expect(adapter.requests.single.path, '/api/saraya/v1/auth/logout');
    expect(store.value, isNull);
  });
}

ApiAuthRepository _repository(
  _ScriptedAdapter adapter,
  SessionStore store, {
  required bool isNative,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiAuthRepository(
    apiClient: SarayaApiClient(
      dio: dio,
      sessionStore: store,
      isNative: isNative,
    ),
    sessionStore: store,
    isNative: isNative,
  );
}

Map<String, Object?> _account({List<Map<String, Object?>>? memberships}) => {
  'id': 'user-1',
  'displayNameAr': 'مدير سرايا',
  'displayNameEn': 'Saraya Admin',
  'email': 'admin@example.com',
  'phone': null,
  'memberships':
      memberships ??
      [
        {
          'propertyId': 'property-1',
          'propertyNameAr': 'سرايا سكوير',
          'propertyNameEn': 'Saraya Square',
          'role': 'super_admin',
        },
      ],
};

final class _MemorySessionStore implements SessionStore {
  _MemorySessionStore(this.value);

  SessionTokens? value;

  @override
  Future<void> clear() async => value = null;

  @override
  Future<SessionTokens?> read() async => value;

  @override
  Future<void> write(SessionTokens value) async => this.value = value;
}

final class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.responses);

  final List<_JsonResponse> responses;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final response = responses.removeAt(0);
    return ResponseBody.fromString(
      response.body == null ? '' : jsonEncode(response.body),
      response.status,
      headers: response.body == null
          ? const {}
          : {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _JsonResponse {
  const _JsonResponse(this.status, this.body);

  final int status;
  final Object? body;
}
