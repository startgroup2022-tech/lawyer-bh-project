import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/core/widgets/async_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpShell(
    WidgetTester tester, {
    required double width,
    required Locale locale,
    AppRole role = AppRole.superAdmin,
    Set<AppCapability>? capabilities,
  }) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = Size(width, width == 390 ? 844 : 900);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        locale: locale,
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: AppShell(
          role: role,
          capabilities: capabilities,
          selectedPath: '/dashboard',
          onNavigate: (_) {},
          title: const Text('Operations'),
          actions: const [
            IconButton(onPressed: null, icon: Icon(Icons.notifications)),
          ],
          child: const Center(child: Text('Executive summary')),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('390px Arabic uses RTL bottom navigation without desktop rail', (
    tester,
  ) async {
    await pumpShell(tester, width: 390, locale: const Locale('ar'));

    expect(find.byKey(const Key('saraya-bottom-navigation')), findsOneWidget);
    expect(
      find.byKey(const Key('saraya-grouped-side-navigation')),
      findsNothing,
    );
    expect(
      find.byKey(const Key('saraya-compact-navigation-rail')),
      findsNothing,
    );
    expect(
      Directionality.of(tester.element(find.text('نظرة عامة'))),
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('authorized mobile navigation exposes viewing appointments', (
    tester,
  ) async {
    await pumpShell(
      tester,
      width: 390,
      locale: const Locale('en'),
      role: AppRole.propertyManager,
    );

    expect(find.text('Viewing appointments'), findsOneWidget);
    expect(find.text('Rental requests'), findsOneWidget);
  });

  testWidgets(
    '1440px English uses grouped side navigation without bottom bar',
    (tester) async {
      await pumpShell(tester, width: 1440, locale: const Locale('en'));

      expect(
        find.byKey(const Key('saraya-grouped-side-navigation')),
        findsOneWidget,
      );
      expect(find.byKey(const Key('saraya-bottom-navigation')), findsNothing);
      expect(find.text('Portfolio'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('Overview'))),
        TextDirection.ltr,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('700px surface uses the compact navigation rail', (tester) async {
    await pumpShell(tester, width: 700, locale: const Locale('en'));

    expect(
      find.byKey(const Key('saraya-compact-navigation-rail')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('saraya-bottom-navigation')), findsNothing);
    expect(
      find.byKey(const Key('saraya-grouped-side-navigation')),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('role capabilities hide management destinations', (tester) async {
    await pumpShell(
      tester,
      width: 1440,
      locale: const Locale('en'),
      role: AppRole.tenant,
    );

    expect(find.text('My account'), findsOneWidget);
    expect(find.text('Properties'), findsNothing);
    expect(find.text('Team'), findsNothing);
    expect(find.textContaining('tenant'), findsNothing);
  });

  testWidgets('accountant sees finance but not team or maintenance', (
    tester,
  ) async {
    await pumpShell(
      tester,
      width: 1440,
      locale: const Locale('en'),
      role: AppRole.accountant,
    );

    expect(find.text('Invoices'), findsOneWidget);
    expect(find.text('Rental requests'), findsOneWidget);
    expect(find.text('Reports'), findsOneWidget);
    expect(find.text('Units'), findsNothing);
    expect(find.text('Leases'), findsNothing);
    expect(find.text('Maintenance'), findsNothing);
    expect(find.text('Team'), findsNothing);
  });

  testWidgets('explicit capabilities cannot elevate accountant access', (
    tester,
  ) async {
    await pumpShell(
      tester,
      width: 1440,
      locale: const Locale('en'),
      role: AppRole.accountant,
      capabilities: const {
        AppCapability.viewDashboard,
        AppCapability.manageInvoices,
        AppCapability.manageTeam,
      },
    );

    expect(find.text('Invoices'), findsOneWidget);
    expect(find.text('Team'), findsNothing);
  });

  testWidgets('maintenance sees operations but not invoices or team', (
    tester,
  ) async {
    await pumpShell(
      tester,
      width: 1440,
      locale: const Locale('en'),
      role: AppRole.maintenance,
    );

    expect(find.text('Units'), findsOneWidget);
    expect(find.text('Maintenance'), findsOneWidget);
    expect(find.text('Documents'), findsOneWidget);
    expect(find.text('Invoices'), findsNothing);
    expect(find.text('Team'), findsNothing);
  });

  testWidgets('owner sees units and invoices but not team', (tester) async {
    await pumpShell(
      tester,
      width: 1440,
      locale: const Locale('en'),
      role: AppRole.owner,
    );

    expect(find.text('Units'), findsOneWidget);
    expect(find.text('Invoices'), findsOneWidget);
    expect(find.text('Rental requests'), findsOneWidget);
    expect(find.text('Team'), findsNothing);
  });

  testWidgets(
    'AsyncContent distinguishes loading, empty, permission and error',
    (tester) async {
      Future<void> pumpState(AsyncContent<String> content) async {
        await tester.pumpWidget(
          MaterialApp(
            locale: const Locale('en'),
            theme: SarayaTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(body: content),
          ),
        );
        await tester.pump();
      }

      await pumpState(AsyncContent.loading(builder: Text.new));
      expect(find.byKey(const Key('async-loading-skeleton')), findsOneWidget);

      await pumpState(AsyncContent.empty(builder: Text.new));
      expect(find.text('No data yet'), findsOneWidget);

      await pumpState(AsyncContent.permissionDenied(builder: Text.new));
      expect(
        find.text('You do not have permission to view this content'),
        findsOneWidget,
      );

      await pumpState(AsyncContent.error(builder: Text.new, onRetry: () {}));
      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);

      await pumpState(
        AsyncContent.data(data: 'Loaded content', builder: Text.new),
      );
      expect(find.text('Loaded content'), findsOneWidget);
    },
  );

  testWidgets(
    'captures approved direction C Arabic mobile and desktop shells',
    (tester) async {
      await pumpShell(tester, width: 390, locale: const Locale('ar'));
      await expectLater(
        find.byType(AppShell),
        matchesGoldenFile('goldens/app_shell_ar_390.png'),
      );

      await pumpShell(tester, width: 1440, locale: const Locale('ar'));
      await expectLater(
        find.byType(AppShell),
        matchesGoldenFile('goldens/app_shell_ar_1440.png'),
      );
    },
  );
}
