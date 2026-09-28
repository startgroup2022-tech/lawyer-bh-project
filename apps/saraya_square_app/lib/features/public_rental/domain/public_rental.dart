import 'dart:typed_data';

enum RentalApprovalMode { instant, ownerReview }

enum RentalApplicationStatus {
  pendingOwnerReview,
  approvedAwaitingPayment,
  rejected,
  paidAwaitingSignature,
  completed,
  cancelled,
}

RentalApprovalMode _approvalMode(Object? value) => switch (value) {
  'instant' => RentalApprovalMode.instant,
  'owner_review' => RentalApprovalMode.ownerReview,
  _ => throw const FormatException('Invalid approval mode'),
};

RentalApplicationStatus _applicationStatus(Object? value) => switch (value) {
  'pending_owner_review' => RentalApplicationStatus.pendingOwnerReview,
  'approved_awaiting_payment' =>
    RentalApplicationStatus.approvedAwaitingPayment,
  'rejected' => RentalApplicationStatus.rejected,
  'paid_awaiting_signature' => RentalApplicationStatus.paidAwaitingSignature,
  'completed' => RentalApplicationStatus.completed,
  'cancelled' => RentalApplicationStatus.cancelled,
  _ => throw const FormatException('Invalid rental status'),
};

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing $key');
  }
  return value;
}

String? _optionalString(Map<String, Object?> json, String key) {
  final value = json[key];
  return value is String && value.isNotEmpty ? value : null;
}

final class PublicRentalUnit {
  const PublicRentalUnit({
    required this.id,
    required this.propertyId,
    required this.unitNumber,
    required this.displayNameAr,
    required this.displayNameEn,
    required this.rentAmount,
    required this.depositAmount,
    required this.feeAmount,
    required this.currency,
    required this.approvalMode,
  });

  factory PublicRentalUnit.fromJson(Map<String, Object?> json) =>
      PublicRentalUnit(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        unitNumber: _requiredString(json, 'unitNumber'),
        displayNameAr: _requiredString(json, 'displayNameAr'),
        displayNameEn: _requiredString(json, 'displayNameEn'),
        rentAmount: _requiredString(json, 'marketRent'),
        depositAmount: _requiredString(json, 'depositAmount'),
        feeAmount: _requiredString(json, 'feeAmount'),
        currency: _requiredString(json, 'currency'),
        approvalMode: _approvalMode(json['approvalMode']),
      );

  final String id;
  final String propertyId;
  final String unitNumber;
  final String displayNameAr;
  final String displayNameEn;
  final String rentAmount;
  final String depositAmount;
  final String feeAmount;
  final String currency;
  final RentalApprovalMode approvalMode;
}

final class OtpRequest {
  const OtpRequest({
    required this.channel,
    required this.identity,
    required this.locale,
  });
  final String channel;
  final String identity;
  final String locale;
}

final class OtpChallenge {
  const OtpChallenge({required this.challengeId, required this.expiresAt});
  factory OtpChallenge.fromJson(Map<String, Object?> json) => OtpChallenge(
    challengeId: _requiredString(json, 'challengeId'),
    expiresAt: _requiredString(json, 'expiresAt'),
  );
  final String challengeId;
  final String expiresAt;
}

final class OtpVerification {
  const OtpVerification({
    required this.challengeId,
    required this.code,
    required this.displayNameAr,
    required this.displayNameEn,
  });
  final String challengeId;
  final String code;
  final String displayNameAr;
  final String displayNameEn;
}

final class RentalDocument {
  const RentalDocument({
    required this.fileName,
    required this.contentType,
    required this.bytes,
  });
  final String fileName;
  final String contentType;
  final Uint8List bytes;
}

final class RentalApplicationInput {
  const RentalApplicationInput({
    required this.propertyId,
    required this.unitId,
    required this.applicantType,
    required this.applicantNameAr,
    required this.applicantNameEn,
    required this.startDate,
    required this.endDate,
    required this.durationMonths,
    required this.idDocumentId,
    required this.idempotencyKey,
    this.registrationNumber,
  });
  final String propertyId;
  final String unitId;
  final String applicantType;
  final String applicantNameAr;
  final String applicantNameEn;
  final String? registrationNumber;
  final String startDate;
  final String endDate;
  final int durationMonths;
  final String idDocumentId;
  final String idempotencyKey;
}

