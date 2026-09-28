import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/rental_requests/domain/rental_request.dart';
import 'package:saraya_square_app/features/rental_requests/presentation/rental_requests_screen.dart';

void main() {
  testWidgets(
    'owner confirms approval and refreshes the queue without replacing the shell',
    (tester) async {
      final repository = _Repository(canApprove: true);
      await _pump(tester, repository, AppRole.owner);
      final shell = find
          .byKey(const Key('task9-shell-marker'))
          .evaluate()
          .single
          .widget;
      await tester.tap(find.byKey(const Key('approve-request-request-1')));
      await tester.pumpAndSettle();
      expect(find.text('Confirm approval'), findsOneWidget);
      await tester.tap(find.text('Approve').last);
      await tester.pumpAndSettle();
      expect(repository.approvedRequestId, 'request-1');
      expect(repository.loadCount, 2);
      expect(
        identical(
          shell,
          find.byKey(const Key('task9-shell-marker')).evaluate().single.widget,
        ),
        isTrue,
      );
    },
  );

  testWidgets(
    'rejection requires a reason and reuses a stable idempotency key',
    (tester) async {
      final repository = _Repository(canApprove: true);
      await _pump(tester, repository, AppRole.owner);
      await tester.tap(find.byKey(const Key('reject-request-request-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reject').last);
      await tester.pump();
      expect(find.text('Rejection reason is required'), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('rental-rejection-reason')),
        'Incomplete registration',
      );
      await tester.tap(find.text('Reject').last);
      await tester.pumpAndSettle();
      expect(repository.rejectedRequestId, 'request-1');
      expect(repository.lastDecisionKey, isNotEmpty);
    },
  );

  testWidgets(
    'manager can verify offline proof but cannot approve owner review',
    (tester) async {
      final repository = _Repository(canVerify: true);
      await _pump(tester, repository, AppRole.propertyManager);
      expect(find.byKey(const Key('approve-request-request-1')), findsNothing);
      expect(find.byKey(const Key('verify-payment-demand-1')), findsOneWidget);
      await tester.tap(find.byKey(const Key('verify-payment-demand-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Verify payment').last);
      await tester.pumpAndSettle();
      expect(repository.verifiedDemandId, 'demand-1');
    },
  );

  testWidgets('mobile Arabic queue has pull-to-refresh and no overflow', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await _pump(
      tester,
      _Repository(),
      AppRole.superAdmin,
      locale: const Locale('ar'),
    );
    expect(tester.takeException(), isNull);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('A-01'), findsOneWidget);
  });

  testWidgets('loads the next page and pull refresh resets the cursor', (
    tester,
  ) async {
    final repository = _Repository(nextCursor: 'page-2');
    await _pump(tester, repository, AppRole.superAdmin);
    await tester.tap(find.byKey(const Key('rental-load-more')));
    await tester.pumpAndSettle();
    expect(repository.cursors, [null, 'page-2']);
    expect(find.text('A-02'), findsOneWidget);
    await tester.drag(
      find.byKey(const Key('rental-request-queue')),
      const Offset(0, 500),
    );
    await tester.pumpAndSettle();
    expect(repository.cursors.last, isNull);
    expect(find.text('A-02'), findsNothing);
  });

  testWidgets('owner sees identity download but not payment proof', (
    tester,
  ) async {
    await _pump(
      tester,
      _Repository(canDownloadIdentity: true, canDownloadProof: false),
      AppRole.owner,
    );
    expect(
      find.byKey(const Key('download-identity-request-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('download-payment-proof-request-1')),
      findsNothing,
    );
  });

  testWidgets('accountant sees payment proof but not identity download', (
    tester,
  ) async {
    await _pump(
      tester,
      _Repository(canDownloadIdentity: false, canDownloadProof: true),
      AppRole.accountant,
    );
    expect(find.byKey(const Key('download-identity-request-1')), findsNothing);
    expect(
      find.byKey(const Key('download-payment-proof-request-1')),
      findsOneWidget,
    );
  });
}

Future<void> _pump(
  WidgetTester tester,
  _Repository repository,
  AppRole role, {
  Locale locale = const Locale('en'),
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        key: const Key('task9-shell-marker'),
        body: RentalRequestsScreen(
          repository: repository,
          propertyId: 'property-1',
          role: role,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final class _Repository implements RentalRequestRepository {
  _Repository({
    this.canApprove = false,
    this.canVerify = false,
    this.canDownloadIdentity = false,
    this.canDownloadProof = false,
    this.nextCursor,
  });

  final bool canApprove;
  final bool canVerify;
  final bool canDownloadIdentity;
  final bool canDownloadProof;
  final String? nextCursor;
  int loadCount = 0;
  final List<String?> cursors = [];
  String? approvedRequestId;
  String? rejectedRequestId;
  String? verifiedDemandId;
  String? lastDecisionKey;

  @override
  Future<RentalRequestPage> list(
    String propertyId, {
    String? cursor,
    int limit = 25,
  }) async {
    loadCount++;
    cursors.add(cursor);
    final item = RentalRequestQueueItem(
      id: 'request-1',
      unitNumber: cursor == null ? 'A-01' : 'A-02',
      applicantDisplayName: 'Tenant Company',
      startDate: '2030-01-01',
      endDate: '2030-12-31',
      rentAmount: '500.000',
      depositAmount: '500.000',
      feeAmount: '10.000',
      currency: 'BHD',
      status: 'pending_owner_review',
      approvalMode: 'owner_review',
      paymentState: 'verification_pending',
      identityDocumentPresent: true,
      paymentProofPresent: true,
      demandId: 'demand-1',
      canApprove: canApprove,
      canVerifyOfflinePayment: canVerify,
      canDownloadIdentityDocument: canDownloadIdentity,
      canDownloadPaymentProof: canDownloadProof,
      timeline: [],
    );
    return RentalRequestPage(
      items: [item],
      nextCursor: cursor == null ? nextCursor : null,
    );
  }

  @override
  Future<void> decide(
    String propertyId,
    String requestId, {
    required bool approve,
    String? reason,
    required String idempotencyKey,
  }) async {
    lastDecisionKey = idempotencyKey;
    if (approve) {
      approvedRequestId = requestId;
    } else {
      rejectedRequestId = requestId;
    }
  }

  @override
  Future<void> decideOffline(
    String demandId, {
    required bool approve,
    String? failureCode,
    required String idempotencyKey,
  }) async {
    if (approve) verifiedDemandId = demandId;
  }

  @override
  Future<RentalRequestDocument> downloadDocument(
    String propertyId,
    String requestId,
    RentalRequestDocumentKind kind,
  ) async => RentalRequestDocument(
    bytes: Uint8List(0),
    fileName: 'identity.pdf',
    contentType: 'application/pdf',
  );
}
