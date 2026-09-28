import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/localization/status_labels.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';

enum ManagementFieldType {
  text,
  boolean,
  unitStatus,
  role,
  propertyRentalApproval,
  unitRentalApproval,
}

final class ManagementFormFieldDefinition {
  const ManagementFormFieldDefinition(
    this.key,
    this.label, {
    this.type = ManagementFieldType.text,
    this.required = false,
    this.createOnly = false,
    this.helper,
  });

  final String key;
  final String label;
  final ManagementFieldType type;
  final bool required;
  final bool createOnly;
  final String? helper;
}

final class ManagementColumnDefinition {
  const ManagementColumnDefinition(this.label, this.value);

  final String label;
  final String Function(ManagementRecord record) value;
}

final class ManagementFilterOption {
  const ManagementFilterOption(this.value, this.label);

  final String? value;
  final String label;
}

final class ResourceDefinition {
  const ResourceDefinition({
    required this.title,
    required this.addLabel,
    required this.emptyTitle,
    required this.columns,
    required this.fields,
    required this.filters,
  });

  final String title;
  final String addLabel;
  final String emptyTitle;
  final List<ManagementColumnDefinition> columns;
  final List<ManagementFormFieldDefinition> fields;
  final List<ManagementFilterOption> filters;
}

ResourceDefinition resourceDefinition(
  ManagementResource resource,
  AppLocalizations strings,
  bool isArabic,
) {
  final statusFilters = [
    ManagementFilterOption(null, strings.managementAll),
    ManagementFilterOption('active', strings.managementActive),
    ManagementFilterOption('inactive', strings.managementInactive),
  ];
  return switch (resource) {
    ManagementResource.properties => ResourceDefinition(
      title: strings.managementPropertiesTitle,
      addLabel: strings.managementAddProperty,
      emptyTitle: strings.managementEmptyProperties,
      filters: const [],
      columns: [
        ManagementColumnDefinition(
          strings.managementPropertyCode,
          (record) => (record as PropertyRecord).code,
        ),
        ManagementColumnDefinition(
          strings.fieldName,
          (record) => record.displayName(isArabic),
        ),
        ManagementColumnDefinition(
          strings.fieldStatus,
          (record) => (record as PropertyRecord).isActive
              ? strings.managementActive
              : strings.managementInactive,
        ),
      ],
      fields: [
        ManagementFormFieldDefinition(
          'code',
          strings.managementPropertyCode,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'nameAr',
          strings.managementNameAr,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'nameEn',
          strings.managementNameEn,
          required: true,
        ),
        ManagementFormFieldDefinition('addressAr', strings.managementAddressAr),
        ManagementFormFieldDefinition('addressEn', strings.managementAddressEn),
        ManagementFormFieldDefinition('timezone', strings.managementTimezone),
        ManagementFormFieldDefinition(
          'currencyCode',
          strings.managementCurrency,
        ),
        ManagementFormFieldDefinition(
          'isActive',
          strings.fieldStatus,
          type: ManagementFieldType.boolean,
        ),
        ManagementFormFieldDefinition(
          'rentalApprovalMode',
          strings.rentalApprovalMode,
          type: ManagementFieldType.propertyRentalApproval,
        ),
      ],
    ),
    ManagementResource.units => ResourceDefinition(
      title: strings.managementUnitsTitle,
      addLabel: strings.managementAddUnit,
      emptyTitle: strings.managementEmptyUnits,
      filters: [
        ManagementFilterOption(null, strings.managementAll),
        ManagementFilterOption('vacant', strings.unitStatusVacant),
        ManagementFilterOption('occupied', strings.unitStatusOccupied),
        ManagementFilterOption('reserved', strings.unitStatusReserved),
        ManagementFilterOption('maintenance', strings.unitStatusMaintenance),
        ManagementFilterOption('inactive', strings.managementInactive),
      ],
      columns: [
        ManagementColumnDefinition(
          strings.fieldUnitNumber,
          (record) => (record as UnitRecord).unitNumber,
        ),
        ManagementColumnDefinition(
          strings.fieldFloor,
          (record) => localizedFloor(strings, (record as UnitRecord).floor),
        ),
        ManagementColumnDefinition(
          strings.fieldStatus,
          (record) => localizedManagementUnitStatus(
            strings,
            (record as UnitRecord).status,
          ),
        ),
        ManagementColumnDefinition(
          strings.managementAreaSquareMeters,
          (record) =>
              (record as UnitRecord).areaSquareMeters ??
              strings.managementNotProvided,
        ),
        ManagementColumnDefinition(
          strings.managementMarketRent,
          (record) =>
              (record as UnitRecord).marketRent ??
              strings.managementNotProvided,
        ),
        ManagementColumnDefinition(
          strings.rentalApprovalMode,
          (record) => localizedRentalApprovalMode(
            strings,
            (record as UnitRecord).resolvedRentalApprovalMode,
          ),
        ),
      ],
      fields: [
        ManagementFormFieldDefinition(
          'unitNumber',
          strings.fieldUnitNumber,
          required: true,
        ),
        ManagementFormFieldDefinition('floor', strings.fieldFloor),
        ManagementFormFieldDefinition(
          'status',
          strings.fieldStatus,
          type: ManagementFieldType.unitStatus,
        ),
        ManagementFormFieldDefinition(
          'areaSquareMeters',
          strings.managementAreaSquareMeters,
        ),
        ManagementFormFieldDefinition(
          'marketRent',
          strings.managementMarketRent,
        ),
        ManagementFormFieldDefinition(
          'availableFrom',
          strings.managementAvailableFrom,
        ),
        ManagementFormFieldDefinition(
          'rentalApprovalOverride',
          strings.rentalApprovalMode,
          type: ManagementFieldType.unitRentalApproval,
        ),
      ],
    ),
    ManagementResource.tenants => ResourceDefinition(
      title: strings.managementClientsTitle,
      addLabel: strings.managementAddTenant,
      emptyTitle: strings.managementEmptyTenants,
      filters: statusFilters,
      columns: [
        ManagementColumnDefinition(
          strings.fieldName,
          (record) => record.displayName(isArabic),
        ),
        ManagementColumnDefinition(
          strings.managementRegistrationNumber,
          (record) =>
              (record as TenantRecord).registrationNumber ??
              strings.managementNotProvided,
        ),
        ManagementColumnDefinition(
          strings.fieldStatus,
          (record) => (record as TenantRecord).isActive
              ? strings.managementActive
              : strings.managementInactive,
        ),
      ],
      fields: [
        ManagementFormFieldDefinition(
          'nameAr',
          strings.managementNameAr,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'nameEn',
          strings.managementNameEn,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'registrationNumber',
          strings.managementRegistrationNumber,
        ),
        ManagementFormFieldDefinition('taxNumber', strings.managementTaxNumber),
        ManagementFormFieldDefinition(
          'isActive',
          strings.fieldStatus,
          type: ManagementFieldType.boolean,
        ),
      ],
    ),
    ManagementResource.owners => ResourceDefinition(
      title: strings.managementClientsTitle,
      addLabel: strings.managementAddOwner,
      emptyTitle: strings.managementEmptyOwners,
      filters: const [],
      columns: [
        ManagementColumnDefinition(
          strings.fieldName,
          (record) => record.displayName(isArabic),
        ),
        ManagementColumnDefinition(
          strings.managementRegistrationNumber,
          (record) =>
              (record as OwnerRecord).registrationNumber ??
              strings.managementNotProvided,
        ),
      ],
      fields: [
        ManagementFormFieldDefinition(
          'nameAr',
          strings.managementNameAr,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'nameEn',
          strings.managementNameEn,
          required: true,
        ),
        ManagementFormFieldDefinition(
          'registrationNumber',
          strings.managementRegistrationNumber,
        ),
      ],
    ),
    ManagementResource.staff => ResourceDefinition(
      title: strings.managementTeamTitle,
      addLabel: strings.managementAddStaff,
      emptyTitle: strings.managementEmptyStaff,
      filters: [
        ManagementFilterOption(null, strings.managementAll),
        ManagementFilterOption('property_manager', strings.rolePropertyManager),
        ManagementFilterOption('accountant', strings.roleAccountant),
        ManagementFilterOption('maintenance', strings.roleMaintenance),
        ManagementFilterOption('owner', strings.roleOwner),
        ManagementFilterOption('tenant', strings.roleTenant),
      ],
      columns: [
        ManagementColumnDefinition(
          strings.fieldName,
          (record) => record.displayName(isArabic),
        ),
        ManagementColumnDefinition(
          strings.fieldEmail,
          (record) =>
              (record as StaffRecord).email ?? strings.managementNotProvided,
        ),
        ManagementColumnDefinition(
          strings.fieldRole,
          (record) => localizedRoleLabel(strings, (record as StaffRecord).role),
        ),
        ManagementColumnDefinition(
          strings.fieldStatus,
          (record) => (record as StaffRecord).isActive
              ? strings.managementActive
              : strings.managementInactive,
        ),
      ],
      fields: [
        ManagementFormFieldDefinition(
          'identity',
          strings.managementUserAccountId,
          required: true,
          createOnly: true,
          helper: strings.managementUserAccountIdHelp,
        ),
        ManagementFormFieldDefinition(
          'role',
          strings.fieldRole,
          required: true,
          type: ManagementFieldType.role,
        ),
        ManagementFormFieldDefinition(
          'isActive',
          strings.fieldStatus,
          type: ManagementFieldType.boolean,
        ),
      ],
    ),
  };
}

