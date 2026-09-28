import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/virtual_addresses/domain/virtual_address.dart';
import 'package:saraya_square_app/features/virtual_addresses/presentation/virtual_addresses_screen.dart';

void main() {
  testWidgets('shows the fifty-address inventory with truthful totals', (
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
        home: VirtualAddressesScreen(
          repository: _Repository(),
          propertyId: 'property-1',
          role: AppRole.superAdmin,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('50'), findsOneWidget);
    expect(find.text('49'), findsOneWidget);
    expect(find.text('VA-001'), findsOneWidget);
    expect(find.text('Available'), findsWidgets);
    expect(find.text('available'), findsNothing);
    expect(find.byTooltip('Edit'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}

final class _Repository implements VirtualAddressRepository {
  @override
  Future<List<VirtualAddressRecord>> list(String propertyId) async => [
    const VirtualAddressRecord(
      id: 'address-1',
      propertyId: 'property-1',
      slotNumber: 1,
      code: 'VA-001',
      status: 'active',
      tenantNameAr: 'شركة البحرين',
      tenantNameEn: 'Bahrain Company',
    ),
    for (var index = 2; index <= 50; index += 1)
      VirtualAddressRecord(
        id: 'address-$index',
        propertyId: 'property-1',
        slotNumber: index,
        code: 'VA-${index.toString().padLeft(3, '0')}',
        status: 'available',
      ),
  ];

  @override
  Future<VirtualAddressRecord> update(
    String propertyId,
    String id,
    VirtualAddressInput input,
  ) => throw UnimplementedError();
}
