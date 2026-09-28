import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/localization/status_labels.dart';

void main() {
  testWidgets('Arabic and English locales set the correct reading direction', (
    tester,
  ) async {
    Future<void> pumpLocale(Locale locale) async {
      await tester.pumpWidget(
        SarayaApp(
          config: AppConfig(apiBaseUrl: Uri.parse('https://example.test')),
          locale: locale,
        ),
      );
      await tester.pumpAndSettle();
    }

    await pumpLocale(const Locale('ar'));
    expect(
      Directionality.of(tester.element(find.text('سرايا سكوير'))),
      TextDirection.rtl,
    );

    await pumpLocale(const Locale('en'));
    expect(find.text('Saraya Square'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('Saraya Square'))),
      TextDirection.ltr,
    );
  });

  testWidgets('theme keeps controls touchable and focus visible', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: SarayaTheme.light,
        home: Scaffold(
          body: Center(
            child: FilledButton(onPressed: () {}, child: const Text('Action')),
          ),
        ),
      ),
    );

    expect(SarayaTheme.light.colorScheme.primary, SarayaColors.deepGreen);
    expect(SarayaTheme.light.focusColor.a, greaterThan(0));
    expect(
      tester.getSize(find.byType(FilledButton)).height,
      greaterThanOrEqualTo(44),
    );

    final cardShape =
        SarayaTheme.light.cardTheme.shape! as RoundedRectangleBorder;
    final radius = cardShape.borderRadius.resolve(TextDirection.ltr).topLeft.x;
    expect(radius, inInclusiveRange(12, 18));
  });

  testWidgets(
    'stable codes are localized and unknown codes never leak raw text',
    (tester) async {
      late AppLocalizations strings;
      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Builder(
            builder: (context) {
              strings = AppLocalizations.of(context)!;
              return const SizedBox.shrink();
            },
          ),
        ),
      );

      expect(localizedUnitStatus(strings, 'vacant'), 'Vacant');
      expect(localizedRoleLabel(strings, 'super_admin'), 'Super administrator');
      expect(
        localizedRoleLabel(strings, 'property_manager'),
        'Property manager',
      );
      expect(localizedRoleLabel(strings, 'accountant'), 'Accountant');
      expect(localizedRoleLabel(strings, 'maintenance'), 'Maintenance team');
      expect(localizedRoleLabel(strings, 'owner'), 'Owner');
      expect(localizedInvoiceStatus(strings, 'due'), 'Due');
      expect(
        localizedUnitStatus(strings, 'server_only_value'),
        'Unknown status',
      );
      expect(
        localizedUnitStatus(strings, 'server_only_value'),
        isNot(contains('server_only')),
      );
    },
  );
}
