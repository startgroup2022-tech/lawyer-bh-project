import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/auth/data/auth_repository.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';
import 'package:saraya_square_app/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets(
    'shows localized required errors and password visibility control',
    (tester) async {
      final controller = AuthController(_LoginRepository());
      await _pumpLogin(
        tester,
        controller: controller,
        locale: const Locale('ar'),
      );

      await tester.tap(find.byKey(const Key('login-submit')));
      await tester.pump();

      expect(find.text('أدخل البريد الإلكتروني أو رقم الهاتف'), findsOneWidget);
      expect(find.text('أدخل كلمة المرور'), findsOneWidget);

      final passwordField = find.descendant(
        of: find.byKey(const Key('login-password')),
        matching: find.byType(EditableText),
      );
      expect(tester.widget<EditableText>(passwordField).obscureText, isTrue);
      await tester.tap(find.byKey(const Key('login-password-visibility')));
      await tester.pump();
      expect(tester.widget<EditableText>(passwordField).obscureText, isFalse);
    },
  );

  testWidgets('keyboard submission surfaces the bilingual API error', (
    tester,
  ) async {
    final controller = AuthController(
      _LoginRepository(
        error: const ApiError(
          status: 401,
          code: 'INVALID_CREDENTIALS',
          messageAr: 'بيانات الدخول غير صحيحة',
          messageEn: 'Invalid credentials',
        ),
      ),
    );
    await _pumpLogin(
      tester,
      controller: controller,
      locale: const Locale('en'),
    );
    await tester.enterText(
      find.byKey(const Key('login-identity')),
      'admin@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('login-password')),
      'not-the-password',
    );

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(find.text('Invalid credentials'), findsOneWidget);
    expect(controller.state.toString(), isNot(contains('not-the-password')));
  });

  testWidgets('locale switch requests English from the Arabic login screen', (
    tester,
  ) async {
    Locale? requested;
    await _pumpLogin(
      tester,
      controller: AuthController(_LoginRepository()),
      locale: const Locale('ar'),
      onLocaleChanged: (locale) => requested = locale,
    );

    await tester.tap(find.byKey(const Key('login-locale-switch')));

    expect(requested, const Locale('en'));
  });
}

Future<void> _pumpLogin(
  WidgetTester tester, {
  required AuthController controller,
  required Locale locale,
  ValueChanged<Locale>? onLocaleChanged,
}) {
  return tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: LoginScreen(
        authController: controller,
        onLocaleChanged: onLocaleChanged ?? (_) {},
      ),
    ),
  );
}

final class _LoginRepository implements AuthRepository {
  _LoginRepository({this.error});

  final ApiError? error;

  @override
  Future<Account> login(String identity, String password) async {
    if (error case final error?) throw error;
    return const Account(
      id: 'user-1',
      displayNameAr: 'مدير',
      displayNameEn: 'Admin',
      email: 'admin@example.com',
      phone: null,
      memberships: [],
    );
  }

  @override
  Future<void> logout() async {}

  @override
  Future<Account?> restore() async => null;
}
