import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';

sealed class AuthState {
  const AuthState();
}

final class AuthChecking extends AuthState {
  const AuthChecking();

  @override
  String toString() => 'AuthChecking()';
}

final class Unauthenticated extends AuthState {
  const Unauthenticated();

  @override
  String toString() => 'Unauthenticated()';
}

final class Authenticating extends AuthState {
  const Authenticating();

  @override
  String toString() => 'Authenticating()';
}

final class Authenticated extends AuthState {
  const Authenticated({
    required this.account,
    required this.selectedMembership,
  });

  final Account account;
  final AccountMembership? selectedMembership;

  bool get needsMembershipSelection =>
      account.memberships.length > 1 && selectedMembership == null;

  @override
  String toString() =>
      'Authenticated(account: ${account.id}, role: ${selectedMembership?.role})';
}

final class AuthFailure extends AuthState {
  const AuthFailure(this.error);

  final ApiError error;

  @override
  String toString() => 'AuthFailure(${error.code})';
}

final class Account {
  const Account({
    required this.id,
    required this.displayNameAr,
    required this.displayNameEn,
    required this.email,
    required this.phone,
    required this.memberships,
  });

  final String id;
  final String displayNameAr;
  final String displayNameEn;
  final String? email;
  final String? phone;
  final List<AccountMembership> memberships;

  @override
  String toString() => 'Account($id)';
}

final class AccountMembership {
  const AccountMembership({
    required this.propertyId,
    required this.propertyNameAr,
    required this.propertyNameEn,
    required this.role,
  });

  final String propertyId;
  final String propertyNameAr;
  final String propertyNameEn;
  final AppRole role;

  @override
  String toString() => 'AccountMembership($role)';
}
