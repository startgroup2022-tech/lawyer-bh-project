import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('public rental acceptance with fake external boundaries', () {
    test('OTP creates one account and reuses it for direct rental', () {
      final backend = _FakeRentalBoundary();

      final created = backend.verifyOtp('tenant@example.com');
      final reused = backend.verifyOtp(' TENANT@example.com ');
      final request = backend.submit(
        accountId: reused,
        approvalMode: _ApprovalMode.instant,
      );

      expect(created, reused);
      expect(backend.accounts, hasLength(1));
      expect(request.status, _RequestStatus.awaitingPayment);
    });

    test('manual approval blocks payment until owner approval', () {
      final backend = _FakeRentalBoundary();
      final accountId = backend.verifyOtp('manual@example.com');
      final request = backend.submit(
        accountId: accountId,
        approvalMode: _ApprovalMode.ownerReview,
      );

      expect(request.status, _RequestStatus.pendingOwnerReview);
      expect(
        () => backend.startFakeTapCheckout(request.id),
        throwsA(isA<StateError>()),
      );

      backend.approveAsOwner(request.id);
      final session = backend.startFakeTapCheckout(request.id);
      expect(session, startsWith('https://fake-tap.invalid/'));
      expect(request.status, _RequestStatus.awaitingPayment);
    });

    test(
      'fake Tap requires server confirmation and creates exactly one lease',
      () {
        final backend = _FakeRentalBoundary();
        final accountId = backend.verifyOtp('instant@example.com');
        final request = backend.submit(
          accountId: accountId,
          approvalMode: _ApprovalMode.instant,
        );

        backend.startFakeTapCheckout(request.id);
        expect(request.status, _RequestStatus.awaitingPayment);
        expect(backend.leases, isEmpty);

        backend.confirmFakeTapFromServer(request.id, chargeId: 'chg_fake_1');
        backend.confirmFakeTapFromServer(request.id, chargeId: 'chg_fake_1');
        expect(request.status, _RequestStatus.awaitingSignatures);
        expect(backend.leases, hasLength(1));

        final lease = backend.leases.single;
        backend.sign(lease.id, _Signer.tenant);
        expect(lease.active, isFalse);
        expect(backend.unitOccupied, isFalse);
        backend.sign(lease.id, _Signer.owner);
        expect(lease.signatures, {_Signer.tenant, _Signer.owner});
        expect(lease.active, isTrue);
        expect(request.status, _RequestStatus.completed);
        expect(backend.unitOccupied, isTrue);
        expect(
          () => backend.submit(
            accountId: accountId,
            approvalMode: _ApprovalMode.instant,
          ),
          throwsA(isA<StateError>()),
        );
      },
    );

    test('offline proof waits for verification before lease creation', () {
      final backend = _FakeRentalBoundary();
      final request = backend.submit(
        accountId: backend.verifyOtp('offline@example.com'),
        approvalMode: _ApprovalMode.instant,
      );

      backend.submitOfflineProof(request.id, reference: 'BANK-001');
      expect(request.status, _RequestStatus.verificationPending);
      expect(backend.leases, isEmpty);

      backend.verifyOfflinePayment(request.id);
      expect(request.status, _RequestStatus.awaitingSignatures);
      expect(backend.leases, hasLength(1));
    });

    test('public unit payload excludes private and operational fields', () {
      final payload = _FakeRentalBoundary().publicUnit();

      expect(
        payload.keys,
        containsAll(<String>{
          'id',
          'propertyId',
          'unitNumber',
          'displayNameAr',
          'displayNameEn',
          'marketRent',
          'currency',
          'approvalMode',
        }),
      );
      expect(
        payload.keys,
        isNot(
          contains(anyOf('ownerId', 'tenantUserId', 'visitorEmail', 'notes')),
        ),
      );
    });
  });
}

enum _ApprovalMode { instant, ownerReview }

enum _RequestStatus {
  pendingOwnerReview,
  awaitingPayment,
  verificationPending,
  awaitingSignatures,
  completed,
}

enum _Signer { tenant, owner }