final class RentalTimelineEntry {
  const RentalTimelineEntry({
    required this.code,
    required this.occurredAt,
    this.labelAr,
    this.labelEn,
  });
  factory RentalTimelineEntry.fromJson(Map<String, Object?> json) =>
      RentalTimelineEntry(
        code: _requiredString(json, 'code'),
        occurredAt: _requiredString(json, 'occurredAt'),
        labelAr: _optionalString(json, 'labelAr'),
        labelEn: _optionalString(json, 'labelEn'),
      );
  final String code;
  final String occurredAt;
  final String? labelAr;
  final String? labelEn;
}

final class RentalLeaseState {
  const RentalLeaseState({
    required this.id,
    required this.checksum,
    required this.tenantSigned,
    required this.ownerSigned,
    required this.active,
    this.documentAvailable = true,
    this.finalDocumentAvailable = false,
  });
  factory RentalLeaseState.fromJson(Map<String, Object?> json) =>
      RentalLeaseState(
        id: _requiredString(json, 'id'),
        checksum: _requiredString(json, 'checksum'),
        tenantSigned: json['tenantSigned'] == true,
        ownerSigned: json['ownerSigned'] == true,
        active: json['active'] == true,
        documentAvailable: json['documentAvailable'] == true,
        finalDocumentAvailable: json['finalDocumentAvailable'] == true,
      );
  final String id;
  final String checksum;
  final bool tenantSigned;
  final bool ownerSigned;
  final bool active;
  final bool documentAvailable;
  final bool finalDocumentAvailable;
}

final class RentalApplication {
  const RentalApplication({
    required this.id,
    required this.propertyId,
    required this.unitId,
    required this.status,
    required this.approvalMode,
    required this.timeline,
    this.paymentDemandId,
    this.paymentStatus,
    this.totalAmount,
    this.currency,
    this.decisionReason,
    this.lease,
  });

  factory RentalApplication.fromJson(Map<String, Object?> json) {
    final timeline = json['timeline'];
    final lease = json['lease'];
    return RentalApplication(
      id: _optionalString(json, 'id') ?? _requiredString(json, 'requestId'),
      propertyId: _requiredString(json, 'propertyId'),
      unitId: _requiredString(json, 'unitId'),
      status: _applicationStatus(json['status']),
      approvalMode: _approvalMode(json['resolvedApprovalMode']),
      paymentDemandId: _optionalString(json, 'paymentDemandId'),
      paymentStatus: _optionalString(json, 'paymentStatus'),
      totalAmount: _optionalString(json, 'totalAmount'),
      currency: _optionalString(json, 'currency'),
      decisionReason: _optionalString(json, 'decisionReason'),
      timeline: timeline is List
          ? List.unmodifiable(
              timeline.whereType<Map<Object?, Object?>>().map(
                (item) => RentalTimelineEntry.fromJson(
                  Map<String, Object?>.from(item),
                ),
              ),
            )
          : const [],
      lease: lease is Map
          ? RentalLeaseState.fromJson(Map<String, Object?>.from(lease))
          : null,
    );
  }

  final String id;
  final String propertyId;
  final String unitId;
  final RentalApplicationStatus status;
  final RentalApprovalMode approvalMode;
  final String? paymentDemandId;
  final String? paymentStatus;
  final String? totalAmount;
  final String? currency;
  final String? decisionReason;
  final List<RentalTimelineEntry> timeline;
  final RentalLeaseState? lease;
}

final class PaymentSession {
  const PaymentSession({
    required this.requestId,
    required this.demandId,
    required this.paymentUrl,
  });
  factory PaymentSession.fromJson(Map<String, Object?> json) {
    final url = Uri.tryParse(_requiredString(json, 'paymentUrl'));
    if (url == null || url.scheme != 'https' || url.host.isEmpty) {
      throw const FormatException('Unsafe payment URL');
    }
    return PaymentSession(
      requestId: _requiredString(json, 'requestId'),
      demandId: _requiredString(json, 'demandId'),
      paymentUrl: url,
    );
  }
  final String requestId;
  final String demandId;
  final Uri paymentUrl;
}

final class LeaseSignatureInput {
  const LeaseSignatureInput({
    required this.acceptedName,
    required this.checksum,
  });
  final String acceptedName;
  final String checksum;
}

final class RentalLeaseDocument {
  const RentalLeaseDocument({
    required this.bytes,
    required this.fileName,
    required this.contentType,
  });
  final Uint8List bytes;
  final String fileName;
  final String contentType;
}
