import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';
import 'package:saraya_square_app/features/public_rental/presentation/rental_application_wizard.dart';

void main() {
  testWidgets(
    'Arabic 390px wizard completes OTP and instant application without overflow',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repository = _RentalRepository();

      await tester.pumpWidget(
        _app(
          RentalApplicationWizard(
            unitId: '11111111-1111-4111-8111-111111111111',
            repository: repository,
            documentPicker: () async => RentalDocument(
              fileName: 'identity.pdf',
              contentType: 'application/pdf',
              bytes: Uint8List.fromList([37, 80, 68, 70]),
            ),
            onBack: () {},
            onSubmitted: (_) {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('rental-start')), findsOneWidget);
      await tester.tap(find.byKey(const Key('rental-terms-accept')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('rental-start')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('applicant-name-ar')),
        'أحمد علي',
      );
      await tester.enterText(
        find.byKey(const Key('applicant-name-en')),
        'Ahmed Ali',
      );
      await tester.enterText(
        find.byKey(const Key('otp-identity')),
        'ahmed@example.com',
      );
      await tester.tap(find.byKey(const Key('otp-request')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('otp-code')), '123456');
      await tester.tap(find.byKey(const Key('otp-verify')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('rental-document-pick')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('rental-next')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('rental-start-date')),
        '2030-01-01',
      );
      await tester.enterText(
        find.byKey(const Key('rental-end-date')),
        '2030-12-31',
      );
      await tester.enterText(find.byKey(const Key('rental-duration')), '12');
      await tester.tap(find.byKey(const Key('rental-next')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('rental-submit')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'submit uses one stable key and routes to the server request id',
    (tester) async {
      final repository = _RentalRepository(failFirstSubmission: true);
      String? requestId;
      await tester.pumpWidget(
        _app(
          RentalApplicationWizard(
            unitId: '11111111-1111-4111-8111-111111111111',
            repository: repository,
            documentPicker: () async => RentalDocument(
              fileName: 'identity.pdf',
              contentType: 'application/pdf',
              bytes: Uint8List.fromList([37, 80, 68, 70]),
            ),
            onBack: () {},
            onSubmitted: (value) => requestId = value,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await _completeToReview(tester);
      await tester.tap(find.byKey(const Key('rental-submit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('rental-submit')));
      await tester.pumpAndSettle();

      expect(repository.submissions, hasLength(2));
      expect(repository.submissions.first.idempotencyKey, isNotEmpty);
      expect(
        repository.submissions.last.idempotencyKey,
        repository.submissions.first.idempotencyKey,
      );
      expect(requestId, 'request-1');
    },
  );
}

Future<void> _completeToReview(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('rental-terms-accept')));
  await tester.pump();
  await tester.tap(find.byKey(const Key('rental-start')));
  await tester.pumpAndSettle();
  await tester.enterText(
    find.byKey(const Key('applicant-name-ar')),
    'أحمد علي',
  );
  await tester.enterText(
    find.byKey(const Key('applicant-name-en')),
    'Ahmed Ali',
  );
  await tester.enterText(
    find.byKey(const Key('otp-identity')),
    'ahmed@example.com',
  );
  await tester.tap(find.byKey(const Key('otp-request')));
  await tester.pumpAndSettle();
  await tester.enterText(find.byKey(const Key('otp-code')), '123456');
  await tester.tap(find.byKey(const Key('otp-verify')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('rental-document-pick')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('rental-next')));
  await tester.pumpAndSettle();
  await tester.enterText(
    find.byKey(const Key('rental-start-date')),
    '2030-01-01',
  );
  await tester.enterText(
    find.byKey(const Key('rental-end-date')),
    '2030-12-31',
  );
  await tester.enterText(find.byKey(const Key('rental-duration')), '12');
  await tester.tap(find.byKey(const Key('rental-next')));
  await tester.pumpAndSettle();
}

Widget _app(Widget home) => MaterialApp(
  locale: const Locale('ar'),
  theme: SarayaTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: home,
);

final class _RentalRepository extends EmptyPublicRentalRepository {
  _RentalRepository({this.failFirstSubmission = false});
  final bool failFirstSubmission;
  final List<RentalApplicationInput> submissions = [];

  @override
  Future<PublicRentalUnit> loadUnit(String unitId) async =>
      const PublicRentalUnit(
        id: '11111111-1111-4111-8111-111111111111',
        propertyId: '22222222-2222-4222-8222-222222222222',
        unitNumber: '101',
        displayNameAr: 'مكتب ١٠١',
        displayNameEn: 'Office 101',
        rentAmount: '450.000',
        depositAmount: '0.000',
        feeAmount: '0.000',
        currency: 'BHD',
        approvalMode: RentalApprovalMode.instant,
      );

  @override
  Future<OtpChallenge> requestOtp(OtpRequest input) async => const OtpChallenge(
    challengeId: 'challenge-1',
    expiresAt: '2030-01-01T00:10:00.000Z',
  );

  @override
  Future<void> verifyOtp(OtpVerification input) async {}

  @override
  Future<String> uploadIdentity(
    String unitId,
    RentalDocument input, {
    required String category,
    required String idempotencyKey,
  }) async => 'document-1';

  @override
  Future<RentalApplication> submit(RentalApplicationInput input) async {
    submissions.add(input);
    if (failFirstSubmission && submissions.length == 1) {
      throw const ApiError(
        status: 0,
        code: 'NETWORK_ERROR',
        messageAr: 'تعذر الاتصال بالخادم',
        messageEn: 'Unable to connect to the server',
      );
    }
    return RentalApplication(
      id: 'request-1',
      propertyId: input.propertyId,
      unitId: input.unitId,
      status: RentalApplicationStatus.approvedAwaitingPayment,
      approvalMode: RentalApprovalMode.instant,
      paymentDemandId: 'demand-1',
      totalAmount: '450.000',
      currency: 'BHD',
      timeline: const [],
    );
  }
}
