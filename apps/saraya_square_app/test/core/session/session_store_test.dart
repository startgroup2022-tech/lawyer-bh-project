import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/session/native_session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/core/session/web_session_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('native store persists and clears session tokens securely', () async {
    FlutterSecureStorage.setMockInitialValues({});
    const secureStorage = FlutterSecureStorage();
    final store = NativeSessionStore(secureStorage);
    const tokens = SessionTokens(
      accessToken: 'access',
      refreshToken: 'refresh',
      csrfToken: 'csrf',
    );

    await store.write(tokens);

    expect(await store.read(), tokens);
    await store.clear();
    expect(await store.read(), isNull);
  });

  test(
    'web store persists only CSRF and keeps access token in memory',
    () async {
      SharedPreferences.setMockInitialValues({});
      final preferences = await SharedPreferences.getInstance();
      final store = WebSessionStore(preferences);
      const tokens = SessionTokens(
        accessToken: 'access',
        refreshToken: 'refresh',
        csrfToken: 'csrf',
      );

      await store.write(tokens);

      expect(
        await store.read(),
        const SessionTokens(accessToken: 'access', csrfToken: 'csrf'),
      );
      expect(preferences.getKeys(), {'saraya.csrf'});
      expect(preferences.getString('saraya.csrf'), 'csrf');

      final reloadedStore = WebSessionStore(preferences);
      expect(
        await reloadedStore.read(),
        const SessionTokens(accessToken: '', csrfToken: 'csrf'),
      );
    },
  );
}
