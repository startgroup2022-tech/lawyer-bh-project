import 'package:shared_preferences/shared_preferences.dart';

import 'session_store.dart';
import 'session_tokens.dart';

final class WebSessionStore implements SessionStore {
  WebSessionStore(this._preferences);

  static const _csrfKey = 'saraya.csrf';

  final SharedPreferences _preferences;
  String? _accessToken;

  @override
  Future<SessionTokens?> read() async {
    final accessToken = _accessToken;
    final csrfToken = _preferences.getString(_csrfKey);
    if ((accessToken == null || accessToken.isEmpty) &&
        (csrfToken == null || csrfToken.isEmpty)) {
      return null;
    }

    return SessionTokens(accessToken: accessToken ?? '', csrfToken: csrfToken);
  }

  @override
  Future<void> write(SessionTokens value) async {
    _accessToken = value.accessToken;
    final csrfToken = value.csrfToken;
    if (csrfToken == null || csrfToken.isEmpty) {
      await _preferences.remove(_csrfKey);
      return;
    }
    await _preferences.setString(_csrfKey, csrfToken);
  }

  @override
  Future<void> clear() async {
    _accessToken = null;
    await _preferences.remove(_csrfKey);
  }
}
