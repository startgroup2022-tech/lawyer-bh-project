import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';
import 'package:saraya_square_app/features/public_home/domain/public_unit_details.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';
import 'package:saraya_square_app/features/viewings/presentation/public_unit_details_screen.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'anonymous unit visit is independent from rental and confirms immediately',
    (tester) async {
      final backend = _FakeViewingBoundary(capacity: 1);
      var rentalStarts = 0;
      await tester.pumpWidget(
        _app(
          PublicUnitDetailsScreen(
            details: PublicUnitDetails.fromListing(_unit),
            repository: backend,
            onBack: () {},
            onRentNow: () => rentalStarts += 1,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('book-visit')), findsOneWidget);
      expect(find.byKey(const Key('rent-now')), findsOneWidget);
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
      expect(backend.appointments, hasLength(1));
      expect(backend.rentalRequests, isEmpty);
      expect(rentalStarts, 0);
    },
  );

  test('capacity conflict rejects a second appointment', () async {
    final backend = _FakeViewingBoundary(capacity: 1);
    await backend.bookPublicAppointment(_appointment('first@example.com'));

    await expectLater(
      backend.bookPublicAppointment(_appointment('second@example.com')),
      throwsA(
        isA<ApiError>().having(
          (error) => error.code,
          'code',
          'VIEWING_SLOT_FULL',
        ),
      ),
    );
    expect(backend.appointments, hasLength(1));
  });
}

Widget _app(Widget home) => MaterialApp(
  locale: const Locale('en'),
  theme: SarayaTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: home,
);

PublicViewingAppointmentInput _appointment(String email) =>
    PublicViewingAppointmentInput(
      propertyId: 'property-1',
      unitId: 'unit-101',
      slotId: 'slot-1',
      visitorName: 'Visitor',
      visitorPhone: '+97339000000',
      visitorEmail: email,
      locale: 'en',
    );

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

final class _FakeViewingBoundary extends EmptyViewingRepository {
  _FakeViewingBoundary({required this.capacity});

  final int capacity;
  final appointments = <PublicViewingAppointmentInput>[];
  final rentalRequests = <Object>[];

  @override
  Future<List<PublicViewingSlot>> listPublicSlots(String unitId) async => [
    PublicViewingSlot(
      id: 'slot-1',
      startAt: DateTime.parse('2030-10-01T08:00:00.000Z'),
      endAt: DateTime.parse('2030-10-01T09:00:00.000Z'),
      remainingCapacity: capacity - appointments.length,
      instructionsAr: 'الاستقبال',
      instructionsEn: 'Reception desk',
    ),
  ];

  @override
  Future<ViewingAppointmentConfirmation> bookPublicAppointment(
    PublicViewingAppointmentInput input,
  ) async {
    if (appointments.length >= capacity) {
      throw const ApiError(
        status: 409,
        code: 'VIEWING_SLOT_FULL',
        messageAr: 'اكتمل هذا الموعد',
        messageEn: 'This viewing slot is full',
      );
    }
    appointments.add(input);
    return ViewingAppointmentConfirmation(
      reference: 'SV-${appointments.length.toString().padLeft(6, '0')}',
      status: ViewingAppointmentStatus.confirmed,
      startAt: DateTime.parse('2030-10-01T08:00:00.000Z'),
      endAt: DateTime.parse('2030-10-01T09:00:00.000Z'),
    );
  }
}
