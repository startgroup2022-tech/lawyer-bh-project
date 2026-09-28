import 'package:saraya_square_app/core/localization/app_localizations.dart';

String localizedUnitStatus(AppLocalizations strings, String code) {
  return switch (code.trim().toLowerCase()) {
    'vacant' => strings.unitStatusVacant,
    'occupied' => strings.unitStatusOccupied,
    'reserved' => strings.unitStatusReserved,
    'maintenance' || 'under_maintenance' => strings.unitStatusMaintenance,
    'unavailable' => strings.unitStatusUnavailable,
    _ => strings.unknownStatus,
  };
}

String localizedInvoiceStatus(AppLocalizations strings, String code) {
  return switch (code.trim().toLowerCase()) {
    'draft' => strings.invoiceStatusDraft,
    'due' => strings.invoiceStatusDue,
    'paid' => strings.invoiceStatusPaid,
    'partially_paid' => strings.invoiceStatusPartiallyPaid,
    'overdue' => strings.invoiceStatusOverdue,
    'cancelled' || 'canceled' => strings.invoiceStatusCancelled,
    _ => strings.unknownStatus,
  };
}

String localizedRoleLabel(AppLocalizations strings, String code) {
  return switch (code.trim().toLowerCase()) {
    'super_admin' => strings.roleSuperAdmin,
    'property_manager' => strings.rolePropertyManager,
    'accountant' => strings.roleAccountant,
    'maintenance' => strings.roleMaintenance,
    'owner' => strings.roleOwner,
    'tenant' => strings.roleTenant,
    'visitor' => strings.roleVisitor,
    _ => strings.unknownStatus,
  };
}
