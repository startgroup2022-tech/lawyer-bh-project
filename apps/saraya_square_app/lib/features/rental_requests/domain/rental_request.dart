import 'dart:typed_data';

enum RentalRequestDocumentKind {
  identity('identity'),
  paymentProof('payment-proof');

  const RentalRequestDocumentKind(this.apiValue);
  final String apiValue;
}

final class RentalRequestTimelineEvent {
  const RentalRequestTimelineEvent({
    required this.event,
    required this.occurredAt,
  });

  factory RentalRequestTimelineEvent.fromJson(Map<String, Object?> json) =>
      RentalRequestTimelineEvent(
        event: _string(json, 'event'),
        occurredAt: _string(json, 'occurredAt'),
      );

  final String event;
  final String occurredAt;
}

final class RentalRequestQueueItem {
  const RentalRequestQueueItem({
    required this.id,
    required this.unitNumber,
    required this.applicantDisplayName,
    required this.startDate,
    required this.endDate,
    required this.rentAmount,
    required this.depositAmount,
    required this.feeAmount,
    required this.currency,
    required this.status,
    required this.approvalMode,
    required this.paymentState,
    required this.identityDocumentPresent,
    required this.paymentProofPresent,
    required this.demandId,
    required this.timeline,
    this.canApprove = false,
    this.canVerifyOfflinePayment = false,
    this.canDownloadIdentityDocument = false,
    this.canDownloadPaymentProof = false,
  });

  factory RentalRequestQueueItem.fromJson(Map<String, Object?> json) {
    final rawTimeline = json['timeline'];
    if (rawTimeline is! List) throw const FormatException('timeline');
    return RentalRequestQueueItem(
      id: _string(json, 'id'),
      unitNumber: _string(json, 'unitNumber'),
      applicantDisplayName: _string(json, 'applicantDisplayName'),
      startDate: _string(json, 'startDate'),
      endDate: _string(json, 'endDate'),
      rentAmount: _string(json, 'rentAmount'),
      depositAmount: _string(json, 'depositAmount'),
      feeAmount: _string(json, 'feeAmount'),
      currency: _string(json, 'currency'),
      status: _string(json, 'status'),
      approvalMode: _string(json, 'resolvedApprovalMode'),
      paymentState: json['paymentState'] as String?,
      identityDocumentPresent: json['identityDocumentPresent'] == true,
      paymentProofPresent: json['paymentProofPresent'] == true,
      demandId: json['demandId'] as String?,
      canApprove: json['canApprove'] == true,
      canVerifyOfflinePayment: json['canVerifyOfflinePayment'] == true,
      canDownloadIdentityDocument: json['canDownloadIdentityDocument'] == true,
      canDownloadPaymentProof: json['canDownloadPaymentProof'] == true,
      timeline: List.unmodifiable(
        rawTimeline.map(
          (item) => RentalRequestTimelineEvent.fromJson(
            Map<String, Object?>.from(item as Map),
          ),
        ),
      ),
    );
  }

  final String id;
  final String unitNumber;
  final String applicantDisplayName;
  final String startDate;
  final String endDate;
  final String rentAmount;
  final String depositAmount;
  final String feeAmount;
  final String currency;
  final String status;
  final String approvalMode;
  final String? paymentState;
  final bool identityDocumentPresent;
  final bool paymentProofPresent;
  final String? demandId;
  final bool canApprove;
  final bool canVerifyOfflinePayment;
  final bool canDownloadIdentityDocument;
  final bool canDownloadPaymentProof;
  final List<RentalRequestTimelineEvent> timeline;
}

final class RentalRequestPage {
  const RentalRequestPage({required this.items, required this.nextCursor});

  final List<RentalRequestQueueItem> items;
  final String? nextCursor;
}

final class RentalRequestDocument {
  const RentalRequestDocument({
    required this.bytes,
    required this.fileName,
    required this.contentType,
  });

  final Uint8List bytes;
  final String fileName;
  final String contentType;
}

String _string(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException(key);
}
