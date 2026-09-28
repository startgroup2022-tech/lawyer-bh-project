import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';
import 'package:saraya_square_app/features/public_home/presentation/public_home_screen.dart';

void main() {
  testWidgets(
    'desktop public header shows the Saraya brand and labeled account entry',
    (tester) async {
      var loginRequested = false;
      await tester.binding.setSurfaceSize(const Size(1100, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await _pump(
        tester,
        locale: const Locale('en'),
        repository: _Repository(_inventory()),
        onLogin: () => loginRequested = true,
      );

      expect(find.byKey(const Key('public-brand-logo')), findsOneWidget);
      expect(find.text('Admin and tenant login'), findsOneWidget);

      await tester.tap(find.byKey(const Key('public-login')));
      expect(loginRequested, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'compact Arabic public home keeps brand and account entry clear',
    (tester) async {
      var loginRequested = false;
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await _pump(
        tester,
        locale: const Locale('ar'),
        repository: _Repository(_inventory()),
        onLogin: () => loginRequested = true,
      );

      expect(find.byKey(const Key('public-brand-logo')), findsOneWidget);
      expect(find.byKey(const Key('public-login')), findsOneWidget);
      expect(find.byKey(const Key('public-hero-login')), findsOneWidget);
      expect(find.text('دخول الإدارة والمستأجرين'), findsNWidgets(2));

      await tester.tap(find.byKey(const Key('public-hero-login')));
      expect(loginRequested, isTrue);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Arabic public home shows units and virtual addresses without login',
    (tester) async {
      var loginRequested = false;
      await tester.binding.setSurfaceSize(const Size(390, 1800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await _pump(
        tester,
        locale: const Locale('ar'),
        repository: _Repository(_inventory()),
        onLogin: () => loginRequested = true,
      );

      expect(find.text('أعمالك تبدأ من عنوان مميز'), findsOneWidget);
      expect(find.text('الوحدات المتاحة'), findsOneWidget);
      expect(find.text('مكتب ١٠١'), findsOneWidget);
      expect(find.text('العناوين الافتراضية'), findsOneWidget);
      expect(find.text('47'), findsOneWidget);
      expect(
        tester
            .widget<Directionality>(find.byType(Directionality).first)
            .textDirection,
        TextDirection.rtl,
      );
      expect(tester.takeException(), isNull);

      await tester.tap(find.byKey(const Key('public-login')));
      expect(loginRequested, isTrue);
    },
  );

  testWidgets('English public home localizes cards and language direction', (
    tester,
  ) async {
    await _pump(
      tester,
      locale: const Locale('en'),
      repository: _Repository(_inventory()),
    );

    expect(
      find.text('Your business starts at a distinguished address'),
      findsOneWidget,
    );
    expect(find.text('Available units'), findsOneWidget);
    expect(find.text('Office 101'), findsOneWidget);
    expect(find.text('Virtual addresses'), findsOneWidget);
    expect(
      tester
          .widget<Directionality>(find.byType(Directionality).first)
          .textDirection,
      TextDirection.ltr,
    );
  });

  testWidgets('tapping an available unit opens its public details', (
    tester,
  ) async {
    String? selectedUnitId;
    await _pump(
      tester,
      repository: _Repository(_inventory()),
      onOpenUnit: (unitId) => selectedUnitId = unitId,
    );

    final card = find.byKey(const Key('public-unit-unit-101'));
    await tester.ensureVisible(card);
    await tester.tap(card);

    expect(selectedUnitId, 'unit-101');
  });

  testWidgets('public home keeps safe content visible when loading fails', (
    tester,
  ) async {
    await _pump(tester, repository: _FailingRepository());

    expect(
      find.text('Your business starts at a distinguished address'),
      findsOneWidget,
    );
    expect(find.text('Live availability could not be loaded.'), findsOneWidget);
    expect(find.textContaining('database-secret'), findsNothing);
    expect(find.byKey(const Key('public-login')), findsOneWidget);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  Locale locale = const Locale('en'),
  required PublicHomeRepository repository,
  VoidCallback? onLogin,
  ValueChanged<String>? onOpenUnit,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: PublicHomeScreen(
        repository: repository,
        onLogin: onLogin ?? () {},
        onOpenUnit: onOpenUnit ?? (_) {},
        onLocaleChanged: (_) {},
      ),
    ),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

PublicHomeInventory _inventory() => const PublicHomeInventory(
  units: [
    PublicUnitListing(
      id: 'unit-101',
      propertyId: 'property-1',
      propertyNameAr: 'سرايا سكوير',
      propertyNameEn: 'Saraya Square',
      unitNumber: '101',
      unitType: 'office',
      displayNameAr: 'مكتب ١٠١',
      displayNameEn: 'Office 101',
      descriptionAr: 'مكتب خاص جاهز للعمل',
      descriptionEn: 'A private office ready for work',
      imageKey: 'office_101',
      floor: '1',
      marketRent: '450.000',
      areaSquareMeters: '20.000',
      availableFrom: null,
      status: 'vacant',
    ),
  ],
  virtualAddresses: PublicVirtualAddressSummary(total: 50, available: 47),
);

final class _Repository implements PublicHomeRepository {
  const _Repository(this.inventory);

  final PublicHomeInventory inventory;

  @override
  Future<PublicHomeInventory> load() async => inventory;
}

final class _FailingRepository implements PublicHomeRepository {
  @override
  Future<PublicHomeInventory> load() async =>
      throw Exception('database-secret');
}
