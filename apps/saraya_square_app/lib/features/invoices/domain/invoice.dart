import 'package:saraya_square_app/core/network/api_error.dart';

final class InvoiceTarget {
  const InvoiceTarget({
    required this.rentalRequestId,
    required this.unitNumber,
    required this.tenantNameAr,
    required this.tenantNameEn,
  });

  factory InvoiceTarget.fromJson(Map<String, Object?> json) => InvoiceTarget(
    rentalRequestId: _requiredString(json, 'rentalRequestId'),
    unitNumber: _requiredString(json, 'unitNumber'),
    tenantNameAr: _requiredString(json, 'tenantNameAr'),
    tenantNameEn: _requiredString(json, 'tenantNameEn'),
  );

  final String rentalRequestId;
  final String unitNumber;
  final String tenantNameAr;
  final String tenantNameEn;
}

final class InvoiceCreateInput {
  const InvoiceCreateInput({
    required this.rentalRequestId,
    required this.description,
    required this.amount,
    required this.issueDate,
    required this.dueDate,
    required this.status,
  });

  final String rentalRequestId;
  final String description;
  final String amount;
  final String issueDate;
  final String dueDate;
  final String status;

  Map<String, Object> toJson(String propertyId) => {
    'propertyId': propertyId,
    'rentalRequestId': rentalRequestId,
    'description': description,
    'amount': amount,
    'issueDate': issueDate,
    'dueDate': dueDate,
    'status': status,
  };
}

final class InvoiceRecord {
  const InvoiceRecord({
    required this.id,
    required this.propertyId,
    required this.rentalRequestId,
    required this.number,
    required this.status,
    required this.issueDate,
    required this.dueDate,
    required this.totalAmount,
    required this.paidAmount,
    required this.currency,
    required this.unitId,
    required this.unitNumber,
    this.paymentDemandId,
    this.paymentStatus,
    this.paymentUrl,
  });

  factory InvoiceRecord.fromJson(Map<String, Object?> json) => InvoiceRecord(
    id: _requiredString(json, 'id'),
    propertyId: _requiredString(json, 'propertyId'),
    rentalRequestId: _requiredString(json, 'rentalRequestId'),
    number: _requiredString(json, 'number'),
    status: _requiredString(json, 'status'),
    issueDate: _requiredString(json, 'issueDate'),
    dueDate: _requiredString(json, 'dueDate'),
    totalAmount: _requiredMoney(json, 'totalAmount'),
    paidAmount: _requiredMoney(json, 'paidAmount'),
    currency: _requiredString(json, 'currency'),
    unitId: _requiredString(json, 'unitId'),
    unitNumber: _requiredString(json, 'unitNumber'),
    paymentDemandId: _optionalString(json['paymentDemandId']),
    paymentStatus: _optionalString(json['paymentStatus']),
    paymentUrl: _safePaymentUrl(json['paymentUrl']),
  );

  final String id;
  final String propertyId;
  final String rentalRequestId;
  final String number;
  final String status;
  final String issueDate;
  final String dueDate;
  final String totalAmount;
  final String paidAmount;
  final String currency;
  final String unitId;
  final String unitNumber;
  final String? paymentDemandId;
  final String? paymentStatus;
  final Uri? paymentUrl;
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

String _requiredMoney(Map<String, Object?> json, String key) {
  final value = _requiredString(json, key);
  if (!RegExp(r'^\d+(?:\.\d+)?$').hasMatch(value)) {
    throw ApiError.invalidResponse(200);
  }
  return value;
}

String? _optionalString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

Uri? _safePaymentUrl(Object? value) {
  final raw = _optionalString(value);
  if (raw == null) return null;
  final uri = Uri.tryParse(raw);
  if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return null;
  return uri;
}
