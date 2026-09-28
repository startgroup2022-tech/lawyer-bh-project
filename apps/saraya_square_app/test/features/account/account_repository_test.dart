import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';

void main() {
  test('loads the authenticated account with named memberships', () async {
    final adapter = _QueueAdapter([const _Reply(200, _profileJson)]);
    final repository = _repository(adapter);

    final profile = await repository.load();

    expect(profile.displayNameEn, 'Saraya Admin');
    expect(profile.memberships.single.propertyNameEn, 'Saraya Square');
    expect(adapter.requests.single.method, 'GET');
    expect(adapter.requests.single.uri.path, '/api/saraya/v1/account');
  });

  test('sends current password when updating identity details', () async {
    final adapter = _QueueAdapter([const _Reply(200, _profileJson)]);
    final repository = _repository(adapter);

    await repository.update(
      const AccountUpdate(
        displayNameAr: 'مدير سرايا',
        displayNameEn: 'Saraya Admin',
        email: 'new@example.com',
        phone: '+97333333333',
        currentPassword: 'current-secret',
      ),
    );

    expect(adapter.requests.single.method, 'PATCH');
    expect(adapter.requests.single.uri.path, '/api/saraya/v1/account');
    expect(adapter.requests.single.data, {
      'displayNameAr': 'مدير سرايا',
      'displayNameEn': 'Saraya Admin',
      'email': 'new@example.com',
      'phone': '+97333333333',
      'currentPassword': 'current-secret',
    });
  });

  test('accepts an empty 204 response after changing password', () async {
    final adapter = _QueueAdapter([const _Reply(204, null)]);
    final repository = _repository(adapter);

    await repository.changePassword(
      currentPassword: 'current-secret',
      newPassword: 'new-secret-123',
    );

    expect(adapter.requests.single.method, 'POST');
    expect(
      adapter.requests.single.uri.path,
      '/api/saraya/v1/account/change-password',
    );
    expect(adapter.requests.single.data, {
      'currentPassword': 'current-secret',
      'newPassword': 'new-secret-123',
    });
  });
}

const _profileJson = <String, Object?>{
  'id': 'user-1',
  'displayNameAr': 'مدير سرايا',
  'displayNameEn': 'Saraya Admin',
  'email': 'admin@example.com',
  'phone': '+97333333333',
  'memberships': [
    {
      'propertyId': 'property-1',
      'propertyNameAr': 'سرايا سكوير',
      'propertyNameEn': 'Saraya Square',
      'role': 'super_admin',
    },
  ],
};

ApiAccountRepository _repository(_QueueAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
    ..httpClientAdapter = adapter;
  return ApiAccountRepository(
    SarayaApiClient(
      dio: dio,
      sessionStore: _EmptySessionStore(),
      isNative: false,
    ),
  );
}

final class _Reply {
  const _Reply(this.status, this.body);

  final int status;
  final Object? body;
}

final class _QueueAdapter implements HttpClientAdapter {
  _QueueAdapter(this.replies);

  final List<_Reply> replies;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final reply = replies.removeAt(0);
    return ResponseBody.fromString(
      reply.body == null ? '' : jsonEncode(reply.body),
      reply.status,
      headers: reply.body == null
          ? const {}
          : {
              Headers.contentTypeHeader: [Headers.jsonContentType],
            },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _EmptySessionStore implements SessionStore {
  @override
  Future<void> clear() async {}

  @override
  Future<SessionTokens?> read() async => null;

  @override
  Future<void> write(SessionTokens value) async {}
}
