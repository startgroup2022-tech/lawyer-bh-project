import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'session_store.dart';
import 'session_tokens.dart';

final class NativeSessionStore implements SessionStore {
  const NativeSessionStore(this._storage);

  static const _accessKey = 'saraya.session.access';
  static const _refreshKey = 'saraya.session.refresh';
  static const _csrfKey = 'saraya.session.csrf';

  final FlutterSecureStorage _storage;

  @override
  Future<SessionTokens?> read() async {
    final accessToken = await _storage.read(key: _accessKey);
    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }

    return SessionTokens(
      accessToken: accessToken,
      refreshToken: await _storage.read(key: _refreshKey),
      csrfToken: await _storage.read(key: _csrfKey),
    );
  }

  @override
  Future<void> write(SessionTokens value) async {
    await Future.wait([
      _storage.write(key: _accessKey, value: value.accessToken),
      _writeNullable(_refreshKey, value.refreshToken),
      _writeNullable(_csrfKey, value.csrfToken),
    ]);
  }

  @override
  Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _accessKey),
      _storage.delete(key: _refreshKey),
      _storage.delete(key: _csrfKey),
    ]);
  }

  Future<void> _writeNullable(String key, String? value) {
    if (value == null || value.isEmpty) {
      return _storage.delete(key: key);
    }
    return _storage.write(key: key, value: value);
  }
}
