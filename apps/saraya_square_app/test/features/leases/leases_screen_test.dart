import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/leases/domain/lease.dart';
import 'package:saraya_square_app/features/leases/presentation/leases_screen.dart';

void main() {
  testWidgets('shows lease portfolio with localized operational details', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: LeasesScreen(
          repository: _Repository(),
          propertyId: 'property-1',
          role: AppRole.superAdmin,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Lease portfolio'), findsOneWidget);
    expect(find.text('OFF-101'), findsOneWidget);
    expect(find.text('Bahrain Company'), findsOneWidget);
    expect(find.text('BHD 450.000'), findsOneWidget);
    expect(find.text('Active'), findsWidgets);
    expect(find.text('Monthly'), findsOneWidget);
    expect(find.text('Terminate lease'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('terminates an active lease through the repository', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(500, 1300));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _Repository();
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: LeasesScreen(
            repository: repository,
            propertyId: 'property-1',
            role: AppRole.superAdmin,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Terminate lease'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Tenant request');
    await tester.tap(find.widgetWithText(FilledButton, 'Terminate lease'));
    await tester.pumpAndSettle();

    expect(repository.lastAction, LeaseAction.terminate);
    expect(repository.lastReason, 'Tenant request');
  });
}

final class _Repository implements LeaseRepository {
  LeaseAction? lastAction;
  String? lastReason;

  @override
  Future<void> command(
    String propertyId,
    String leaseId,
    LeaseAction action, {
    LeaseRenewalTerms? terms,
    String? reason,
  }) async {
    lastAction = action;
    lastReason = reason;
  }

  @override
  Future<List<LeaseRecord>> list(String propertyId) async => const [
    LeaseRecord(
      id: 'lease-1',
      propertyId: 'property-1',
      unitId: 'unit-1',
      tenantOrganizationId: 'tenant-1',
      status: 'active',
      currentVersion: 1,
      unitNumber: 'OFF-101',
      unitNameAr: 'مكتب 101',
      unitNameEn: 'Office 101',
      tenantNameAr: 'شركة البحرين',
      tenantNameEn: 'Bahrain Company',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      rentAmount: '450.000',
      depositAmount: '450.000',
      frequency: 'monthly',
      dueDay: 1,
      graceDays: 5,
      createdAt: '2026-01-01T08:00:00.000Z',
      updatedAt: '2026-01-01T08:00:00.000Z',
    ),
  ];
}