bool canViewManagementResource(AppRole role, ManagementResource resource) =>
    switch (resource) {
      ManagementResource.properties => {
        AppRole.superAdmin,
        AppRole.propertyManager,
        AppRole.owner,
      }.contains(role),
      ManagementResource.units => {
        AppRole.superAdmin,
        AppRole.propertyManager,
        AppRole.maintenance,
        AppRole.owner,
      }.contains(role),
      ManagementResource.tenants || ManagementResource.owners => {
        AppRole.superAdmin,
        AppRole.propertyManager,
        AppRole.owner,
      }.contains(role),
      ManagementResource.staff => role == AppRole.superAdmin,
    };

bool canCreateManagementResource(AppRole role, ManagementResource resource) {
  if (resource == ManagementResource.staff) return role == AppRole.superAdmin;
  if (resource == ManagementResource.properties) {
    return role == AppRole.superAdmin || role == AppRole.owner;
  }
  return {
    AppRole.superAdmin,
    AppRole.propertyManager,
    AppRole.owner,
  }.contains(role);
}

bool canEditManagementResource(AppRole role, ManagementResource resource) {
  if (resource == ManagementResource.staff) return role == AppRole.superAdmin;
  return {
    AppRole.superAdmin,
    AppRole.propertyManager,
    AppRole.owner,
  }.contains(role);
}

