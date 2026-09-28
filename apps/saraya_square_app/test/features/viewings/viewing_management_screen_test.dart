import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';
import 'package:saraya_square_app/features/viewings/presentation/viewing_management_screen.dart';

void main() {
  testWidgets('management shows upcoming visits and status actions', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(tester, repository);

    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('SV-000001'), findsOneWidget);
    expect(find.text('Ahmed Ali'), findsOneWidget);

    await tester.tap(find.byKey(const Key('complete-visit-appointment-1')));
    await tester.pumpAndSettle();

    expect(repository.lastStatus, ViewingAppointmentStatus.completed);
  });

  testWidgets('management can publish a property-wide slot', (tester) async {
    final repository = _Repository();
    await _pump(tester, repository);

    await tester.tap(find.byKey(const Key('add-viewing-slot')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('slot-start-at')),
      '2026-10-02 08:00',
    );
    await tester.enterText(
      find.byKey(const Key('slot-end-at')),
      '2026-10-02 09:00',
    );
    await tester.enterText(find.byKey(const Key('slot-capacity')), '4');
    await tester.tap(find.byKey(const Key('save-viewing-slot')));
    await tester.pumpAndSettle();

    expect(repository.createdSlot?.capacity, 4);
    expect(repository.createdSlot?.unitId, isNull);

    await tester.tap(find.byKey(const Key('edit-viewing-slot-slot-2')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('slot-capacity')), '6');
    await tester.tap(find.byKey(const Key('save-viewing-slot')));
    await tester.pumpAndSettle();

    expect(repository.updatedSlot?.capacity, 6);
  });

  testWidgets('roles without viewing capability see access denied', (
    tester,
  ) async {
    await _pump(tester, _Repository(), role: AppRole.accountant);

    expect(
      find.text('You do not have access to this section.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('add-viewing-slot')), findsNothing);
  });

  testWidgets(
    'refresh loads previously published slots with management controls',
    (tester) async {
      final repository = _Repository();
      await _pump(tester, repository);

      expect(
        find.byKey(const Key('edit-viewing-slot-slot-existing')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('cancel-viewing-slot-slot-existing')),
        findsOneWidget,
      );
      expect(repository.slotLoads, 1);

      await tester.drag(find.byType(RefreshIndicator), const Offset(0, 500));
      await tester.pumpAndSettle();

      expect(repository.slotLoads, 2);
      expect(
        find.byKey(const Key('edit-viewing-slot-slot-existing')),
        findsOneWidget,
      );
    },
  );

  testWidgets('390px Arabic management is RTL without overflow', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(tester, _Repository(), locale: const Locale('ar'));

    expect(find.text('مواعيد الزيارات'), findsOneWidget);
    expect(
      tester
          .widget<Directionality>(find.byType(Directionality).first)
          .textDirection,
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });
}

Future<void> _pump(
  WidgetTester tester,
  ViewingRepository repository, {
  AppRole role = AppRole.propertyManager,
  Locale locale = const Locale('en'),
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: ViewingManagementScreen(
        repository: repository,
        propertyId: 'property-1',
        role: role,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final class _Repository extends EmptyViewingRepository {
  ViewingAppointmentStatus? lastStatus;
  ViewingSlotInput? createdSlot;
  ViewingSlotUpdate? updatedSlot;
  int slotLoads = 0;

  @override
  Future<List<ViewingSlot>> listSlots(String propertyId) async {
    slotLoads += 1;
    return [
      ViewingSlot(
        id: 'slot-existing',
        propertyId: propertyId,
        unitId: null,
        startAt: DateTime.parse('2026-10-03T08:00:00.000Z'),
        endAt: DateTime.parse('2026-10-03T09:00:00.000Z'),
        capacity: 5,
        bookedCount: 1,
        status: ViewingSlotStatus.active,
      ),
    ];
  }

  @override
  Future<List<ViewingAppointment>> listAppointments(String propertyId) async =>
      [
        ViewingAppointment(
          id: 'appointment-1',
          propertyId: propertyId,
          unitId: 'unit-101',
          slotId: 'slot-1',
          reference: 'SV-000001',
          visitorName: 'Ahmed Ali',
          visitorPhone: '+97339000000',
          visitorEmail: 'ahmed@example.com',
          locale: 'en',
          status: ViewingAppointmentStatus.confirmed,
          startAt: DateTime.parse('2026-10-01T08:00:00.000Z'),
          endAt: DateTime.parse('2026-10-01T09:00:00.000Z'),
        ),
      ];

  @override
  Future<ViewingAppointment> updateAppointmentStatus(
    String propertyId,
    String appointmentId,
    ViewingAppointmentStatus status,
  ) async {
    lastStatus = status;
    return (await listAppointments(propertyId)).single.copyWith(status: status);
  }

  @override
  Future<ViewingSlot> createSlot(
    String propertyId,
    ViewingSlotInput input,
  ) async {
    createdSlot = input;
    return ViewingSlot(
      id: 'slot-2',
      propertyId: propertyId,
      unitId: input.unitId,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
      bookedCount: 0,
      status: ViewingSlotStatus.active,
      instructionsAr: input.instructionsAr,
      instructionsEn: input.instructionsEn,
    );
  }

  @override
  Future<ViewingSlot> updateSlot(
    String propertyId,
    String slotId,
    ViewingSlotUpdate input,
  ) async {
    updatedSlot = input;
    return ViewingSlot(
      id: slotId,
      propertyId: propertyId,
      unitId: null,
      startAt: input.startAt ?? DateTime.parse('2026-10-02T08:00:00'),
      endAt: input.endAt ?? DateTime.parse('2026-10-02T09:00:00'),
      capacity: input.capacity ?? 4,
      bookedCount: 0,
      status: input.status ?? ViewingSlotStatus.active,
      instructionsAr: input.instructionsAr,
      instructionsEn: input.instructionsEn,
    );
  }
}
