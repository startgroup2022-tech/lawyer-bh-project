import 'package:flutter/foundation.dart';
import 'package:saraya_square_app/core/network/api_error.dart';

import '../data/auth_repository.dart';
import '../domain/auth_state.dart';

final class AuthController extends ChangeNotifier {
  AuthController(this._repository);

  final AuthRepository _repository;
  AuthState _state = const AuthChecking();

  AuthState get state => _state;

  Future<void> restore() async {
    _setState(const AuthChecking());
    try {
      final account = await _repository.restore();
      _setState(
        account == null
            ? const Unauthenticated()
            : _authenticatedAccount(account),
      );
    } on ApiError catch (error) {
      _setState(AuthFailure(error));
    }
  }

  Future<void> adoptCurrentSession() async {
    final account = await _repository.restore();
    _setState(
      account == null
          ? const Unauthenticated()
          : _authenticatedAccount(account),
    );
  }

  Future<void> login(String identity, String password) async {
    if (_state is Authenticating) return;
    _setState(const Authenticating());
    try {
      final account = await _repository.login(identity, password);
      _setState(_authenticatedAccount(account));
    } on ApiError catch (error) {
      _setState(AuthFailure(error));
    }
  }

  void selectMembership(String propertyId) {
    final current = _state;
    if (current is! Authenticated) return;
    final membership = current.account.memberships
        .where((item) => item.propertyId == propertyId)
        .firstOrNull;
    if (membership == null) return;
    _setState(
      Authenticated(account: current.account, selectedMembership: membership),
    );
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      _setState(const Unauthenticated());
    }
  }

  void expireSession() => _setState(const Unauthenticated());

  Authenticated _authenticatedAccount(Account account) {
    final selected = account.memberships.length == 1
        ? account.memberships.single
        : null;
    return Authenticated(account: account, selectedMembership: selected);
  }

  void _setState(AuthState state) {
    _state = state;
    notifyListeners();
  }
}
