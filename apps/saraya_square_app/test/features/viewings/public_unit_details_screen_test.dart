import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';
import 'package:saraya_square_app/features/public_home/domain/public_unit_details.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';
import 'package:saraya_square_app/features/viewings/presentation/public_unit_details_screen.dart';

void main() {
  testWidgets('unit details exposes independent visit and rental actions', (
    tester,
  ) async {
    var rentalStarts = 0;
    await _pump(
      tester,
      repository: _Repository(),
      onRentNow: () => rentalStarts += 1,
    );

    expect(find.byKey(const Key('book-visit')), findsOneWidget);
    expect(find.byKey(const Key('rent-now')), findsOneWidget);

    await tester.tap(find.byKey(const Key('rent-now')));
    expect(rentalStarts, 1);
    expect(find.byKey(const Key('visit-booking-form')), findsNothing);
  });

  testWidgets(
    'booking a visit confirms selected slot without starting rental',
    (tester) async {
      final repository = _Repository();
      var rentalStarts = 0;
      await _pump(
        tester,
        repository: repository,
        onRentNow: () => rentalStarts += 1,
      );

      await tester.tap(find.byKey(const Key('book-visit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('viewing-slot-slot-1')));
      await tester.enterText(
        find.byKey(const Key('visitor-name')),
        'Ahmed Ali',
      );
      await tester.enterText(
        find.byKey(const Key('visitor-phone')),
        '+97339000000',
      );
      await tester.enterText(
        find.byKey(const Key('visitor-email')),
        'ahmed@example.com',
      );
      await tester.tap(find.byKey(const Key('confirm-visit')));
      await tester.pumpAndSettle();

      expect(find.text('SV-000001'), findsOneWidget);
      expect(repository.bookings, hasLength(1));
      expect(rentalStarts, 0);
    },
  );

  testWidgets('Arabic compact details are RTL and do not overflow', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(tester, locale: const Locale('ar'), repository: _Repository());

    expect(find.text('مكتب ١٠١'), findsOneWidget);
    expect(find.text('احجز زيارة'), findsOneWidget);
    expect(find.text('استأجر الآن'), findsOneWidget);
    expect(
      tester
          .widget<Directionality>(find.byType(Directionality).first)
          .textDirection,
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('visit booking requires an international E.164 phone', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository: repository);

    await tester.tap(find.byKey(const Key('book-visit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('viewing-slot-slot-1')));
    await tester.enterText(find.byKey(const Key('visitor-name')), 'Ahmed Ali');
    await tester.enterText(find.byKey(const Key('visitor-phone')), '39000000');
    await tester.enterText(
      find.byKey(const Key('visitor-email')),
      'ahmed@example.com',
    );
    await tester.tap(find.byKey(const Key('confirm-visit')));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Enter a phone in international format, for example +97339000000.',
      ),
      findsOneWidget,
    );
    expect(repository.bookings, isEmpty);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  required ViewingRepository repository,
  Locale locale = const Locale('en'),
  VoidCallback? onRentNow,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: PublicUnitDetailsScreen(
        details: PublicUnitDetails.fromListing(_unit),
        repository: repository,
        onBack: () {},
        onRentNow: onRentNow ?? () {},
      ),
    ),
  );
  await tester.pumpAndSettle();
}

const _unit = PublicUnitListing(
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
  status: 'vacant',
  floor: '1',
  marketRent: '450.000',
  areaSquareMeters: '20.000',
);

final class _Repository extends EmptyViewingRepository {
  final List<PublicViewingAppointmentInput> bookings = [];

  @override
  Future<List<PublicViewingSlot>> listPublicSlots(String unitId) async => [
    PublicViewingSlot(
      id: 'slot-1',
      startAt: DateTime.parse('2026-10-01T08:00:00.000Z'),
      endAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
      remainingCapacity: 2,
      instructionsAr: 'الاستقبال',
      instructionsEn: 'Reception desk',
    ),
  ];

  @override
  Future<ViewingAppointmentConfirmation> bookPublicAppointment(
    PublicViewingAppointmentInput input,
  ) async {
    bookings.add(input);
    return ViewingAppointmentConfirmation(
      reference: 'SV-000001',
      status: ViewingAppointmentStatus.confirmed,
      startAt: DateTime.parse('2026-10-01T08:00:00.000Z'),
      endAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
    );
  }
}