bool canDeactivateManagementResource(
  AppRole role,
  ManagementResource resource,
) {
  return resource != ManagementResource.owners &&
      canEditManagementResource(role, resource);
}

String localizedManagementUnitStatus(AppLocalizations strings, String code) {
  if (code.trim().toLowerCase() == 'inactive') {
    return strings.managementInactive;
  }
  return localizedUnitStatus(strings, code);
}

String localizedFloor(AppLocalizations strings, String? value) {
  final normalized = value?.trim().toUpperCase();
  return switch (normalized) {
    null || '' => strings.managementNotProvided,
    'G' || 'GF' || 'GROUND' => strings.managementGroundFloor,
    'M' || 'MEZZANINE' => strings.managementMezzanineFloor,
    'B' || 'B1' || 'BASEMENT' => strings.managementBasementFloor,
    final floor => strings.managementFloorValue(floor),
  };
}

ManagementInput managementInputFromValues(
  ManagementResource resource,
  Map<String, Object?> values,
) => switch (resource) {
  ManagementResource.properties => PropertyInput(
    code: values['code'] as String?,
    nameAr: values['nameAr'] as String?,
    nameEn: values['nameEn'] as String?,
    addressAr: values['addressAr'] as String?,
    addressEn: values['addressEn'] as String?,
    timezone: values['timezone'] as String?,
    currencyCode: values['currencyCode'] as String?,
    isActive: values['isActive'] as bool?,
    rentalApprovalMode: values['rentalApprovalMode'] as String?,
  ),
  ManagementResource.units => UnitInput(
    unitNumber: values['unitNumber'] as String?,
    floor: values['floor'] as String?,
    status: values['status'] as String?,
    areaSquareMeters: values['areaSquareMeters'] as String?,
    marketRent: values['marketRent'] as String?,
    availableFrom: values['availableFrom'] as String?,
    rentalApprovalOverride: values['rentalApprovalOverride'] as String?,
  ),
  ManagementResource.tenants => TenantInput(
    nameAr: values['nameAr'] as String?,
    nameEn: values['nameEn'] as String?,
    registrationNumber: values['registrationNumber'] as String?,
    taxNumber: values['taxNumber'] as String?,
    isActive: values['isActive'] as bool?,
  ),
  ManagementResource.owners => OwnerInput(
    nameAr: values['nameAr'] as String?,
    nameEn: values['nameEn'] as String?,
    registrationNumber: values['registrationNumber'] as String?,
  ),
  ManagementResource.staff => StaffInput(
    identity: values['identity'] as String?,
    role: values['role'] as String?,
    isActive: values['isActive'] as bool?,
  ),
};

Map<String, Object?> managementValues(ManagementRecord? record) =>
    switch (record) {
      null => const {},
      PropertyRecord item => {
        'code': item.code,
        'nameAr': item.nameAr,
        'nameEn': item.nameEn,
        'addressAr': item.addressAr,
        'addressEn': item.addressEn,
        'timezone': item.timezone,
        'currencyCode': item.currencyCode,
        'isActive': item.isActive,
        'rentalApprovalMode': item.rentalApprovalMode,
      },
      UnitRecord item => {
        'unitNumber': item.unitNumber,
        'floor': item.floor,
        'status': item.status,
        'areaSquareMeters': item.areaSquareMeters,
        'marketRent': item.marketRent,
        'availableFrom': item.availableFrom,
        'rentalApprovalOverride': item.rentalApprovalOverride,
      },
      TenantRecord item => {
        'nameAr': item.nameAr,
        'nameEn': item.nameEn,
        'registrationNumber': item.registrationNumber,
        'taxNumber': item.taxNumber,
        'isActive': item.isActive,
      },
      OwnerRecord item => {
        'nameAr': item.nameAr,
        'nameEn': item.nameEn,
        'registrationNumber': item.registrationNumber,
      },
      StaffRecord item => {'role': item.role, 'isActive': item.isActive},
    };

String localizedRentalApprovalMode(AppLocalizations strings, String code) =>
    code == 'instant'
    ? strings.rentalApprovalInstant
    : strings.rentalApprovalOwnerReview;
