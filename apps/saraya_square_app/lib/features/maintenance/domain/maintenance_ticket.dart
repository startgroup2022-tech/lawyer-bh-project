import 'package:saraya_square_app/core/network/api_error.dart';

final class MaintenanceTicket {
  const MaintenanceTicket({
    required this.id,
    required this.propertyId,
    required this.ticketNumber,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.expenseAmount,
    required this.createdAt,
    required this.updatedAt,
    this.unitId,
    this.tenantOrganizationId,
    this.resolvedAt,
    this.unitNumber,
    this.tenantNameAr,
    this.tenantNameEn,
    this.reportedByNameAr,
    this.reportedByNameEn,
    this.assignedToNameAr,
    this.assignedToNameEn,
  });

  factory MaintenanceTicket.fromJson(Map<String, Object?> json) =>
      MaintenanceTicket(
        id: _requiredString(json, 'id'),
        propertyId: _requiredString(json, 'propertyId'),
        unitId: _optionalString(json['unitId']),
        tenantOrganizationId: _optionalString(json['tenantOrganizationId']),
        ticketNumber: _requiredString(json, 'ticketNumber'),
        title: _requiredString(json, 'title'),
        description: _requiredString(json, 'description'),
        priority: _requiredString(json, 'priority'),
        status: _requiredString(json, 'status'),
        expenseAmount: _requiredMoney(json, 'expenseAmount'),
        resolvedAt: _optionalString(json['resolvedAt']),
        createdAt: _requiredString(json, 'createdAt'),
        updatedAt: _requiredString(json, 'updatedAt'),
        unitNumber: _optionalString(json['unitNumber']),
        tenantNameAr: _optionalString(json['tenantNameAr']),
        tenantNameEn: _optionalString(json['tenantNameEn']),
        reportedByNameAr: _optionalString(json['reportedByNameAr']),
        reportedByNameEn: _optionalString(json['reportedByNameEn']),
        assignedToNameAr: _optionalString(json['assignedToNameAr']),
        assignedToNameEn: _optionalString(json['assignedToNameEn']),
      );

  final String id;
  final String propertyId;
  final String? unitId;
  final String? tenantOrganizationId;
  final String ticketNumber;
  final String title;
  final String description;
  final String priority;
  final String status;
  final String expenseAmount;
  final String? resolvedAt;
  final String createdAt;
  final String updatedAt;
  final String? unitNumber;
  final String? tenantNameAr;
  final String? tenantNameEn;
  final String? reportedByNameAr;
  final String? reportedByNameEn;
  final String? assignedToNameAr;
  final String? assignedToNameEn;
}

final class MaintenanceInput {
  const MaintenanceInput({required this.title, required this.description, required this.priority, required this.status, required this.expenseAmount});
  factory MaintenanceInput.fromTicket(MaintenanceTicket item) => MaintenanceInput(title: item.title, description: item.description, priority: item.priority, status: item.status, expenseAmount: item.expenseAmount);
  final String title;
  final String description;
  final String priority;
  final String status;
  final String expenseAmount;
  Map<String, Object?> toJson() => {'title': title, 'description': description, 'priority': priority, 'status': status, 'expenseAmount': expenseAmount};
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
