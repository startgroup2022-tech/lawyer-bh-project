import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';
import 'package:saraya_square_app/features/dashboard/presentation/dashboard_controller.dart';
import 'package:saraya_square_app/features/dashboard/presentation/dashboard_screen.dart';

void main() {
  testWidgets('zero summary stays truthful and has no invented attention', (
    tester,
  ) async {
    await _pumpDashboard(tester, _summary());

    expect(find.text('BHD 0.000'), findsNWidgets(3));
    expect(find.text('0'), findsNWidgets(4));
    expect(find.byKey(const Key('dashboard-attention-panel')), findsNothing);
    expect(find.byKey(const Key('dashboard-time-series-chart')), findsNothing);
    expect(find.textContaining('trend'), findsNothing);
    expect(find.textContaining('10%'), findsNothing);
  });

  testWidgets('positive values render exact counts and three-decimal BHD', (
    tester,
  ) async {
    await _pumpDashboard(
      tester,
      _summary(
        occupiedUnits: 14,
        vacantUnits: 6,
        tenantCount: 12,
        pendingRequests: 3,
        dueAmount: '1250.5',
        paidAmount: '9200.1254',
      ),
    );

    expect(find.text('14'), findsOneWidget);
    expect(find.text('6'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('3'), findsAtLeastNWidgets(1));
    expect(find.text('BHD 1,250.500'), findsNWidgets(2));
    expect(find.text('BHD 9,200.125'), findsOneWidget);
    expect(find.byKey(const Key('dashboard-attention-panel')), findsOneWidget);
    expect(find.byKey(const Key('attention-pending-requests')), findsOneWidget);
    expect(find.byKey(const Key('attention-due-amount')), findsOneWidget);
    expect(find.byKey(const Key('attention-overdue-amount')), findsNothing);
  });

  testWidgets(
    'overdue amount uses the danger token without exposing raw values',
    (tester) async {
      await _pumpDashboard(tester, _summary(overdueAmount: '400.25'));

      final amount = tester.widget<Text>(
        find.descendant(
          of: find.byKey(const Key('summary-overdue')),
          matching: find.text('BHD 400.250'),
        ),
      );
      expect(amount.style?.color, SarayaColors.danger);
      expect(find.byKey(const Key('attention-overdue-amount')), findsOneWidget);
      expect(find.text('property_manager'), findsNothing);
    },
  );

  testWidgets(
    'mobile cards use two columns then one without horizontal overflow',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 1100));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await _pumpDashboard(tester, _summary());

      final first = tester.getTopLeft(
        find.byKey(const Key('summary-occupied')),
      );
      final second = tester.getTopLeft(find.byKey(const Key('summary-vacant')));
      final third = tester.getTopLeft(find.byKey(const Key('summary-tenants')));
      expect(first.dy, second.dy);
      expect(third.dy, greaterThan(first.dy));
      expect(tester.takeException(), isNull);

      await tester.binding.setSurfaceSize(const Size(280, 1400));
      await tester.pumpAndSettle();
      final narrowFirst = tester.getTopLeft(
        find.byKey(const Key('summary-occupied')),
      );
      final narrowSecond = tester.getTopLeft(
        find.byKey(const Key('summary-vacant')),
      );
      expect(narrowSecond.dy, greaterThan(narrowFirst.dy));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('desktop summary uses a compact four-column first row', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1440, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await _pumpDashboard(tester, _summary());

    final occupied = tester.getTopLeft(
      find.byKey(const Key('summary-occupied')),
    );
    final vacant = tester.getTopLeft(find.byKey(const Key('summary-vacant')));
    final tenants = tester.getTopLeft(find.byKey(const Key('summary-tenants')));
    final pending = tester.getTopLeft(find.byKey(const Key('summary-pending')));
    expect({occupied.dy, vacant.dy, tenants.dy, pending.dy}, hasLength(1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('quick actions are limited by role', (tester) async {
    await _pumpDashboard(tester, _summary(), role: AppRole.accountant);

    expect(find.byKey(const Key('quick-action-invoices')), findsOneWidget);
    expect(find.byKey(const Key('quick-action-units')), findsNothing);
  });

  testWidgets('failure uses localized safe copy instead of raw error details', (
    tester,
  ) async {
    final controller = DashboardController(
      _FailingRepository(
        const ApiError(
          status: 500,
          code: 'DATABASE_SECRET_FAILURE',
          messageAr: 'raw-ar-secret',
          messageEn: 'raw-en-secret',
        ),
      ),
    );
    await _pumpController(tester, controller);

    expect(find.text('Something went wrong'), findsOneWidget);
    expect(find.textContaining('raw-en-secret'), findsNothing);
    expect(find.textContaining('DATABASE_SECRET_FAILURE'), findsNothing);
  });
}

Future<void> _pumpDashboard(
  WidgetTester tester,
  DashboardSummary summary, {
  AppRole role = AppRole.propertyManager,
}) {
  return _pumpController(
    tester,
    DashboardController(_FakeRepository(summary)),
    role: role,
  );
}

Future<void> _pumpController(
  WidgetTester tester,
  DashboardController controller, {
  AppRole role = AppRole.propertyManager,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: DashboardScreen(
        controller: controller,
        propertyId: 'property-1',
        propertyName: 'Saraya Square',
        displayName: 'Admin',
        role: role,
        onNavigate: (_) {},
      ),
    ),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

DashboardSummary _summary({
  int occupiedUnits = 0,
  int vacantUnits = 0,
  int tenantCount = 0,
  int pendingRequests = 0,
  String dueAmount = '0.000',
  String paidAmount = '0.000',
  String overdueAmount = '0.000',
}) => DashboardSummary(
  propertyId: 'property-1',
  role: 'property_manager',
  occupiedUnits: occupiedUnits,
  vacantUnits: vacantUnits,
  tenantCount: tenantCount,
  pendingRequests: pendingRequests,
  dueAmount: dueAmount,
  paidAmount: paidAmount,
  overdueAmount: overdueAmount,
  currencyCode: 'BHD',
);

final class _FakeRepository implements DashboardRepository {
  _FakeRepository(this.summary);

  final DashboardSummary summary;

  @override
  Future<DashboardSummary> load(String propertyId) async => summary;
}

final class _FailingRepository implements DashboardRepository {
  _FailingRepository(this.error);

  final Object error;

  @override
  Future<DashboardSummary> load(String propertyId) async => throw error;
}
