import '../session/session_tokens.dart';

typedef RefreshSession = Future<SessionTokens> Function();

final class RefreshCoordinator {
  RefreshCoordinator(this._refreshSession);

  final RefreshSession _refreshSession;
  Future<SessionTokens>? _activeRefresh;

  Future<SessionTokens> refresh() {
    final activeRefresh = _activeRefresh;
    if (activeRefresh != null) {
      return activeRefresh;
    }

    final refresh = _refreshSession();
    _activeRefresh = refresh;
    return refresh.whenComplete(() {
      if (identical(_activeRefresh, refresh)) {
        _activeRefresh = null;
      }
    });
  }
}
