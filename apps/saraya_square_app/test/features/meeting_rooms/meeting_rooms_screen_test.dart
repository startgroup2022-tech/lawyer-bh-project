import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/domain/meeting_room.dart';
import 'package:saraya_square_app/features/meeting_rooms/presentation/meeting_rooms_screen.dart';

void main() {
  testWidgets('shows configured meeting rooms with operational details', (
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
        home: Scaffold(
          body: MeetingRoomsScreen(
            repository: _Repository(),
            propertyId: 'property-1',
            role: AppRole.superAdmin,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Meeting room inventory'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('Boardroom'), findsOneWidget);
    expect(find.text('Training Room'), findsOneWidget);
    expect(find.text('BHD 15.000'), findsOneWidget);
    expect(find.text('10 people'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(find.text('Maintenance'), findsOneWidget);
    expect(find.text('Add room'), findsOneWidget);
    expect(find.text('Add booking'), findsOneWidget);
    expect(find.byTooltip('Edit'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('keeps operating hours readable in Arabic RTL', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ar'),
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: MeetingRoomsScreen(
            repository: _Repository(),
            propertyId: 'property-1',
            role: AppRole.superAdmin,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final hours = tester.widget<Text>(find.text('08:00 – 22:00').first);
    expect(hours.textDirection, TextDirection.ltr);
  });

  testWidgets('add booking stays enabled and explains inactive rooms', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: MeetingRoomsScreen(
            repository: _InactiveRepository(),
            propertyId: 'property-1',
            role: AppRole.superAdmin,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final button = tester.widget<OutlinedButton>(
      find.byKey(const Key('add-meeting-booking')),
    );
    expect(button.onPressed, isNotNull);
    await tester.tap(find.byKey(const Key('add-meeting-booking')));
    await tester.pumpAndSettle();
    expect(
      find.text('Activate a meeting room before adding a booking'),
      findsOneWidget,
    );
  });

  testWidgets('management selects a tenant when adding a booking', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _BookingRepository();
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: MeetingRoomsScreen(
            repository: repository,
            propertyId: 'property-1',
            role: AppRole.superAdmin,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('add-meeting-booking')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('meeting-booking-user')));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('Alpha Tenant').last);
    await tester.enterText(
      find.byKey(const Key('meeting-booking-purpose')),
      'Client meeting',
    );
    await tester.tap(find.byKey(const Key('save-meeting-booking')));
    await tester.pumpAndSettle();

    expect(repository.created?.bookedForUserId, 'user-2');
    expect(repository.bookingLoads, 2);
  });
}

class _Repository implements MeetingRoomRepository {
  @override
  Future<List<MeetingRoomBookingTarget>> bookingTargets(
    String propertyId,
  ) async => const [
    MeetingRoomBookingTarget(
      userId: 'user-2',
      role: 'tenant',
      displayNameAr: 'شركة ألف',
      displayNameEn: 'Alpha Tenant',
      tenantOrganizationId: 'tenant-1',
    ),
  ];
  @override
  Future<List<MeetingRoomBookingRecord>> listBookings(
    String propertyId,
  ) async => const [];

  @override
  Future<MeetingRoomBookingRecord> createBooking(
    String propertyId,
    MeetingRoomBookingInput input,
  ) => throw UnimplementedError();

  @override
  Future<MeetingRoomBookingRecord> decideBooking(
    String propertyId,
    String bookingId,
    MeetingRoomBookingDecision decision, {
    String? reason,
  }) => throw UnimplementedError();

  @override
  Future<List<MeetingRoomRecord>> list(String propertyId) async => const [
    MeetingRoomRecord(
      id: 'room-1',
      propertyId: 'property-1',
      code: 'MR-01',
      nameAr: 'قاعة مجلس الإدارة',
      nameEn: 'Boardroom',
      capacity: 10,
      hourlyRate: '15.000',
      openingTime: '08:00:00',
      closingTime: '22:00:00',
      minimumMinutes: 60,
      bookingIncrementMinutes: 30,
      status: 'active',
    ),
    MeetingRoomRecord(
      id: 'room-2',
      propertyId: 'property-1',
      code: 'MR-02',
      nameAr: 'قاعة التدريب',
      nameEn: 'Training Room',
      capacity: 18,
      hourlyRate: '20.000',
      openingTime: '08:00:00',
      closingTime: '22:00:00',
      minimumMinutes: 60,
      bookingIncrementMinutes: 30,
      status: 'maintenance',
    ),
  ];

  @override
  Future<MeetingRoomRecord> create(String propertyId, MeetingRoomInput input) =>
      throw UnimplementedError();

  @override
  Future<MeetingRoomRecord> update(
    String propertyId,
    String id,
    MeetingRoomInput input,
  ) => throw UnimplementedError();
}

final class _InactiveRepository extends _Repository {
  @override
  Future<List<MeetingRoomRecord>> list(String propertyId) async => const [
    MeetingRoomRecord(
      id: 'room-1',
      propertyId: 'property-1',
      code: 'MR-01',
      nameAr: 'قاعة الاجتماعات',
      nameEn: 'Meeting Room',
      capacity: 8,
      hourlyRate: '10.000',
      openingTime: '08:00:00',
      closingTime: '22:00:00',
      minimumMinutes: 60,
      bookingIncrementMinutes: 30,
      status: 'inactive',
    ),
  ];
}

final class _BookingRepository extends _Repository {
  MeetingRoomBookingInput? created;
  int bookingLoads = 0;

  @override
  Future<List<MeetingRoomBookingRecord>> listBookings(String propertyId) async {
    bookingLoads += 1;
    return const [];
  }

  @override
  Future<MeetingRoomBookingRecord> createBooking(
    String propertyId,
    MeetingRoomBookingInput input,
  ) async {
    created = input;
    return MeetingRoomBookingRecord(
      id: 'booking-1',
      propertyId: propertyId,
      roomId: input.roomId,
      bookedByUserId: input.bookedForUserId!,
      status: 'pending',
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeCount: input.attendeeCount,
      purpose: input.purpose,
      amount: '15.000',
      currency: 'BHD',
    );
  }
}
