import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';
import 'package:saraya_square_app/features/account/presentation/account_screen.dart';
import 'package:saraya_square_app/features/auth/domain/auth_state.dart';

void main() {
  testWidgets('loads editable profile without exposing internal identifiers', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);

    expect(find.text('Saraya Admin'), findsOneWidget);
    expect(find.text('Saraya Square'), findsOneWidget);
    expect(find.text('property-1'), findsNothing);
    expect(find.text('user-1'), findsNothing);
  });

  testWidgets('pull to refresh reloads the visible account data', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);
    repository.profile = repository.profile.copyWith(
      displayNameEn: 'Updated Saraya Admin',
    );

    await tester.drag(find.byType(ListView), const Offset(0, 360));
    await tester.pumpAndSettle();

    expect(repository.loadCount, 2);
    expect(find.text('Updated Saraya Admin'), findsOneWidget);
  });

  testWidgets('identity changes require the current password', (tester) async {
    final repository = _Repository();
    await _pump(tester, repository);

    await tester.enterText(
      find.byKey(const Key('account-email')),
      'new@example.com',
    );
    await _scrollTo(tester, const Key('account-save'));
    await tester.tap(find.byKey(const Key('account-save')));
    await tester.pumpAndSettle();

    expect(find.text('Current password is required.'), findsOneWidget);
    expect(repository.updates, isEmpty);
  });

  testWidgets('name-only changes do not send the current password', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);

    await tester.enterText(
      find.byKey(const Key('account-display-name-en')),
      'Saraya Manager',
    );
    await _scrollTo(tester, const Key('account-save'));
    await tester.tap(find.byKey(const Key('account-save')));
    await tester.pumpAndSettle();

    expect(repository.updates.single.displayNameEn, 'Saraya Manager');
    expect(repository.updates.single.currentPassword, isNull);
  });

  testWidgets('matching password confirmation is required before submission', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);

    await tester.enterText(
      find.byKey(const Key('password-current')),
      'current-secret',
    );
    await tester.enterText(
      find.byKey(const Key('password-new')),
      'new-secret-123',
    );
    await tester.enterText(
      find.byKey(const Key('password-confirm')),
      'different-secret',
    );
    await _scrollTo(tester, const Key('password-save'));
    await tester.tap(find.byKey(const Key('password-save')));
    await tester.pumpAndSettle();

    expect(find.text('Passwords do not match.'), findsOneWidget);
    expect(repository.passwordChanges, isEmpty);
  });

  testWidgets('successful password change clears all secret fields', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);

    for (final entry in {
      'password-current': 'current-secret',
      'password-new': 'new-secret-123',
      'password-confirm': 'new-secret-123',
    }.entries) {
      await tester.enterText(find.byKey(Key(entry.key)), entry.value);
    }
    await _scrollTo(tester, const Key('password-save'));
    await tester.tap(find.byKey(const Key('password-save')));
    await tester.pumpAndSettle();

    expect(repository.passwordChanges, [('current-secret', 'new-secret-123')]);
    for (final key in [
      'password-current',
      'password-new',
      'password-confirm',
    ]) {
      final field = find.descendant(
        of: find.byKey(Key(key)),
        matching: find.byType(TextFormField),
      );
      expect(tester.widget<TextFormField>(field).controller?.text, '');
    }
  });

  testWidgets('profile and security cards adapt from columns to a stack', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await _pump(tester, _Repository());

    final desktopProfile = tester.getTopLeft(
      find.byKey(const Key('account-profile-card')),
    );
    final desktopSecurity = tester.getTopLeft(
      find.byKey(const Key('account-security-card')),
    );
    expect(desktopProfile.dy, desktopSecurity.dy);

    await tester.binding.setSurfaceSize(const Size(390, 1000));
    await tester.pumpAndSettle();
    final mobileProfile = tester.getTopLeft(
      find.byKey(const Key('account-profile-card')),
    );
    final mobileSecurity = tester.getTopLeft(
      find.byKey(const Key('account-security-card')),
    );
    expect(mobileSecurity.dy, greaterThan(mobileProfile.dy));
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(WidgetTester tester, AccountRepository repository) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: AccountScreen(repository: repository, role: AppRole.superAdmin),
      ),
    ),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

Future<void> _scrollTo(WidgetTester tester, Key key) async {
  await tester.scrollUntilVisible(
    find.byKey(key),
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

final class _Repository implements AccountRepository {
  final List<AccountUpdate> updates = [];
  final List<(String, String)> passwordChanges = [];
  AccountProfile profile = _profile;
  int loadCount = 0;

  @override
  Future<AccountProfile> load() async {
    loadCount += 1;
    return profile;
  }

  @override
  Future<AccountProfile> update(AccountUpdate input) async {
    updates.add(input);
    profile = profile.copyWith(
      displayNameAr: input.displayNameAr,
      displayNameEn: input.displayNameEn,
      email: input.email,
      phone: input.phone,
    );
    return profile;
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    passwordChanges.add((currentPassword, newPassword));
  }
}

const _profile = AccountProfile(
  id: 'user-1',
  displayNameAr: 'مدير سرايا',
  displayNameEn: 'Saraya Admin',
  email: 'admin@example.com',
  phone: '+97333333333',
  memberships: [
    AccountMembership(
      propertyId: 'property-1',
      propertyNameAr: 'سرايا سكوير',
      propertyNameEn: 'Saraya Square',
      role: AppRole.superAdmin,
    ),
  ],
);