final class _FakeRentalBoundary {
  final accounts = <String, String>{};
  final requests = <_FakeRequest>[];
  final leases = <_FakeLease>[];
  final _leaseByRequest = <String, _FakeLease>{};
  final _confirmedCharges = <String>{};
  bool unitOccupied = false;

  String verifyOtp(String identity) {
    final normalized = identity.trim().toLowerCase();
    return accounts.putIfAbsent(
      normalized,
      () => 'account-${accounts.length + 1}',
    );
  }

  _FakeRequest submit({
    required String accountId,
    required _ApprovalMode approvalMode,
  }) {
    if (unitOccupied) throw StateError('UNIT_NOT_AVAILABLE');
    final request = _FakeRequest(
      id: 'request-${requests.length + 1}',
      accountId: accountId,
      approvalMode: approvalMode,
      status: approvalMode == _ApprovalMode.instant
          ? _RequestStatus.awaitingPayment
          : _RequestStatus.pendingOwnerReview,
    );
    requests.add(request);
    return request;
  }

  void approveAsOwner(String requestId) {
    final request = _request(requestId);
    if (request.status != _RequestStatus.pendingOwnerReview) {
      throw StateError('INVALID_APPROVAL_STATE');
    }
    request.status = _RequestStatus.awaitingPayment;
  }

  String startFakeTapCheckout(String requestId) {
    final request = _request(requestId);
    if (request.status != _RequestStatus.awaitingPayment) {
      throw StateError('PAYMENT_NOT_ALLOWED');
    }
    return 'https://fake-tap.invalid/pay/${request.id}';
  }

  void confirmFakeTapFromServer(String requestId, {required String chargeId}) {
    final request = _request(requestId);
    if (_confirmedCharges.add(chargeId)) {
      _ensureLease(request);
    }
  }

  void submitOfflineProof(String requestId, {required String reference}) {
    if (reference.trim().isEmpty) throw StateError('REFERENCE_REQUIRED');
    final request = _request(requestId);
    if (request.status != _RequestStatus.awaitingPayment) {
      throw StateError('PAYMENT_NOT_ALLOWED');
    }
    request.status = _RequestStatus.verificationPending;
  }

  void verifyOfflinePayment(String requestId) {
    final request = _request(requestId);
    if (request.status != _RequestStatus.verificationPending) {
      throw StateError('PROOF_NOT_PENDING');
    }
    _ensureLease(request);
  }

  void sign(String leaseId, _Signer signer) {
    final lease = leases.singleWhere((item) => item.id == leaseId);
    lease.signatures.add(signer);
    if (lease.signatures.length == _Signer.values.length) {
      lease.active = true;
      lease.request.status = _RequestStatus.completed;
      unitOccupied = true;
    }
  }

  Map<String, Object?> publicUnit() => const {
    'id': 'unit-101',
    'propertyId': 'property-1',
    'unitNumber': '101',
    'displayNameAr': 'مكتب ١٠١',
    'displayNameEn': 'Office 101',
    'marketRent': '450.000',
    'currency': 'BHD',
    'approvalMode': 'instant',
  };

  void _ensureLease(_FakeRequest request) {
    final lease = _leaseByRequest.putIfAbsent(request.id, () {
      final value = _FakeLease(
        id: 'lease-${leases.length + 1}',
        request: request,
      );
      leases.add(value);
      return value;
    });
    request.leaseId = lease.id;
    request.status = _RequestStatus.awaitingSignatures;
  }

  _FakeRequest _request(String requestId) =>
      requests.singleWhere((item) => item.id == requestId);
}

final class _FakeRequest {
  _FakeRequest({
    required this.id,
    required this.accountId,
    required this.approvalMode,
    required this.status,
  });

  final String id;
  final String accountId;
  final _ApprovalMode approvalMode;
  _RequestStatus status;
  String? leaseId;
}

final class _FakeLease {
  _FakeLease({required this.id, required this.request});

  final String id;
  final _FakeRequest request;
  final signatures = <_Signer>{};
  bool active = false;
}
