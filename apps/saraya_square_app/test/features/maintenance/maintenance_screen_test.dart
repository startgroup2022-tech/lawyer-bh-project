import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';
import 'package:saraya_square_app/features/maintenance/domain/maintenance_ticket.dart';
import 'package:saraya_square_app/features/maintenance/presentation/maintenance_screen.dart';

void main() {
  testWidgets('shows maintenance tickets with localized status and priority', (
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
        home: MaintenanceScreen(
          repository: _Repository(),
          propertyId: 'property-1',
          role: AppRole.superAdmin,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Maintenance tickets'), findsOneWidget);
    expect(find.text('MNT-0001'), findsOneWidget);
    expect(find.text('Air conditioner stopped'), findsOneWidget);
    expect(find.text('OFF-101'), findsOneWidget);
    expect(find.text('Urgent'), findsWidgets);
    expect(find.text('In progress'), findsOneWidget);
    expect(find.text('BHD 25.000'), findsOneWidget);
    expect(find.text('Add ticket'), findsOneWidget);
    expect(find.byTooltip('Edit'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}

final class _Repository implements MaintenanceRepository {
  @override
  Future<List<MaintenanceTicket>> list(String propertyId) async => const [
    MaintenanceTicket(
      id: 'ticket-1',
      propertyId: 'property-1',
      unitId: 'unit-1',
      tenantOrganizationId: 'tenant-1',
      ticketNumber: 'MNT-0001',
      title: 'Air conditioner stopped',
      description: 'The main office air conditioner is not cooling.',
      priority: 'urgent',
      status: 'in_progress',
      expenseAmount: '25.000',
      createdAt: '2026-09-26T08:00:00.000Z',
      updatedAt: '2026-09-26T09:00:00.000Z',
      unitNumber: 'OFF-101',
      tenantNameAr: 'شركة البحرين',
      tenantNameEn: 'Bahrain Company',
      reportedByNameAr: 'أحمد',
      reportedByNameEn: 'Ahmed',
      assignedToNameAr: 'فريق الصيانة',
      assignedToNameEn: 'Maintenance Team',
    ),
  ];

  @override
  Future<MaintenanceTicket> create(String propertyId, MaintenanceInput input) => throw UnimplementedError();

  @override
  Future<MaintenanceTicket> update(String propertyId, String id, MaintenanceInput input) => throw UnimplementedError();
}
