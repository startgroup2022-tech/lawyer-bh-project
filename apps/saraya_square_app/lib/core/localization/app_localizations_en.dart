// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Saraya Square';

  @override
  String get navOverview => 'Overview';

  @override
  String get navProperties => 'Properties';

  @override
  String get navUnits => 'Units';

  @override
  String get navClients => 'Clients';

  @override
  String get navVirtualAddresses => 'Virtual addresses';

  @override
  String get navMeetingRooms => 'Meeting rooms';

  @override
  String get navLeases => 'Leases';

  @override
  String get navInvoices => 'Invoices';

  @override
  String get navMaintenance => 'Maintenance';

  @override
  String get navDocuments => 'Documents';

  @override
  String get navReports => 'Reports';

  @override
  String get navTeam => 'Team';

  @override
  String get navMyAccount => 'My account';

  @override
  String get navMore => 'More';

  @override
  String get sectionPortfolio => 'Portfolio';

  @override
  String get sectionOperations => 'Operations';

  @override
  String get sectionFinance => 'Finance';

  @override
  String get sectionGovernance => 'Governance';

  @override
  String get actionAdd => 'Add';

  @override
  String get actionCreate => 'Create';

  @override
  String get actionEdit => 'Edit';

  @override
  String get actionDelete => 'Delete';

  @override
  String get actionSave => 'Save';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionApprove => 'Approve';

  @override
  String get actionReject => 'Reject';

  @override
  String get actionSubmit => 'Submit';

  @override
  String get actionView => 'View';

  @override
  String get actionDownload => 'Download';

  @override
  String get actionUpload => 'Upload';

  @override
  String get actionSign => 'Sign';

  @override
  String get actionPay => 'Pay';

  @override
  String get actionIssueReceipt => 'Issue receipt';

  @override
  String get actionRetry => 'Try again';

  @override
  String get actionSearch => 'Search';

  @override
  String get actionFilter => 'Filter';

  @override
  String get actionClose => 'Close';

  @override
  String get actionLogout => 'Log out';

  @override
  String get emptyTitle => 'No data yet';

  @override
  String get emptyDescription =>
      'Information will appear here once it is added.';

  @override
  String get permissionDeniedTitle =>
      'You do not have permission to view this content';

  @override
  String get permissionDeniedDescription =>
      'Contact management if you need access.';

  @override
  String get errorTitle => 'Something went wrong';

  @override
  String get errorDescription =>
      'We could not load the data. Check your connection and try again.';

  @override
  String get offlineTitle => 'You are offline';

  @override
  String get offlineDescription =>
      'Reconnect to the internet to refresh the data.';

  @override
  String get loadingLabel => 'Loading';

  @override
  String get unknownStatus => 'Unknown status';

  @override
  String get roleSuperAdmin => 'Super administrator';

  @override
  String get rolePropertyManager => 'Property manager';

  @override
  String get roleAccountant => 'Accountant';

  @override
  String get roleMaintenance => 'Maintenance team';

  @override
  String get roleOwner => 'Owner';

  @override
  String get roleTenant => 'Tenant';

  @override
  String get roleVisitor => 'Visitor';

  @override
  String get unitStatusVacant => 'Vacant';

  @override
  String get unitStatusOccupied => 'Occupied';

  @override
  String get unitStatusReserved => 'Reserved';

  @override
  String get unitStatusMaintenance => 'Under maintenance';

  @override
  String get unitStatusUnavailable => 'Unavailable';

  @override
  String get invoiceStatusDraft => 'Draft';

  @override
  String get invoiceStatusDue => 'Due';

  @override
  String get invoiceStatusPaid => 'Paid';

  @override
  String get invoiceStatusPartiallyPaid => 'Partially paid';

  @override
  String get invoiceStatusOverdue => 'Overdue';

  @override
  String get invoiceStatusCancelled => 'Cancelled';

  @override
  String get fieldName => 'Name';

  @override
  String get fieldEmail => 'Email';

  @override
  String get fieldPhone => 'Phone number';

  @override
  String get fieldRole => 'Role';

  @override
  String get fieldStatus => 'Status';

  @override
  String get fieldProperty => 'Property';

  @override
  String get fieldUnit => 'Unit';

  @override
  String get fieldUnitNumber => 'Unit number';

  @override
  String get fieldUnitType => 'Unit type';

  @override
  String get fieldFloor => 'Floor';

  @override
  String get fieldArea => 'Area';

  @override
  String get fieldClient => 'Client';

  @override
  String get fieldTenant => 'Tenant';

  @override
  String get fieldOwner => 'Owner';

  @override
  String get fieldContractNumber => 'Contract number';

  @override
  String get fieldStartDate => 'Start date';

  @override
  String get fieldEndDate => 'End date';

  @override
  String get fieldAmount => 'Amount';

  @override
  String get fieldDueDate => 'Due date';

  @override
  String get fieldPaymentDate => 'Payment date';

  @override
  String get fieldInvoiceNumber => 'Invoice number';

  @override
  String get fieldReferenceNumber => 'Reference number';

  @override
  String get fieldDescription => 'Description';

  @override
  String get fieldNotes => 'Notes';

  @override
  String get fieldCreatedAt => 'Created at';

  @override
  String get fieldUpdatedAt => 'Last updated';

  @override
  String get loginTitle => 'Welcome back';

  @override
  String get loginSubtitle => 'Sign in to manage Saraya Square';

  @override
  String get loginIdentityLabel => 'Email or phone number';

  @override
  String get loginIdentityHint => 'name@example.com or +973...';

  @override
  String get loginIdentityRequired => 'Enter your email or phone number';

  @override
  String get loginPasswordLabel => 'Password';

  @override
  String get loginPasswordRequired => 'Enter your password';

  @override
  String get loginAction => 'Sign in';

  @override
  String get switchToArabic => 'العربية';

  @override
  String get switchToEnglish => 'English';

  @override
  String get selectPropertyTitle => 'Select a property';

  @override
  String get checkingSession => 'Checking your session';

  @override
  String get dashboardComingSoon =>
      'Your operational dashboard is being prepared.';

  @override
  String dashboardGreeting(String name) {
    return 'Welcome, $name';
  }

  @override
  String dashboardPropertyContext(String propertyName) {
    return 'Operations summary — $propertyName';
  }

  @override
  String get dashboardOccupiedUnits => 'Occupied units';

  @override
  String get dashboardVacantUnits => 'Vacant units';

  @override
  String get dashboardTenants => 'Tenants';

  @override
  String get dashboardPendingRequests => 'Pending requests';

  @override
  String get dashboardDueAmount => 'Amount due';

  @override
  String get dashboardPaidAmount => 'Amount collected';

  @override
  String get dashboardOverdueAmount => 'Amount overdue';

  @override
  String get dashboardAttentionTitle => 'Needs attention';

  @override
  String get dashboardPendingAttention => 'Requests awaiting review';

  @override
  String get dashboardDueAttention => 'Amounts awaiting collection';

  @override
  String get dashboardOverdueAttention => 'Overdue amounts';

  @override
  String get dashboardQuickActionsTitle => 'Quick actions';

  @override
  String get dashboardQuickUnits => 'Manage units';

  @override
  String get dashboardQuickInvoices => 'View invoices';

  @override
  String get dashboardQuickMaintenance => 'Maintenance requests';

  @override
  String get managementSearchHint => 'Search by name or number';

  @override
  String get managementLoadMore => 'Load more';

  @override
  String get managementAll => 'All';

  @override
  String get managementActive => 'Active';

  @override
  String get managementInactive => 'Inactive';

  @override
  String get managementNotProvided => 'Not provided';

  @override
  String get managementGroundFloor => 'Ground floor';

  @override
  String get managementMezzanineFloor => 'Mezzanine';

  @override
  String get managementBasementFloor => 'Basement';

  @override
  String managementFloorValue(String value) {
    return 'Floor $value';
  }

  @override
  String get managementPropertiesTitle => 'Property management';

  @override
  String get managementUnitsTitle => 'Unit management';

  @override
  String get managementClientsTitle => 'Client management';

  @override
  String get managementTeamTitle => 'Team management';

  @override
  String get managementTenantsTab => 'Tenants';

  @override
  String get managementOwnersTab => 'Owners';

  @override
  String get managementAddProperty => 'Add property';

  @override
  String get managementAddUnit => 'Add unit';

  @override
  String get managementAddTenant => 'Add tenant';

  @override
  String get managementAddOwner => 'Add owner';

  @override
  String get onboardingProperty => 'Property';

  @override
  String get onboardingAvailableUnits => 'Available units';

  @override
  String get onboardingAvailableVirtualAddresses =>
      'Available virtual addresses';

  @override
  String get onboardingSlot => 'Slot';

  @override
  String get onboardingNoUnits => 'No available units in this property';

  @override
  String get onboardingNoVirtualAddresses =>
      'No available virtual addresses in this property';

  @override
  String get onboardingSelectAsset =>
      'Select at least one unit or virtual address';

  @override
  String get onboardingOwnerProperties => 'Owner properties';

  @override
  String get onboardingSelectProperty => 'Select at least one property';

  @override
  String get onboardingLoadFailed => 'Could not load the available options';

  @override
  String get onboardingSaveFailed => 'Could not save the onboarding record';

  @override
  String get managementAddStaff => 'Add team member';

  @override
  String get managementEmptyProperties => 'No properties yet';

  @override
  String get managementEmptyUnits => 'No units yet';

  @override
  String get managementEmptyTenants => 'No tenants yet';

  @override
  String get managementEmptyOwners => 'No owners yet';

  @override
  String get managementEmptyStaff => 'No team members yet';

  @override
  String get managementEmptyAction =>
      'Add the first record to start managing this section.';

  @override
  String get managementOwnerArchiveUnavailable =>
      'Owner deactivation is not available yet.';

  @override
  String get managementOwnerArchiveExplanation =>
      'The current service does not support owner archiving, so an unavailable action is not shown.';

  @override
  String get managementDeactivate => 'Deactivate';

  @override
  String get managementDeactivateTitle => 'Confirm deactivation';

  @override
  String managementDeactivateMessage(String name) {
    return 'Deactivate $name?';
  }

  @override
  String get managementSavedConfirmation => 'Changes saved successfully.';

  @override
  String get managementDeactivatedConfirmation => 'Deactivated successfully.';

  @override
  String get managementFieldRequired => 'This field is required.';

  @override
  String get managementFieldInvalid => 'Check this field value.';

  @override
  String get managementNoPermission =>
      'You do not have permission to manage this section.';

  @override
  String get managementPropertyCode => 'Property code';

  @override
  String get managementNameAr => 'Arabic name';

  @override
  String get managementNameEn => 'English name';

  @override
  String get managementAddressAr => 'Arabic address';

  @override
  String get managementAddressEn => 'English address';

  @override
  String get managementTimezone => 'Timezone';

  @override
  String get managementCurrency => 'Currency';

  @override
  String get managementRegistrationNumber => 'Registration number';

  @override
  String get managementTaxNumber => 'Tax number';

  @override
  String get managementMarketRent => 'Market rent';

  @override
  String get managementAvailableFrom => 'Available from';

  @override
  String get managementUserAccountId => 'Email or phone number';

  @override
  String get managementUserAccountIdHelp =>
      'Enter an existing user\'s email or an international phone number beginning with +.';

  @override
  String get managementAreaSquareMeters => 'Area in square metres';

  @override
  String get managementEditRecord => 'Edit record';

  @override
  String get managementCreateRecord => 'Add record';

  @override
  String get invoiceListTitle => 'Invoices and collections';

  @override
  String get invoiceListDescription =>
      'Amounts and statuses shown here come directly from the registered invoices.';

  @override
  String get invoiceEmptyTitle => 'No invoices yet';

  @override
  String get invoiceEmptyDescription =>
      'Registered invoices will appear here when they are issued.';

  @override
  String get invoiceTotalAmount => 'Invoice total';

  @override
  String get invoicePaidAmount => 'Paid amount';

  @override
  String get invoicePaymentAction => 'Payment';

  @override
  String get invoiceOpenPayment => 'Open payment link';

  @override
  String get invoiceOpenFailed => 'The payment link could not be opened.';

  @override
  String get invoiceAdd => 'Add invoice';

  @override
  String get invoiceCreate => 'Create invoice';

  @override
  String get invoiceTarget => 'Rental and unit';

  @override
  String get invoiceAmountBhd => 'Amount (BHD)';

  @override
  String get invoiceIssueDate => 'Issue date (YYYY-MM-DD)';

  @override
  String get invoiceCreated => 'Invoice created successfully';

  @override
  String get invoiceCreateFailed => 'The invoice could not be created';

  @override
  String get invoiceNoTargets =>
      'No eligible rental relationship is available for invoicing';

  @override
  String get accountTitle => 'My account';

  @override
  String get accountDescription =>
      'Manage your profile, contact details, access and password.';

  @override
  String get accountProfileTitle => 'Profile details';

  @override
  String get accountSecurityTitle => 'Password and security';

  @override
  String get accountSecurityDescription =>
      'Changing your password signs out your other sessions.';

  @override
  String get accountAccessTitle => 'Property access';

  @override
  String get accountCurrentPassword => 'Current password';

  @override
  String get accountNewPassword => 'New password';

  @override
  String get accountConfirmPassword => 'Confirm new password';

  @override
  String get accountIdentityPasswordHelp =>
      'Required only when changing the email or phone number.';

  @override
  String get accountCurrentPasswordRequired => 'Current password is required.';

  @override
  String get accountPasswordsMismatch => 'Passwords do not match.';

  @override
  String get accountChangePassword => 'Change password';

  @override
  String get accountSaved => 'Account details saved.';

  @override
  String get accountPasswordChanged => 'Password changed successfully.';

  @override
  String get virtualAddressTitle => 'Virtual address inventory';

  @override
  String get virtualAddressDescription =>
      'Manage the 50 commercial address slots registered for Saraya Square.';

  @override
  String get virtualAddressTotal => 'Total addresses';

  @override
  String get virtualAddressAvailable => 'Available';

  @override
  String get virtualAddressActive => 'Active subscriptions';

  @override
  String get virtualAddressEmpty => 'No virtual addresses are configured.';

  @override
  String get virtualAddressCode => 'Address code';

  @override
  String get virtualAddressTenant => 'Client';

  @override
  String get virtualAddressBusinessName => 'Registered business name';

  @override
  String get virtualAddressBusinessNameAr =>
      'Registered business name in Arabic';

  @override
  String get virtualAddressBusinessNameEn =>
      'Registered business name in English';

  @override
  String get virtualAddressMonthlyFee => 'Monthly fee';

  @override
  String get virtualAddressPeriod => 'Subscription period';

  @override
  String get virtualAddressStatusAvailable => 'Available';

  @override
  String get virtualAddressStatusReserved => 'Reserved';

  @override
  String get virtualAddressStatusActive => 'Active';

  @override
  String get virtualAddressStatusSuspended => 'Suspended';

  @override
  String get virtualAddressStatusInactive => 'Inactive';

  @override
  String get meetingRoomTitle => 'Meeting room inventory';

  @override
  String get meetingRoomAdd => 'Add room';

  @override
  String get meetingRoomEdit => 'Edit room';

  @override
  String get meetingBookingAdd => 'Add booking';

  @override
  String get meetingBookingUser => 'Booking for';

  @override
  String get meetingBookingActivateRoom =>
      'Activate a meeting room before adding a booking';

  @override
  String get meetingBookingNoUsers =>
      'No active tenant or owner user is available for booking';

  @override
  String get meetingBookingTitle => 'Meeting-room bookings';

  @override
  String get meetingBookingEmpty => 'No bookings registered';

  @override
  String get meetingBookingPurpose => 'Booking purpose';

  @override
  String get meetingBookingAttendees => 'Attendees';

  @override
  String get meetingBookingStart => 'Start time';

  @override
  String get meetingBookingEnd => 'End time';

  @override
  String get meetingBookingConfirm => 'Confirm booking';

  @override
  String get meetingBookingReject => 'Reject booking';

  @override
  String get meetingBookingCancel => 'Cancel booking';

  @override
  String get meetingBookingComplete => 'Complete booking';

  @override
  String get meetingBookingSaved => 'Booking updated successfully';

  @override
  String get meetingBookingFailed => 'The booking could not be updated';

  @override
  String get meetingBookingStatusPending => 'Pending';

  @override
  String get meetingBookingStatusConfirmed => 'Confirmed';

  @override
  String get meetingBookingStatusRejected => 'Rejected';

  @override
  String get meetingBookingStatusCancelled => 'Cancelled';

  @override
  String get meetingBookingStatusCompleted => 'Completed';

  @override
  String get meetingRoomCode => 'Room code';

  @override
  String get meetingRoomOpeningTime => 'Opening time';

  @override
  String get meetingRoomClosingTime => 'Closing time';

  @override
  String get meetingRoomDescription =>
      'Manage room availability, operating hours, capacity and booking rates.';

  @override
  String get meetingRoomTotal => 'Total rooms';

  @override
  String get meetingRoomActive => 'Available for booking';

  @override
  String get meetingRoomMaintenance => 'Under maintenance';

  @override
  String get meetingRoomEmptyTitle => 'No meeting rooms are configured';

  @override
  String get meetingRoomEmptyDescription =>
      'Add the two Saraya Square meeting rooms before accepting bookings.';

  @override
  String get meetingRoomCapacity => 'Capacity';

  @override
  String get meetingRoomRate => 'Hourly rate';

  @override
  String get meetingRoomHours => 'Operating hours';

  @override
  String get meetingRoomMinimum => 'Minimum booking';

  @override
  String meetingRoomPeople(int count) {
    return '$count people';
  }

  @override
  String meetingRoomMinutes(int count) {
    return '$count minutes';
  }

  @override
  String get meetingRoomStatusActive => 'Active';

  @override
  String get meetingRoomStatusMaintenance => 'Maintenance';

  @override
  String get meetingRoomStatusInactive => 'Inactive';

  @override
  String get leaseTitle => 'Lease portfolio';

  @override
  String get leaseDescription =>
      'Review registered lease terms, periods and operational status.';

  @override
  String get leaseTotal => 'Total leases';

  @override
  String get leaseActive => 'Active';

  @override
  String get leaseRenewalRequested => 'Renewal requested';

  @override
  String get leaseEmptyTitle => 'No leases registered';

  @override
  String get leaseEmptyDescription =>
      'Approved lease records will appear here with their current terms.';

  @override
  String get leaseTenant => 'Tenant';

  @override
  String get leasePeriod => 'Lease period';

  @override
  String get leaseRent => 'Rent amount';

  @override
  String get leaseFrequency => 'Payment frequency';

  @override
  String get leaseDueDay => 'Due day';

  @override
  String leaseDueDayValue(int day) {
    return 'Day $day';
  }

  @override
  String get leaseStatusDraft => 'Draft';

  @override
  String get leaseStatusPendingApproval => 'Pending approval';

  @override
  String get leaseStatusActive => 'Active';

  @override
  String get leaseStatusRenewalRequested => 'Renewal requested';

  @override
  String get leaseStatusRejected => 'Rejected';

  @override
  String get leaseStatusTerminated => 'Terminated';

  @override
  String get leaseStatusClosed => 'Closed';

  @override
  String get leaseFrequencyMonthly => 'Monthly';

  @override
  String get leaseFrequencyQuarterly => 'Quarterly';

  @override
  String get leaseFrequencyAnnual => 'Annual';

  @override
  String get leaseActions => 'Actions';

  @override
  String get leaseApprove => 'Approve lease';

  @override
  String get leaseRequestRenewal => 'Request renewal';

  @override
  String get leaseApproveRenewal => 'Approve renewal';

  @override
  String get leaseRejectRenewal => 'Reject renewal';

  @override
  String get leaseTerminate => 'Terminate lease';

  @override
  String get leaseClose => 'Close lease';

  @override
  String get leaseTerminationReason => 'Termination reason (optional)';

  @override
  String get leaseRenewalTerms => 'Renewal terms';

  @override
  String get leaseActionCompleted => 'Lease updated successfully';

  @override
  String get leaseActionFailed => 'The lease could not be updated';

  @override
  String get leaseDeposit => 'Deposit amount';

  @override
  String get leaseGraceDays => 'Grace days';

  @override
  String get maintenanceTitle => 'Maintenance tickets';

  @override
  String get maintenanceAdd => 'Add ticket';

  @override
  String get maintenanceEdit => 'Edit ticket';

  @override
  String get maintenanceDescription =>
      'Track reported issues, priorities, assignments, progress and registered expenses.';

  @override
  String get maintenanceTotal => 'Total tickets';

  @override
  String get maintenanceOpen => 'Open work';

  @override
  String get maintenanceUrgent => 'Urgent';

  @override
  String get maintenanceEmptyTitle => 'No maintenance tickets';

  @override
  String get maintenanceEmptyDescription =>
      'Reported maintenance issues will appear here for tracking.';

  @override
  String get maintenanceTicketNumber => 'Ticket';

  @override
  String get maintenanceIssue => 'Issue';

  @override
  String get maintenancePriority => 'Priority';

  @override
  String get maintenanceAssignee => 'Assigned to';

  @override
  String get maintenanceExpense => 'Expenses';

  @override
  String get maintenanceReportedBy => 'Reported by';

  @override
  String get maintenancePriorityLow => 'Low';

  @override
  String get maintenancePriorityMedium => 'Medium';

  @override
  String get maintenancePriorityHigh => 'High';

  @override
  String get maintenancePriorityUrgent => 'Urgent';

  @override
  String get maintenanceStatusOpen => 'Open';

  @override
  String get maintenanceStatusAssigned => 'Assigned';

  @override
  String get maintenanceStatusInProgress => 'In progress';

  @override
  String get maintenanceStatusAwaitingParts => 'Awaiting parts';

  @override
  String get maintenanceStatusResolved => 'Resolved';

  @override
  String get maintenanceStatusClosed => 'Closed';

  @override
  String get maintenanceStatusCancelled => 'Cancelled';

  @override
  String get documentTitle => 'Document library';

  @override
  String get documentDescription =>
      'Review property, tenant, lease and operational documents registered for Saraya Square.';

  @override
  String get documentTotal => 'Total documents';

  @override
  String get documentActive => 'Active files';

  @override
  String get documentWithExpiry => 'With expiry date';

  @override
  String get documentEmptyTitle => 'No documents registered';

  @override
  String get documentEmptyDescription =>
      'Uploaded contracts, identity records, receipts and operational files will appear here.';

  @override
  String get documentName => 'Document';

  @override
  String get documentCategory => 'Category';

  @override
  String get documentFileSize => 'File size';

  @override
  String get documentUploadedBy => 'Uploaded by';

  @override
  String get documentStatusActive => 'Active';

  @override
  String get documentStatusArchived => 'Archived';

  @override
  String get documentEdit => 'Edit document';

  @override
  String get documentExpiresOn => 'Expiry date (YYYY-MM-DD)';

  @override
  String get documentUpdated => 'Document updated successfully';

  @override
  String get documentUpdateFailed => 'The document could not be updated';

  @override
  String get documentAdd => 'Add document';

  @override
  String get documentChooseFile => 'Choose file';

  @override
  String get documentNoFileSelected => 'No file selected';

  @override
  String get documentAllowedFiles => 'PDF, JPG or PNG up to 4 MB';

  @override
  String get documentUpload => 'Upload document';

  @override
  String get documentUploaded => 'Document uploaded successfully';

  @override
  String get documentUploadFailed => 'The document could not be uploaded';

  @override
  String get documentFileRequired => 'Choose a file';

  @override
  String get documentFileTooLarge => 'The file exceeds 4 MB';

  @override
  String get documentCategoryLease => 'Lease';

  @override
  String get documentCategoryIdentity => 'Identity';

  @override
  String get documentCategoryCommercialRegistration =>
      'Commercial registration';

  @override
  String get documentCategoryHandover => 'Handover';

  @override
  String get documentCategoryInvoice => 'Invoice';

  @override
  String get documentCategoryReceipt => 'Receipt';

  @override
  String get documentCategoryMaintenance => 'Maintenance';

  @override
  String get documentCategoryUtility => 'Utilities';

  @override
  String get documentCategoryOther => 'Other';

  @override
  String get reportsTitle => 'Operational reports';

  @override
  String get reportsDescription =>
      'A live financial and operational summary based on registered Saraya Square data.';

  @override
  String get reportsPeriod => 'Report period';

  @override
  String get reportsToday => 'Today';

  @override
  String get reportsMonth => 'This month';

  @override
  String get reportsQuarter => 'Current quarter';

  @override
  String get reportsYear => 'This year';

  @override
  String get reportsCustom => 'Custom period';

  @override
  String get reportsComprehensive => 'Comprehensive report';

  @override
  String get reportsFinance => 'Finance and collection';

  @override
  String get reportsInvoices => 'Invoices';

  @override
  String get reportsLeases => 'Leases';

  @override
  String get reportsOccupancy => 'Units and occupancy';

  @override
  String get reportsClients => 'Tenants and owners';

  @override
  String get reportsVirtualAddresses => 'Virtual addresses';

  @override
  String get reportsMaintenance => 'Maintenance and expenses';

  @override
  String get reportsMeetingRooms => 'Meeting-room bookings';

  @override
  String get reportsDownloadPdf => 'Download PDF';

  @override
  String get reportsDownloadExcel => 'Download Excel';

  @override
  String get reportsReady => 'The report is ready and downloaded';

  @override
  String get reportsFailed => 'The report could not be prepared. Try again.';

  @override
  String get reportsComprehensiveDescription =>
      'Executive summary and all financial and operational sections in one file.';

  @override
  String get reportsFocusedDescription =>
      'A formatted detailed report for the selected period, ready for review and printing.';

  @override
  String get publicHomeHeroEyebrow => 'Saraya Square Business Hub';

  @override
  String get publicHomeHeroTitle =>
      'Your business starts at a distinguished address';

  @override
  String get publicHomeHeroDescription =>
      'Flexible offices, shops, and business addresses in one destination designed for growth.';

  @override
  String get publicHomeBrowse => 'Browse availability';

  @override
  String get publicHomeLogin => 'Admin and tenant login';

  @override
  String get publicHomeUnitsTitle => 'Available units';

  @override
  String get publicHomeUnitsDescription =>
      'Choose an office or shop ready for your next business move.';

  @override
  String get publicHomeVirtualTitle => 'Virtual addresses';

  @override
  String get publicHomeVirtualDescription =>
      'A trusted business address at Saraya Square without a permanent office.';

  @override
  String get publicHomeAvailable => 'Available now';

  @override
  String get publicHomeTotal => 'Total addresses';

  @override
  String get publicHomeMonthly => 'monthly';

  @override
  String get publicHomeArea => 'Area';

  @override
  String get publicHomeFloor => 'Floor';

  @override
  String get publicHomeEmpty => 'No units are publicly listed right now.';

  @override
  String get publicHomeLoadFailed => 'Live availability could not be loaded.';

  @override
  String get publicHomeRetry => 'Try again';

  @override
  String get publicHomeFooter => 'Saraya Square — Bahrain';

  @override
  String get navViewings => 'Viewing appointments';

  @override
  String get unitDetailsTitle => 'Unit details';

  @override
  String get unitDetailsNotFound =>
      'This unit is no longer publicly available.';

  @override
  String get unitNumber => 'Unit';

  @override
  String get unitMonthlyRent => 'Monthly rent';

  @override
  String get unitRentNow => 'Rent now';

  @override
  String get viewingBookVisit => 'Book a visit';

  @override
  String get viewingSelectSlot => 'Select an available appointment.';

  @override
  String get viewingBookingFailed =>
      'The visit could not be booked. Try again.';

  @override
  String get viewingBookingConfirmed => 'Your visit is confirmed';

  @override
  String get viewingSlotsLoadFailed =>
      'Available appointments could not be loaded.';

  @override
  String get viewingAvailableTimes => 'Available times';

  @override
  String get viewingNoSlots => 'No visit appointments are currently available.';

  @override
  String get viewingPlacesLeft => 'places left';

  @override
  String get viewingVisitorName => 'Full name';

  @override
  String get viewingVisitorPhone => 'Phone number';

  @override
  String get viewingPhoneInvalid =>
      'Enter a phone in international format, for example +97339000000.';

  @override
  String get viewingVisitorEmail => 'Email address';

  @override
  String get viewingEmailInvalid => 'Enter a valid email address.';

  @override
  String get viewingConfirmVisit => 'Confirm visit';

  @override
  String get viewingManagementTitle => 'Viewing appointments';

  @override
  String get viewingManagementDescription =>
      'Publish visit times and follow up each confirmed appointment.';

  @override
  String get viewingUpcoming => 'Upcoming appointments';

  @override
  String get viewingAddSlot => 'Add visit time';

  @override
  String get viewingLoadFailed => 'Viewing appointments could not be loaded.';

  @override
  String get viewingNoAppointments => 'No viewing appointments are scheduled.';

  @override
  String get viewingNoAccess => 'You do not have access to this section.';

  @override
  String get viewingUpdateFailed => 'The appointment could not be updated.';

  @override
  String get viewingSlotPublished => 'The visit time was published.';

  @override
  String get viewingSlotFailed => 'The visit time could not be published.';

  @override
  String get viewingPublishedSlots => 'Published visit times';

  @override
  String get viewingSlotStatusActive => 'Active';

  @override
  String get viewingSlotStatusDisabled => 'Disabled';

  @override
  String get viewingBooked => 'booked';

  @override
  String get viewingComplete => 'Mark completed';

  @override
  String get viewingNoShow => 'No-show';

  @override
  String get viewingStatusConfirmed => 'Confirmed';

  @override
  String get viewingStatusCompleted => 'Completed';

  @override
  String get viewingStatusNoShow => 'No-show';

  @override
  String get viewingStatusCancelled => 'Cancelled';

  @override
  String get viewingStartAt => 'Start (YYYY-MM-DD HH:mm)';

  @override
  String get viewingEndAt => 'End (YYYY-MM-DD HH:mm)';

  @override
  String get viewingCapacity => 'Capacity';

  @override
  String get viewingUnitOptional => 'Unit ID (optional)';

  @override
  String get viewingPropertyWideHint =>
      'Leave empty to make the appointment available for the property.';

  @override
  String get fieldRequired => 'This field is required.';

  @override
  String get rentalEntryTitle => 'Rental application';

  @override
  String get rentalEntryBackToUnit => 'Back to unit details';

  @override
  String get rentalTermsTitle => 'Rental terms';

  @override
  String get rentalTermsBody =>
      'Review the live unit price and approval policy before continuing. Submitting an application does not guarantee the unit until the server confirms it.';

  @override
  String get rentalTermsAccept =>
      'I have reviewed and accept the rental application terms';

  @override
  String get rentalStart => 'Start rental application';

  @override
  String get rentalApplicantTitle => 'Applicant and verification';

  @override
  String get rentalApplicantIndividual => 'Individual';

  @override
  String get rentalApplicantCompany => 'Company';

  @override
  String get rentalNameAr => 'Legal name in Arabic';

  @override
  String get rentalNameEn => 'Legal name in English';

  @override
  String get rentalRegistrationNumber => 'Commercial registration number';

  @override
  String get rentalOtpIdentity => 'Email or international phone';

  @override
  String get rentalOtpRequest => 'Send verification code';

  @override
  String get rentalOtpCode => '6-digit verification code';

  @override
  String get rentalOtpVerify => 'Verify and continue';

  @override
  String get rentalDocumentTitle => 'Identity document';

  @override
  String get rentalDocumentHelp =>
      'Upload one private PDF, JPG or PNG identity document.';

  @override
  String get rentalDocumentPick => 'Choose private document';

  @override
  String rentalDocumentSelected(String name) {
    return 'Selected: $name';
  }

  @override
  String get rentalDatesTitle => 'Requested rental dates';

  @override
  String get rentalDurationMonths => 'Duration in months';

  @override
  String get rentalReviewTitle => 'Review application';

  @override
  String get rentalNext => 'Continue';

  @override
  String get rentalBack => 'Back';

  @override
  String get rentalSubmit => 'Submit rental application';

  @override
  String get rentalLoadFailed =>
      'The unit could not be loaded. It may no longer be available.';

  @override
  String get rentalActionFailed =>
      'The request could not be completed. Check the fields and try again.';

  @override
  String get rentalStatusTitle => 'Rental application status';

  @override
  String get rentalStatusPendingOwner => 'Awaiting owner approval';

  @override
  String get rentalStatusApprovedPayment => 'Approved — payment required';

  @override
  String get rentalStatusRejected => 'Application rejected';

  @override
  String get rentalStatusPaidSignature =>
      'Payment confirmed — signatures required';

  @override
  String get rentalStatusCompleted => 'Lease active';

  @override
  String get rentalStatusCancelled => 'Application cancelled';

  @override
  String get rentalTimelineTitle => 'Application timeline';

  @override
  String get rentalPaymentTitle => 'Choose payment method';

  @override
  String get rentalPayOnline => 'Pay securely with Tap';

  @override
  String get rentalPayOffline => 'Upload transfer receipt';

  @override
  String get rentalPaymentReference => 'Bank transfer reference';

  @override
  String get rentalPaymentOpenFailed =>
      'The secure payment page could not be opened.';

  @override
  String get rentalOfflineSubmitted => 'The receipt was submitted for review.';

  @override
  String get rentalLeaseTitle => 'Lease and signatures';

  @override
  String get rentalLeaseChecksum => 'Lease checksum';

  @override
  String get rentalLeaseDraft => 'Open lease draft';

  @override
  String get rentalLegalName => 'Type your full legal name';

  @override
  String get rentalAcceptChecksum =>
      'I reviewed this exact lease checksum and accept it';

  @override
  String get rentalTenantSignature => 'Tenant signature';

  @override
  String get rentalOwnerSignature => 'Owner signature';

  @override
  String get rentalSigned => 'Signed';

  @override
  String get rentalAwaitingSignature => 'Awaiting signature';

  @override
  String get rentalRefreshHint => 'Pull down to refresh the live status.';

  @override
  String get rentalApprovalMode => 'Rental approval';

  @override
  String get rentalApprovalInherit => 'Inherit property setting';

  @override
  String get rentalApprovalInstant => 'Instant approval';

  @override
  String get rentalApprovalOwnerReview => 'Owner review';

  @override
  String get navRentalRequests => 'Rental requests';

  @override
  String get rentalQueueTitle => 'Rental request queue';

  @override
  String get rentalQueueEmpty => 'No rental requests yet';

  @override
  String get rentalQueueLoadFailed => 'Rental requests could not be loaded.';

  @override
  String get rentalApplicant => 'Applicant';

  @override
  String get rentalRequestedDates => 'Requested dates';

  @override
  String get rentalPriceSnapshot => 'Price snapshot';

  @override
  String get rentalPaymentState => 'Payment state';

  @override
  String get rentalDocumentAvailable => 'Application document available';

  @override
  String get rentalDownloadDocument => 'Download document';

  @override
  String get rentalDownloadIdentityDocument => 'Download identity document';

  @override
  String get rentalDownloadPaymentProof => 'Download payment proof';

  @override
  String get rentalLoadMore => 'Load more';

  @override
  String get rentalApprove => 'Approve';

  @override
  String get rentalReject => 'Reject';

  @override
  String get rentalConfirmApprovalTitle => 'Confirm approval';

  @override
  String get rentalConfirmApprovalBody =>
      'Approve this rental request using its saved price and dates?';

  @override
  String get rentalRejectionReason => 'Rejection reason';

  @override
  String get rentalRejectionReasonRequired => 'Rejection reason is required';

  @override
  String get rentalVerifyPayment => 'Verify payment';

  @override
  String get rentalRejectPayment => 'Reject payment';

  @override
  String get rentalConfirmPaymentTitle => 'Confirm payment verification';

  @override
  String get rentalConfirmPaymentBody =>
      'Confirm that the offline receipt has been reviewed and accepted?';

  @override
  String get rentalActionSucceeded => 'The request was updated successfully.';

  @override
  String get rentalDocumentDownloaded =>
      'The document was downloaded securely.';

  @override
  String get rentalTimeline => 'Timeline';
}
