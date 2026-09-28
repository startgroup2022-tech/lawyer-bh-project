import 'package:flutter/foundation.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';

sealed class AccountState {
  const AccountState();
}

final class AccountLoading extends AccountState {
  const AccountLoading();
}

final class AccountLoaded extends AccountState {
  const AccountLoaded(this.profile);

  final AccountProfile profile;
}

final class AccountFailure extends AccountState {
  const AccountFailure();
}

final class AccountController extends ChangeNotifier {
  AccountController(this._repository);

  final AccountRepository _repository;
  AccountState state = const AccountLoading();
  bool isSavingProfile = false;
  bool isChangingPassword = false;

  Future<void> load() async {
    state = const AccountLoading();
    notifyListeners();
    try {
      state = AccountLoaded(await _repository.load());
    } catch (_) {
      state = const AccountFailure();
    }
    notifyListeners();
  }

  Future<bool> update(AccountUpdate input) async {
    isSavingProfile = true;
    notifyListeners();
    try {
      state = AccountLoaded(await _repository.update(input));
      return true;
    } catch (_) {
      return false;
    } finally {
      isSavingProfile = false;
      notifyListeners();
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    isChangingPassword = true;
    notifyListeners();
    try {
      await _repository.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return true;
    } catch (_) {
      return false;
    } finally {
      isChangingPassword = false;
      notifyListeners();
    }
  }
}
