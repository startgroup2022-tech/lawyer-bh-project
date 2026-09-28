import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';
import 'package:saraya_square_app/features/public_rental/presentation/rental_status_screen.dart';

void main() {
  testWidgets('instant approval shows payment and opens only API HTTPS URL', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _StatusRepository(_paymentApplication);
    Uri? opened;

    await tester.pumpWidget(
      _app(
        RentalStatusScreen(
          requestId: 'request-1',
          repository: repository,
          documentPicker: () async => null,
          uriLauncher: (uri) async {
            opened = uri;
            return true;
          },
          onBack: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('اختر طريقة الدفع'), findsOneWidget);
    await tester.tap(find.byKey(const Key('rental-pay-online')));
    await tester.pumpAndSettle();
    expect(opened, Uri.parse('https://tap.example/pay/1'));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'paid application requires legal name and checksum acceptance before signing',
    (tester) async {
      final repository = _StatusRepository(_signatureApplication);
      await tester.pumpWidget(
        _app(
          RentalStatusScreen(
            requestId: 'request-1',
            repository: repository,
            documentPicker: () async => null,
            uriLauncher: (_) async => true,
            onBack: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('lease-checksum')), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('lease-sign')))
            .onPressed,
        isNull,
      );
      await tester.enterText(
        find.byKey(const Key('lease-legal-name')),
        'Ahmed Ali',
      );
      await tester.drag(
        find.byKey(const Key('rental-status-scroll')),
        const Offset(0, -360),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('lease-checksum-accept')));
      await tester.pump();
      await tester.drag(
        find.byKey(const Key('rental-status-scroll')),
        const Offset(0, -180),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('lease-sign')));
      await tester.pumpAndSettle();

      expect(repository.signature?.acceptedName, 'Ahmed Ali');
      expect(repository.signature?.checksum, 'checksum-123');
    },
  );

  testWidgets('online key rotates only after a confirmed terminal failure', (
    tester,
  ) async {
    final repository = _StatusRepository(_paymentApplication);
    await tester.pumpWidget(
      _app(
        RentalStatusScreen(
          requestId: 'request-1',
          repository: repository,
          documentPicker: () async => null,
          uriLauncher: (_) async => true,
          onBack: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('rental-pay-online')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('rental-pay-online')));
    await tester.pumpAndSettle();
    expect(repository.paymentKeys[0], repository.paymentKeys[1]);

    repository.application = const RentalApplication(
      id: 'request-1',
      propertyId: 'property-1',
      unitId: 'unit-1',
      status: RentalApplicationStatus.approvedAwaitingPayment,
      approvalMode: RentalApprovalMode.instant,
      paymentDemandId: 'demand-1',
      paymentStatus: 'failed',
      timeline: [],
    );
    await tester.drag(
      find.byKey(const Key('rental-status-scroll')),
      const Offset(0, 300),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('rental-pay-online')));
    await tester.pumpAndSettle();
    expect(repository.paymentKeys[2], isNot(repository.paymentKeys[1]));
  });
}

Widget _app(Widget home) => MaterialApp(
  locale: const Locale('ar'),
  theme: SarayaTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: home,
);

const _paymentApplication = RentalApplication(
  id: 'request-1',
  propertyId: 'property-1',
  unitId: 'unit-1',
  status: RentalApplicationStatus.approvedAwaitingPayment,
  approvalMode: RentalApprovalMode.instant,
  paymentDemandId: 'demand-1',
  totalAmount: '450.000',
  currency: 'BHD',
  timeline: [
    RentalTimelineEntry(code: 'submitted', occurredAt: '2026-09-27T10:00:00Z'),
  ],
);

const _signatureApplication = RentalApplication(
  id: 'request-1',
  propertyId: 'property-1',
  unitId: 'unit-1',
  status: RentalApplicationStatus.paidAwaitingSignature,
  approvalMode: RentalApprovalMode.instant,
  timeline: [
    RentalTimelineEntry(
      code: 'payment_confirmed',
      occurredAt: '2026-09-27T10:00:00Z',
    ),
  ],
  lease: RentalLeaseState(
    id: 'lease-1',
    checksum: 'checksum-123',
    tenantSigned: false,
    ownerSigned: false,
    active: false,
  ),
);

final class _StatusRepository extends EmptyPublicRentalRepository {
  _StatusRepository(this.application);
  RentalApplication application;
  LeaseSignatureInput? signature;
  final paymentKeys = <String>[];

  @override
  Future<RentalApplication> status(String requestId) async => application;

  @override
  Future<PaymentSession> createOnlinePayment(
    String requestId, {
    required String idempotencyKey,
  }) async {
    paymentKeys.add(idempotencyKey);
    return PaymentSession(
      requestId: requestId,
      demandId: 'demand-1',
      paymentUrl: Uri.parse('https://tap.example/pay/1'),
    );
  }

  @override
  Future<void> sign(String leaseId, LeaseSignatureInput input) async {
    signature = input;
    application = RentalApplication(
      id: application.id,
      propertyId: application.propertyId,
      unitId: application.unitId,
      status: RentalApplicationStatus.paidAwaitingSignature,
      approvalMode: application.approvalMode,
      timeline: application.timeline,
      lease: const RentalLeaseState(
        id: 'lease-1',
        checksum: 'checksum-123',
        tenantSigned: true,
        ownerSigned: false,
        active: false,
      ),
    );
  }

  @override
  Future<RentalLeaseDocument> downloadLeaseDocument(
    String leaseId, {
    bool finalVersion = false,
  }) async => RentalLeaseDocument(
    bytes: Uint8List.fromList([37, 80, 68, 70]),
    fileName: 'lease.pdf',
    contentType: 'application/pdf',
  );
}
