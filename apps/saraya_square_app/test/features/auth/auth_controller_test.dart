import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/auth/data/auth_repository.dart';
import 'package:saraya_square_app/features/auth/domain/auth_state.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';

void main() {
  test(
    'multiple memberships require an explicit selection using AppRole',
    () async {
      final repository = _CallbackAuthRepository(
        loginResult: Account(
          id: 'user-1',
          displayNameAr: 'أحمد',
          displayNameEn: 'Ahmed',
          email: 'a@example.com',
          phone: null,
          memberships: const [
            AccountMembership(
              propertyId: 'property-1',
              propertyNameAr: 'سرايا سكوير',
              propertyNameEn: 'Saraya Square',
              role: AppRole.propertyManager,
            ),
            AccountMembership(
              propertyId: 'property-2',
              propertyNameAr: 'سرايا بارك',
              propertyNameEn: 'Saraya Park',
              role: AppRole.owner,
            ),
          ],
        ),
      );
      final controller = AuthController(repository);

      await controller.login('a@example.com', 'private-password');

      final awaitingSelection = controller.state as Authenticated;
      expect(awaitingSelection.selectedMembership, isNull);
      expect(awaitingSelection.needsMembershipSelection, isTrue);
      expect(controller.state.toString(), isNot(contains('private-password')));

      controller.selectMembership('property-2');

      final selected = controller.state as Authenticated;
      expect(selected.selectedMembership?.role, AppRole.owner);
      expect(selected.needsMembershipSelection, isFalse);
    },
  );

  test('one membership is selected automatically during restoration', () async {
    final membership = const AccountMembership(
      propertyId: 'property-1',
      propertyNameAr: 'سرايا سكوير',
      propertyNameEn: 'Saraya Square',
      role: AppRole.tenant,
    );
    final repository = _CallbackAuthRepository(
      restoreResult: Account(
        id: 'user-1',
        displayNameAr: 'مستأجر',
        displayNameEn: 'Tenant',
        email: null,
        phone: '+97339000000',
        memberships: [membership],
      ),
    );
    final controller = AuthController(repository);

    await controller.restore();

    expect((controller.state as Authenticated).selectedMembership, membership);
  });

  test('OTP session adoption notifies account state immediately', () async {
    final controller = AuthController(
      _CallbackAuthRepository(
        restoreResult: const Account(
          id: 'otp-user',
          displayNameAr: 'مستأجر',
          displayNameEn: 'Tenant',
          email: 'tenant@example.com',
          phone: null,
          memberships: [],
        ),
      ),
    );
    var notifications = 0;
    controller.addListener(() => notifications++);

    await controller.adoptCurrentSession();

    expect(controller.state, isA<Authenticated>());
    expect((controller.state as Authenticated).account.id, 'otp-user');
    expect(notifications, 1);
  });

  test(
    'logout transitions to unauthenticated and forgets the account',
    () async {
      final repository = _CallbackAuthRepository(
        restoreResult: Account(
          id: 'user-1',
          displayNameAr: 'أحمد',
          displayNameEn: 'Ahmed',
          email: 'a@example.com',
          phone: null,
          memberships: const [],
        ),
      );
      final controller = AuthController(repository);
      await controller.restore();

      await controller.logout();

      expect(controller.state, isA<Unauthenticated>());
      expect(repository.logoutCalls, 1);
    },
  );
}

final class _CallbackAuthRepository implements AuthRepository {
  _CallbackAuthRepository({this.loginResult, this.restoreResult});

  final Account? loginResult;
  final Account? restoreResult;
  int logoutCalls = 0;

  @override
  Future<Account> login(String identity, String password) async => loginResult!;

  @override
  Future<void> logout() async {
    logoutCalls++;
  }

  @override
  Future<Account?> restore() async => restoreResult;
}
