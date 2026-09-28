import 'session_tokens.dart';

abstract interface class SessionStore {
  Future<SessionTokens?> read();
  Future<void> write(SessionTokens value);
  Future<void> clear();
}
