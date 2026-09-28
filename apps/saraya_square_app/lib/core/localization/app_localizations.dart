import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'localization/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In ar, this message translates to:
  /// **'سرايا سكوير'**
  String get appName;

  /// No description provided for @navOverview.
  ///
  /// In ar, this message translates to:
  /// **'نظرة عامة'**
  String get navOverview;

  /// No description provided for @navProperties.
  ///
  /// In ar, this message translates to:
  /// **'العقارات'**
  String get navProperties;

  /// No description provided for @navUnits.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات'**
  String get navUnits;

  /// No description provided for @navClients.
  ///
  /// In ar, this message translates to:
  /// **'العملاء'**
  String get navClients;

  /// No description provided for @navVirtualAddresses.
  ///
  /// In ar, this message translates to:
  /// **'العناوين الافتراضية'**
  String get navVirtualAddresses;

  /// No description provided for @navMeetingRooms.
  ///
  /// In ar, this message translates to:
  /// **'قاعات الاجتماعات'**
  String get navMeetingRooms;

  /// No description provided for @navLeases.
  ///
  /// In ar, this message translates to:
  /// **'العقود'**
  String get navLeases;

  /// No description provided for @navInvoices.
  ///
  /// In ar, this message translates to:
  /// **'الفواتير'**
  String get navInvoices;

  /// No description provided for @navMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'الصيانة'**
  String get navMaintenance;

  /// No description provided for @navDocuments.
  ///
  /// In ar, this message translates to:
  /// **'المستندات'**
  String get navDocuments;

  /// No description provided for @navReports.
  ///
  /// In ar, this message translates to:
  /// **'التقارير'**
  String get navReports;

  /// No description provided for @navTeam.
  ///
  /// In ar, this message translates to:
  /// **'الفريق'**
  String get navTeam;

  /// No description provided for @navMyAccount.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get navMyAccount;

  /// No description provided for @navMore.
  ///
  /// In ar, this message translates to:
  /// **'المزيد'**
  String get navMore;

  /// No description provided for @sectionPortfolio.
  ///
  /// In ar, this message translates to:
  /// **'المحفظة'**
  String get sectionPortfolio;

  /// No description provided for @sectionOperations.
  ///
  /// In ar, this message translates to:
  /// **'التشغيل'**
  String get sectionOperations;

  /// No description provided for @sectionFinance.
  ///
  /// In ar, this message translates to:
  /// **'المالية'**
  String get sectionFinance;

  /// No description provided for @sectionGovernance.
  ///
  /// In ar, this message translates to:
  /// **'الحوكمة'**
  String get sectionGovernance;

  /// No description provided for @actionAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة'**
  String get actionAdd;

  /// No description provided for @actionCreate.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء'**
  String get actionCreate;

  /// No description provided for @actionEdit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل'**
  String get actionEdit;

  /// No description provided for @actionDelete.
  ///
  /// In ar, this message translates to:
  /// **'حذف'**
  String get actionDelete;

  /// No description provided for @actionSave.
  ///
  /// In ar, this message translates to:
  /// **'حفظ'**
  String get actionSave;

  /// No description provided for @actionCancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء'**
  String get actionCancel;

  /// No description provided for @actionApprove.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد'**
  String get actionApprove;

  /// No description provided for @actionReject.
  ///
  /// In ar, this message translates to:
  /// **'رفض'**
  String get actionReject;

  /// No description provided for @actionSubmit.
  ///
  /// In ar, this message translates to:
  /// **'إرسال'**
  String get actionSubmit;

  /// No description provided for @actionView.
  ///
  /// In ar, this message translates to:
  /// **'عرض'**
  String get actionView;

  /// No description provided for @actionDownload.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل'**
  String get actionDownload;

  /// No description provided for @actionUpload.
  ///
  /// In ar, this message translates to:
  /// **'رفع'**
  String get actionUpload;

  /// No description provided for @actionSign.
  ///
  /// In ar, this message translates to:
  /// **'توقيع'**
  String get actionSign;

  /// No description provided for @actionPay.
  ///
  /// In ar, this message translates to:
  /// **'دفع'**
  String get actionPay;

  /// No description provided for @actionIssueReceipt.
  ///
  /// In ar, this message translates to:
  /// **'إصدار إيصال'**
  String get actionIssueReceipt;

  /// No description provided for @actionRetry.
  ///
  /// In ar, this message translates to:
  /// **'حاول مجددًا'**
  String get actionRetry;

  /// No description provided for @actionSearch.
  ///
  /// In ar, this message translates to:
  /// **'بحث'**
  String get actionSearch;

  /// No description provided for @actionFilter.
  ///
  /// In ar, this message translates to:
  /// **'تصفية'**
  String get actionFilter;

  /// No description provided for @actionClose.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق'**
  String get actionClose;

  /// No description provided for @actionLogout.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الخروج'**
  String get actionLogout;

  /// No description provided for @emptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد بيانات حتى الآن'**
  String get emptyTitle;

  /// No description provided for @emptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر المعلومات هنا عند إضافتها.'**
  String get emptyDescription;

  /// No description provided for @permissionDeniedTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا تملك صلاحية لعرض هذا المحتوى'**
  String get permissionDeniedTitle;

  /// No description provided for @permissionDeniedDescription.
  ///
  /// In ar, this message translates to:
  /// **'تواصل مع الإدارة إذا كنت تحتاج إلى الوصول.'**
  String get permissionDeniedDescription;

  /// No description provided for @errorTitle.
  ///
  /// In ar, this message translates to:
  /// **'حدث خطأ ما'**
  String get errorTitle;

  /// No description provided for @errorDescription.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل البيانات. تحقق من الاتصال وحاول مجددًا.'**
  String get errorDescription;

  /// No description provided for @offlineTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد اتصال بالإنترنت'**
  String get offlineTitle;

  /// No description provided for @offlineDescription.
  ///
  /// In ar, this message translates to:
  /// **'أعد الاتصال بالإنترنت لتحديث البيانات.'**
  String get offlineDescription;

  /// No description provided for @loadingLabel.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ التحميل'**
  String get loadingLabel;

  /// No description provided for @unknownStatus.
  ///
  /// In ar, this message translates to:
  /// **'حالة غير معروفة'**
  String get unknownStatus;

  /// No description provided for @roleSuperAdmin.
  ///
  /// In ar, this message translates to:
  /// **'مدير النظام'**
  String get roleSuperAdmin;

  /// No description provided for @rolePropertyManager.
  ///
  /// In ar, this message translates to:
  /// **'مدير المجمع'**
  String get rolePropertyManager;

  /// No description provided for @roleAccountant.
  ///
  /// In ar, this message translates to:
  /// **'محاسب'**
  String get roleAccountant;

  /// No description provided for @roleMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'فريق الصيانة'**
  String get roleMaintenance;

  /// No description provided for @roleOwner.
  ///
  /// In ar, this message translates to:
  /// **'مالك'**
  String get roleOwner;

  /// No description provided for @roleTenant.
  ///
  /// In ar, this message translates to:
  /// **'مستأجر'**
  String get roleTenant;

  /// No description provided for @roleVisitor.
  ///
  /// In ar, this message translates to:
  /// **'زائر'**
  String get roleVisitor;

  /// No description provided for @unitStatusVacant.
  ///
  /// In ar, this message translates to:
  /// **'شاغرة'**
  String get unitStatusVacant;

  /// No description provided for @unitStatusOccupied.
  ///
  /// In ar, this message translates to:
  /// **'مؤجرة'**
  String get unitStatusOccupied;

  /// No description provided for @unitStatusReserved.
  ///
  /// In ar, this message translates to:
  /// **'محجوزة'**
  String get unitStatusReserved;

  /// No description provided for @unitStatusMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'تحت الصيانة'**
  String get unitStatusMaintenance;

  /// No description provided for @unitStatusUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'غير متاحة'**
  String get unitStatusUnavailable;

  /// No description provided for @invoiceStatusDraft.
  ///
  /// In ar, this message translates to:
  /// **'مسودة'**
  String get invoiceStatusDraft;

  /// No description provided for @invoiceStatusDue.
  ///
  /// In ar, this message translates to:
  /// **'مستحقة'**
  String get invoiceStatusDue;

  /// No description provided for @invoiceStatusPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة'**
  String get invoiceStatusPaid;

  /// No description provided for @invoiceStatusPartiallyPaid.
  ///
  /// In ar, this message translates to:
  /// **'مدفوعة جزئيًا'**
  String get invoiceStatusPartiallyPaid;

  /// No description provided for @invoiceStatusOverdue.
  ///
  /// In ar, this message translates to:
  /// **'متأخرة'**
  String get invoiceStatusOverdue;

  /// No description provided for @invoiceStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغاة'**
  String get invoiceStatusCancelled;

  /// No description provided for @fieldName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم'**
  String get fieldName;

  /// No description provided for @fieldEmail.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني'**
  String get fieldEmail;

  /// No description provided for @fieldPhone.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف'**
  String get fieldPhone;

  /// No description provided for @fieldRole.
  ///
  /// In ar, this message translates to:
  /// **'الدور'**
  String get fieldRole;

  /// No description provided for @fieldStatus.
  ///
  /// In ar, this message translates to:
  /// **'الحالة'**
  String get fieldStatus;

  /// No description provided for @fieldProperty.
  ///
  /// In ar, this message translates to:
  /// **'العقار'**
  String get fieldProperty;

  /// No description provided for @fieldUnit.
  ///
  /// In ar, this message translates to:
  /// **'الوحدة'**
  String get fieldUnit;

  /// No description provided for @fieldUnitNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم الوحدة'**
  String get fieldUnitNumber;

  /// No description provided for @fieldUnitType.
  ///
  /// In ar, this message translates to:
  /// **'نوع الوحدة'**
  String get fieldUnitType;

  /// No description provided for @fieldFloor.
  ///
  /// In ar, this message translates to:
  /// **'الطابق'**
  String get fieldFloor;

  /// No description provided for @fieldArea.
  ///
  /// In ar, this message translates to:
  /// **'المساحة'**
  String get fieldArea;

  /// No description provided for @fieldClient.
  ///
  /// In ar, this message translates to:
  /// **'العميل'**
  String get fieldClient;

  /// No description provided for @fieldTenant.
  ///
  /// In ar, this message translates to:
  /// **'المستأجر'**
  String get fieldTenant;

  /// No description provided for @fieldOwner.
  ///
  /// In ar, this message translates to:
  /// **'المالك'**
  String get fieldOwner;

  /// No description provided for @fieldContractNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم العقد'**
  String get fieldContractNumber;

  /// No description provided for @fieldStartDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ البداية'**
  String get fieldStartDate;

  /// No description provided for @fieldEndDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ النهاية'**
  String get fieldEndDate;

  /// No description provided for @fieldAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ'**
  String get fieldAmount;

  /// No description provided for @fieldDueDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الاستحقاق'**
  String get fieldDueDate;

  /// No description provided for @fieldPaymentDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الدفع'**
  String get fieldPaymentDate;

  /// No description provided for @fieldInvoiceNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم الفاتورة'**
  String get fieldInvoiceNumber;

  /// No description provided for @fieldReferenceNumber.
  ///
  /// In ar, this message translates to:
  /// **'الرقم المرجعي'**
  String get fieldReferenceNumber;

  /// No description provided for @fieldDescription.
  ///
  /// In ar, this message translates to:
  /// **'الوصف'**
  String get fieldDescription;

  /// No description provided for @fieldNotes.
  ///
  /// In ar, this message translates to:
  /// **'ملاحظات'**
  String get fieldNotes;

  /// No description provided for @fieldCreatedAt.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الإنشاء'**
  String get fieldCreatedAt;

  /// No description provided for @fieldUpdatedAt.
  ///
  /// In ar, this message translates to:
  /// **'آخر تحديث'**
  String get fieldUpdatedAt;

  /// No description provided for @loginTitle.
  ///
  /// In ar, this message translates to:
  /// **'مرحبًا بعودتك'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In ar, this message translates to:
  /// **'سجّل الدخول لإدارة سرايا سكوير'**
  String get loginSubtitle;

  /// No description provided for @loginIdentityLabel.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني أو رقم الهاتف'**
  String get loginIdentityLabel;

  /// No description provided for @loginIdentityHint.
  ///
  /// In ar, this message translates to:
  /// **'name@example.com أو +973...'**
  String get loginIdentityHint;

  /// No description provided for @loginIdentityRequired.
  ///
  /// In ar, this message translates to:
  /// **'أدخل البريد الإلكتروني أو رقم الهاتف'**
  String get loginIdentityRequired;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور'**
  String get loginPasswordLabel;

  /// No description provided for @loginPasswordRequired.
  ///
  /// In ar, this message translates to:
  /// **'أدخل كلمة المرور'**
  String get loginPasswordRequired;

  /// No description provided for @loginAction.
  ///
  /// In ar, this message translates to:
  /// **'تسجيل الدخول'**
  String get loginAction;

  /// No description provided for @switchToArabic.
  ///
  /// In ar, this message translates to:
  /// **'العربية'**
  String get switchToArabic;

  /// No description provided for @switchToEnglish.
  ///
  /// In ar, this message translates to:
  /// **'English'**
  String get switchToEnglish;

  /// No description provided for @selectPropertyTitle.
  ///
  /// In ar, this message translates to:
  /// **'اختر العقار'**
  String get selectPropertyTitle;

  /// No description provided for @checkingSession.
  ///
  /// In ar, this message translates to:
  /// **'جارٍ التحقق من الجلسة'**
  String get checkingSession;

  /// No description provided for @dashboardComingSoon.
  ///
  /// In ar, this message translates to:
  /// **'يجري تجهيز لوحة العمليات الخاصة بك.'**
  String get dashboardComingSoon;

  /// No description provided for @dashboardGreeting.
  ///
  /// In ar, this message translates to:
  /// **'مرحبًا، {name}'**
  String dashboardGreeting(String name);

  /// No description provided for @dashboardPropertyContext.
  ///
  /// In ar, this message translates to:
  /// **'ملخص التشغيل — {propertyName}'**
  String dashboardPropertyContext(String propertyName);

  /// No description provided for @dashboardOccupiedUnits.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات المؤجرة'**
  String get dashboardOccupiedUnits;

  /// No description provided for @dashboardVacantUnits.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات الشاغرة'**
  String get dashboardVacantUnits;

  /// No description provided for @dashboardTenants.
  ///
  /// In ar, this message translates to:
  /// **'المستأجرون'**
  String get dashboardTenants;

  /// No description provided for @dashboardPendingRequests.
  ///
  /// In ar, this message translates to:
  /// **'الطلبات المعلقة'**
  String get dashboardPendingRequests;

  /// No description provided for @dashboardDueAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبالغ المستحقة'**
  String get dashboardDueAmount;

  /// No description provided for @dashboardPaidAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبالغ المحصلة'**
  String get dashboardPaidAmount;

  /// No description provided for @dashboardOverdueAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبالغ المتأخرة'**
  String get dashboardOverdueAmount;

  /// No description provided for @dashboardAttentionTitle.
  ///
  /// In ar, this message translates to:
  /// **'تحتاج إلى متابعة'**
  String get dashboardAttentionTitle;

  /// No description provided for @dashboardPendingAttention.
  ///
  /// In ar, this message translates to:
  /// **'طلبات بانتظار المراجعة'**
  String get dashboardPendingAttention;

  /// No description provided for @dashboardDueAttention.
  ///
  /// In ar, this message translates to:
  /// **'مبالغ مستحقة للتحصيل'**
  String get dashboardDueAttention;

  /// No description provided for @dashboardOverdueAttention.
  ///
  /// In ar, this message translates to:
  /// **'مبالغ متأخرة'**
  String get dashboardOverdueAttention;

  /// No description provided for @dashboardQuickActionsTitle.
  ///
  /// In ar, this message translates to:
  /// **'إجراءات سريعة'**
  String get dashboardQuickActionsTitle;

  /// No description provided for @dashboardQuickUnits.
  ///
  /// In ar, this message translates to:
  /// **'إدارة الوحدات'**
  String get dashboardQuickUnits;

  /// No description provided for @dashboardQuickInvoices.
  ///
  /// In ar, this message translates to:
  /// **'عرض الفواتير'**
  String get dashboardQuickInvoices;

  /// No description provided for @dashboardQuickMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'طلبات الصيانة'**
  String get dashboardQuickMaintenance;

  /// No description provided for @managementSearchHint.
  ///
  /// In ar, this message translates to:
  /// **'ابحث بالاسم أو الرقم'**
  String get managementSearchHint;

  /// No description provided for @managementLoadMore.
  ///
  /// In ar, this message translates to:
  /// **'تحميل المزيد'**
  String get managementLoadMore;

  /// No description provided for @managementAll.
  ///
  /// In ar, this message translates to:
  /// **'الكل'**
  String get managementAll;

  /// No description provided for @managementActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get managementActive;

  /// No description provided for @managementInactive.
  ///
  /// In ar, this message translates to:
  /// **'غير نشط'**
  String get managementInactive;

  /// No description provided for @managementNotProvided.
  ///
  /// In ar, this message translates to:
  /// **'غير مضاف'**
  String get managementNotProvided;

  /// No description provided for @managementGroundFloor.
  ///
  /// In ar, this message translates to:
  /// **'الطابق الأرضي'**
  String get managementGroundFloor;

  /// No description provided for @managementMezzanineFloor.
  ///
  /// In ar, this message translates to:
  /// **'الميزانين'**
  String get managementMezzanineFloor;

  /// No description provided for @managementBasementFloor.
  ///
  /// In ar, this message translates to:
  /// **'الطابق السفلي'**
  String get managementBasementFloor;

  /// No description provided for @managementFloorValue.
  ///
  /// In ar, this message translates to:
  /// **'الطابق {value}'**
  String managementFloorValue(String value);

  /// No description provided for @managementPropertiesTitle.
  ///
  /// In ar, this message translates to:
  /// **'إدارة العقارات'**
  String get managementPropertiesTitle;

  /// No description provided for @managementUnitsTitle.
  ///
  /// In ar, this message translates to:
  /// **'إدارة الوحدات'**
  String get managementUnitsTitle;

  /// No description provided for @managementClientsTitle.
  ///
  /// In ar, this message translates to:
  /// **'إدارة العملاء'**
  String get managementClientsTitle;

  /// No description provided for @managementTeamTitle.
  ///
  /// In ar, this message translates to:
  /// **'إدارة الفريق'**
  String get managementTeamTitle;

  /// No description provided for @managementTenantsTab.
  ///
  /// In ar, this message translates to:
  /// **'المستأجرون'**
  String get managementTenantsTab;

  /// No description provided for @managementOwnersTab.
  ///
  /// In ar, this message translates to:
  /// **'الملاك'**
  String get managementOwnersTab;

  /// No description provided for @managementAddProperty.
  ///
  /// In ar, this message translates to:
  /// **'إضافة عقار'**
  String get managementAddProperty;

  /// No description provided for @managementAddUnit.
  ///
  /// In ar, this message translates to:
  /// **'إضافة وحدة'**
  String get managementAddUnit;

  /// No description provided for @managementAddTenant.
  ///
  /// In ar, this message translates to:
  /// **'إضافة مستأجر'**
  String get managementAddTenant;

  /// No description provided for @managementAddOwner.
  ///
  /// In ar, this message translates to:
  /// **'إضافة مالك'**
  String get managementAddOwner;

  /// No description provided for @onboardingProperty.
  ///
  /// In ar, this message translates to:
  /// **'العقار'**
  String get onboardingProperty;

  /// No description provided for @onboardingAvailableUnits.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات المتاحة'**
  String get onboardingAvailableUnits;

  /// No description provided for @onboardingAvailableVirtualAddresses.
  ///
  /// In ar, this message translates to:
  /// **'العناوين الافتراضية المتاحة'**
  String get onboardingAvailableVirtualAddresses;

  /// No description provided for @onboardingSlot.
  ///
  /// In ar, this message translates to:
  /// **'الخانة'**
  String get onboardingSlot;

  /// No description provided for @onboardingNoUnits.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وحدات متاحة في هذا العقار'**
  String get onboardingNoUnits;

  /// No description provided for @onboardingNoVirtualAddresses.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عناوين افتراضية متاحة في هذا العقار'**
  String get onboardingNoVirtualAddresses;

  /// No description provided for @onboardingSelectAsset.
  ///
  /// In ar, this message translates to:
  /// **'اختر وحدة أو عنوانًا افتراضيًا واحدًا على الأقل'**
  String get onboardingSelectAsset;

  /// No description provided for @onboardingOwnerProperties.
  ///
  /// In ar, this message translates to:
  /// **'عقارات المالك'**
  String get onboardingOwnerProperties;

  /// No description provided for @onboardingSelectProperty.
  ///
  /// In ar, this message translates to:
  /// **'اختر عقارًا واحدًا على الأقل'**
  String get onboardingSelectProperty;

  /// No description provided for @onboardingLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل الخيارات المتاحة'**
  String get onboardingLoadFailed;

  /// No description provided for @onboardingSaveFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر حفظ سجل الإضافة'**
  String get onboardingSaveFailed;

  /// No description provided for @managementAddStaff.
  ///
  /// In ar, this message translates to:
  /// **'إضافة عضو فريق'**
  String get managementAddStaff;

  /// No description provided for @managementEmptyProperties.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عقارات بعد'**
  String get managementEmptyProperties;

  /// No description provided for @managementEmptyUnits.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وحدات بعد'**
  String get managementEmptyUnits;

  /// No description provided for @managementEmptyTenants.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد مستأجرون بعد'**
  String get managementEmptyTenants;

  /// No description provided for @managementEmptyOwners.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد ملاك بعد'**
  String get managementEmptyOwners;

  /// No description provided for @managementEmptyStaff.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد أعضاء فريق بعد'**
  String get managementEmptyStaff;

  /// No description provided for @managementEmptyAction.
  ///
  /// In ar, this message translates to:
  /// **'أضف أول سجل لبدء إدارة هذا القسم.'**
  String get managementEmptyAction;

  /// No description provided for @managementOwnerArchiveUnavailable.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء تنشيط المالك غير متاح حاليًا.'**
  String get managementOwnerArchiveUnavailable;

  /// No description provided for @managementOwnerArchiveExplanation.
  ///
  /// In ar, this message translates to:
  /// **'الخدمة الحالية لا تدعم أرشفة المالك، لذلك لن يظهر إجراء غير قابل للتنفيذ.'**
  String get managementOwnerArchiveExplanation;

  /// No description provided for @managementDeactivate.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء التنشيط'**
  String get managementDeactivate;

  /// No description provided for @managementDeactivateTitle.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد إلغاء التنشيط'**
  String get managementDeactivateTitle;

  /// No description provided for @managementDeactivateMessage.
  ///
  /// In ar, this message translates to:
  /// **'هل تريد إلغاء تنشيط {name}؟'**
  String managementDeactivateMessage(String name);

  /// No description provided for @managementSavedConfirmation.
  ///
  /// In ar, this message translates to:
  /// **'تم حفظ التغييرات بنجاح.'**
  String get managementSavedConfirmation;

  /// No description provided for @managementDeactivatedConfirmation.
  ///
  /// In ar, this message translates to:
  /// **'تم إلغاء التنشيط بنجاح.'**
  String get managementDeactivatedConfirmation;

  /// No description provided for @managementFieldRequired.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحقل مطلوب.'**
  String get managementFieldRequired;

  /// No description provided for @managementFieldInvalid.
  ///
  /// In ar, this message translates to:
  /// **'تحقق من قيمة هذا الحقل.'**
  String get managementFieldInvalid;

  /// No description provided for @managementNoPermission.
  ///
  /// In ar, this message translates to:
  /// **'لا تملك صلاحية إدارة هذا القسم.'**
  String get managementNoPermission;

  /// No description provided for @managementPropertyCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز العقار'**
  String get managementPropertyCode;

  /// No description provided for @managementNameAr.
  ///
  /// In ar, this message translates to:
  /// **'الاسم بالعربية'**
  String get managementNameAr;

  /// No description provided for @managementNameEn.
  ///
  /// In ar, this message translates to:
  /// **'الاسم بالإنجليزية'**
  String get managementNameEn;

  /// No description provided for @managementAddressAr.
  ///
  /// In ar, this message translates to:
  /// **'العنوان بالعربية'**
  String get managementAddressAr;

  /// No description provided for @managementAddressEn.
  ///
  /// In ar, this message translates to:
  /// **'العنوان بالإنجليزية'**
  String get managementAddressEn;

  /// No description provided for @managementTimezone.
  ///
  /// In ar, this message translates to:
  /// **'المنطقة الزمنية'**
  String get managementTimezone;

  /// No description provided for @managementCurrency.
  ///
  /// In ar, this message translates to:
  /// **'العملة'**
  String get managementCurrency;

  /// No description provided for @managementRegistrationNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم السجل'**
  String get managementRegistrationNumber;

  /// No description provided for @managementTaxNumber.
  ///
  /// In ar, this message translates to:
  /// **'الرقم الضريبي'**
  String get managementTaxNumber;

  /// No description provided for @managementMarketRent.
  ///
  /// In ar, this message translates to:
  /// **'الإيجار السوقي'**
  String get managementMarketRent;

  /// No description provided for @managementAvailableFrom.
  ///
  /// In ar, this message translates to:
  /// **'متاحة من'**
  String get managementAvailableFrom;

  /// No description provided for @managementUserAccountId.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني أو رقم الهاتف'**
  String get managementUserAccountId;

  /// No description provided for @managementUserAccountIdHelp.
  ///
  /// In ar, this message translates to:
  /// **'أدخل بريد مستخدم موجود أو رقم هاتف دوليًا يبدأ بعلامة +.'**
  String get managementUserAccountIdHelp;

  /// No description provided for @managementAreaSquareMeters.
  ///
  /// In ar, this message translates to:
  /// **'المساحة بالمتر المربع'**
  String get managementAreaSquareMeters;

  /// No description provided for @managementEditRecord.
  ///
  /// In ar, this message translates to:
  /// **'تعديل السجل'**
  String get managementEditRecord;

  /// No description provided for @managementCreateRecord.
  ///
  /// In ar, this message translates to:
  /// **'إضافة سجل'**
  String get managementCreateRecord;

  /// No description provided for @invoiceListTitle.
  ///
  /// In ar, this message translates to:
  /// **'الفواتير والتحصيل'**
  String get invoiceListTitle;

  /// No description provided for @invoiceListDescription.
  ///
  /// In ar, this message translates to:
  /// **'المبالغ والحالات المعروضة مأخوذة مباشرة من الفواتير المسجلة.'**
  String get invoiceListDescription;

  /// No description provided for @invoiceEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد فواتير بعد'**
  String get invoiceEmptyTitle;

  /// No description provided for @invoiceEmptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر الفواتير المسجلة هنا عند إصدارها.'**
  String get invoiceEmptyDescription;

  /// No description provided for @invoiceTotalAmount.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي الفاتورة'**
  String get invoiceTotalAmount;

  /// No description provided for @invoicePaidAmount.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ المدفوع'**
  String get invoicePaidAmount;

  /// No description provided for @invoicePaymentAction.
  ///
  /// In ar, this message translates to:
  /// **'الدفع'**
  String get invoicePaymentAction;

  /// No description provided for @invoiceOpenPayment.
  ///
  /// In ar, this message translates to:
  /// **'فتح رابط الدفع'**
  String get invoiceOpenPayment;

  /// No description provided for @invoiceOpenFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر فتح رابط الدفع.'**
  String get invoiceOpenFailed;

  /// No description provided for @invoiceAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة فاتورة'**
  String get invoiceAdd;

  /// No description provided for @invoiceCreate.
  ///
  /// In ar, this message translates to:
  /// **'إنشاء الفاتورة'**
  String get invoiceCreate;

  /// No description provided for @invoiceTarget.
  ///
  /// In ar, this message translates to:
  /// **'العقد والوحدة'**
  String get invoiceTarget;

  /// No description provided for @invoiceAmountBhd.
  ///
  /// In ar, this message translates to:
  /// **'المبلغ (د.ب)'**
  String get invoiceAmountBhd;

  /// No description provided for @invoiceIssueDate.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الإصدار (سنة-شهر-يوم)'**
  String get invoiceIssueDate;

  /// No description provided for @invoiceCreated.
  ///
  /// In ar, this message translates to:
  /// **'تم إنشاء الفاتورة بنجاح'**
  String get invoiceCreated;

  /// No description provided for @invoiceCreateFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر إنشاء الفاتورة'**
  String get invoiceCreateFailed;

  /// No description provided for @invoiceNoTargets.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد علاقة إيجارية مؤهلة لإصدار فاتورة'**
  String get invoiceNoTargets;

  /// No description provided for @accountTitle.
  ///
  /// In ar, this message translates to:
  /// **'حسابي'**
  String get accountTitle;

  /// No description provided for @accountDescription.
  ///
  /// In ar, this message translates to:
  /// **'إدارة الملف الشخصي وبيانات التواصل والصلاحيات وكلمة المرور.'**
  String get accountDescription;

  /// No description provided for @accountProfileTitle.
  ///
  /// In ar, this message translates to:
  /// **'بيانات الملف الشخصي'**
  String get accountProfileTitle;

  /// No description provided for @accountSecurityTitle.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور والأمان'**
  String get accountSecurityTitle;

  /// No description provided for @accountSecurityDescription.
  ///
  /// In ar, this message translates to:
  /// **'تغيير كلمة المرور ينهي الجلسات الأخرى.'**
  String get accountSecurityDescription;

  /// No description provided for @accountAccessTitle.
  ///
  /// In ar, this message translates to:
  /// **'صلاحيات العقارات'**
  String get accountAccessTitle;

  /// No description provided for @accountCurrentPassword.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور الحالية'**
  String get accountCurrentPassword;

  /// No description provided for @accountNewPassword.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور الجديدة'**
  String get accountNewPassword;

  /// No description provided for @accountConfirmPassword.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد كلمة المرور الجديدة'**
  String get accountConfirmPassword;

  /// No description provided for @accountIdentityPasswordHelp.
  ///
  /// In ar, this message translates to:
  /// **'مطلوبة فقط عند تغيير البريد الإلكتروني أو رقم الهاتف.'**
  String get accountIdentityPasswordHelp;

  /// No description provided for @accountCurrentPasswordRequired.
  ///
  /// In ar, this message translates to:
  /// **'كلمة المرور الحالية مطلوبة.'**
  String get accountCurrentPasswordRequired;

  /// No description provided for @accountPasswordsMismatch.
  ///
  /// In ar, this message translates to:
  /// **'كلمتا المرور غير متطابقتين.'**
  String get accountPasswordsMismatch;

  /// No description provided for @accountChangePassword.
  ///
  /// In ar, this message translates to:
  /// **'تغيير كلمة المرور'**
  String get accountChangePassword;

  /// No description provided for @accountSaved.
  ///
  /// In ar, this message translates to:
  /// **'تم حفظ بيانات الحساب.'**
  String get accountSaved;

  /// No description provided for @accountPasswordChanged.
  ///
  /// In ar, this message translates to:
  /// **'تم تغيير كلمة المرور بنجاح.'**
  String get accountPasswordChanged;

  /// No description provided for @virtualAddressTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجل العناوين الافتراضية'**
  String get virtualAddressTitle;

  /// No description provided for @virtualAddressDescription.
  ///
  /// In ar, this message translates to:
  /// **'إدارة خمسين عنوانًا تجاريًا مسجلًا ضمن سرايا سكوير.'**
  String get virtualAddressDescription;

  /// No description provided for @virtualAddressTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي العناوين'**
  String get virtualAddressTotal;

  /// No description provided for @virtualAddressAvailable.
  ///
  /// In ar, this message translates to:
  /// **'المتاحة'**
  String get virtualAddressAvailable;

  /// No description provided for @virtualAddressActive.
  ///
  /// In ar, this message translates to:
  /// **'الاشتراكات النشطة'**
  String get virtualAddressActive;

  /// No description provided for @virtualAddressEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لم تتم تهيئة العناوين الافتراضية.'**
  String get virtualAddressEmpty;

  /// No description provided for @virtualAddressCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز العنوان'**
  String get virtualAddressCode;

  /// No description provided for @virtualAddressTenant.
  ///
  /// In ar, this message translates to:
  /// **'العميل'**
  String get virtualAddressTenant;

  /// No description provided for @virtualAddressBusinessName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم التجاري المسجل'**
  String get virtualAddressBusinessName;

  /// No description provided for @virtualAddressBusinessNameAr.
  ///
  /// In ar, this message translates to:
  /// **'الاسم التجاري المسجل بالعربية'**
  String get virtualAddressBusinessNameAr;

  /// No description provided for @virtualAddressBusinessNameEn.
  ///
  /// In ar, this message translates to:
  /// **'الاسم التجاري المسجل بالإنجليزية'**
  String get virtualAddressBusinessNameEn;

  /// No description provided for @virtualAddressMonthlyFee.
  ///
  /// In ar, this message translates to:
  /// **'الرسوم الشهرية'**
  String get virtualAddressMonthlyFee;

  /// No description provided for @virtualAddressPeriod.
  ///
  /// In ar, this message translates to:
  /// **'فترة الاشتراك'**
  String get virtualAddressPeriod;

  /// No description provided for @virtualAddressStatusAvailable.
  ///
  /// In ar, this message translates to:
  /// **'متاح'**
  String get virtualAddressStatusAvailable;

  /// No description provided for @virtualAddressStatusReserved.
  ///
  /// In ar, this message translates to:
  /// **'محجوز'**
  String get virtualAddressStatusReserved;

  /// No description provided for @virtualAddressStatusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get virtualAddressStatusActive;

  /// No description provided for @virtualAddressStatusSuspended.
  ///
  /// In ar, this message translates to:
  /// **'موقوف'**
  String get virtualAddressStatusSuspended;

  /// No description provided for @virtualAddressStatusInactive.
  ///
  /// In ar, this message translates to:
  /// **'غير نشط'**
  String get virtualAddressStatusInactive;

  /// No description provided for @meetingRoomTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجل قاعات الاجتماعات'**
  String get meetingRoomTitle;

  /// No description provided for @meetingRoomAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة قاعة'**
  String get meetingRoomAdd;

  /// No description provided for @meetingRoomEdit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل القاعة'**
  String get meetingRoomEdit;

  /// No description provided for @meetingBookingAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة حجز'**
  String get meetingBookingAdd;

  /// No description provided for @meetingBookingUser.
  ///
  /// In ar, this message translates to:
  /// **'الحجز لصالح'**
  String get meetingBookingUser;

  /// No description provided for @meetingBookingActivateRoom.
  ///
  /// In ar, this message translates to:
  /// **'فعّل إحدى قاعات الاجتماعات قبل إضافة حجز'**
  String get meetingBookingActivateRoom;

  /// No description provided for @meetingBookingNoUsers.
  ///
  /// In ar, this message translates to:
  /// **'لا يوجد مستخدم مستأجر أو مالك نشط متاح للحجز'**
  String get meetingBookingNoUsers;

  /// No description provided for @meetingBookingTitle.
  ///
  /// In ar, this message translates to:
  /// **'حجوزات قاعات الاجتماعات'**
  String get meetingBookingTitle;

  /// No description provided for @meetingBookingEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد حجوزات مسجلة'**
  String get meetingBookingEmpty;

  /// No description provided for @meetingBookingPurpose.
  ///
  /// In ar, this message translates to:
  /// **'غرض الحجز'**
  String get meetingBookingPurpose;

  /// No description provided for @meetingBookingAttendees.
  ///
  /// In ar, this message translates to:
  /// **'عدد الحضور'**
  String get meetingBookingAttendees;

  /// No description provided for @meetingBookingStart.
  ///
  /// In ar, this message translates to:
  /// **'وقت البداية'**
  String get meetingBookingStart;

  /// No description provided for @meetingBookingEnd.
  ///
  /// In ar, this message translates to:
  /// **'وقت النهاية'**
  String get meetingBookingEnd;

  /// No description provided for @meetingBookingConfirm.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد الحجز'**
  String get meetingBookingConfirm;

  /// No description provided for @meetingBookingReject.
  ///
  /// In ar, this message translates to:
  /// **'رفض الحجز'**
  String get meetingBookingReject;

  /// No description provided for @meetingBookingCancel.
  ///
  /// In ar, this message translates to:
  /// **'إلغاء الحجز'**
  String get meetingBookingCancel;

  /// No description provided for @meetingBookingComplete.
  ///
  /// In ar, this message translates to:
  /// **'إكمال الحجز'**
  String get meetingBookingComplete;

  /// No description provided for @meetingBookingSaved.
  ///
  /// In ar, this message translates to:
  /// **'تم تحديث الحجز بنجاح'**
  String get meetingBookingSaved;

  /// No description provided for @meetingBookingFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحديث الحجز'**
  String get meetingBookingFailed;

  /// No description provided for @meetingBookingStatusPending.
  ///
  /// In ar, this message translates to:
  /// **'قيد المراجعة'**
  String get meetingBookingStatusPending;

  /// No description provided for @meetingBookingStatusConfirmed.
  ///
  /// In ar, this message translates to:
  /// **'مؤكد'**
  String get meetingBookingStatusConfirmed;

  /// No description provided for @meetingBookingStatusRejected.
  ///
  /// In ar, this message translates to:
  /// **'مرفوض'**
  String get meetingBookingStatusRejected;

  /// No description provided for @meetingBookingStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغي'**
  String get meetingBookingStatusCancelled;

  /// No description provided for @meetingBookingStatusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'مكتمل'**
  String get meetingBookingStatusCompleted;

  /// No description provided for @meetingRoomCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز القاعة'**
  String get meetingRoomCode;

  /// No description provided for @meetingRoomOpeningTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت الفتح'**
  String get meetingRoomOpeningTime;

  /// No description provided for @meetingRoomClosingTime.
  ///
  /// In ar, this message translates to:
  /// **'وقت الإغلاق'**
  String get meetingRoomClosingTime;

  /// No description provided for @meetingRoomDescription.
  ///
  /// In ar, this message translates to:
  /// **'إدارة جاهزية القاعات وساعات التشغيل والسعة وأسعار الحجز.'**
  String get meetingRoomDescription;

  /// No description provided for @meetingRoomTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي القاعات'**
  String get meetingRoomTotal;

  /// No description provided for @meetingRoomActive.
  ///
  /// In ar, this message translates to:
  /// **'متاحة للحجز'**
  String get meetingRoomActive;

  /// No description provided for @meetingRoomMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'تحت الصيانة'**
  String get meetingRoomMaintenance;

  /// No description provided for @meetingRoomEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لم تتم تهيئة قاعات الاجتماعات'**
  String get meetingRoomEmptyTitle;

  /// No description provided for @meetingRoomEmptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'أضف قاعتي سرايا سكوير قبل استقبال الحجوزات.'**
  String get meetingRoomEmptyDescription;

  /// No description provided for @meetingRoomCapacity.
  ///
  /// In ar, this message translates to:
  /// **'السعة'**
  String get meetingRoomCapacity;

  /// No description provided for @meetingRoomRate.
  ///
  /// In ar, this message translates to:
  /// **'سعر الساعة'**
  String get meetingRoomRate;

  /// No description provided for @meetingRoomHours.
  ///
  /// In ar, this message translates to:
  /// **'ساعات التشغيل'**
  String get meetingRoomHours;

  /// No description provided for @meetingRoomMinimum.
  ///
  /// In ar, this message translates to:
  /// **'أقل مدة للحجز'**
  String get meetingRoomMinimum;

  /// No description provided for @meetingRoomPeople.
  ///
  /// In ar, this message translates to:
  /// **'{count} أشخاص'**
  String meetingRoomPeople(int count);

  /// No description provided for @meetingRoomMinutes.
  ///
  /// In ar, this message translates to:
  /// **'{count} دقيقة'**
  String meetingRoomMinutes(int count);

  /// No description provided for @meetingRoomStatusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشطة'**
  String get meetingRoomStatusActive;

  /// No description provided for @meetingRoomStatusMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get meetingRoomStatusMaintenance;

  /// No description provided for @meetingRoomStatusInactive.
  ///
  /// In ar, this message translates to:
  /// **'غير نشطة'**
  String get meetingRoomStatusInactive;

  /// No description provided for @leaseTitle.
  ///
  /// In ar, this message translates to:
  /// **'سجل العقود'**
  String get leaseTitle;

  /// No description provided for @leaseDescription.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة شروط العقود المسجلة ومددها وحالتها التشغيلية.'**
  String get leaseDescription;

  /// No description provided for @leaseTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي العقود'**
  String get leaseTotal;

  /// No description provided for @leaseActive.
  ///
  /// In ar, this message translates to:
  /// **'العقود النشطة'**
  String get leaseActive;

  /// No description provided for @leaseRenewalRequested.
  ///
  /// In ar, this message translates to:
  /// **'طلبات التجديد'**
  String get leaseRenewalRequested;

  /// No description provided for @leaseEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد عقود مسجلة'**
  String get leaseEmptyTitle;

  /// No description provided for @leaseEmptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر العقود المعتمدة هنا مع شروطها الحالية.'**
  String get leaseEmptyDescription;

  /// No description provided for @leaseTenant.
  ///
  /// In ar, this message translates to:
  /// **'المستأجر'**
  String get leaseTenant;

  /// No description provided for @leasePeriod.
  ///
  /// In ar, this message translates to:
  /// **'مدة العقد'**
  String get leasePeriod;

  /// No description provided for @leaseRent.
  ///
  /// In ar, this message translates to:
  /// **'قيمة الإيجار'**
  String get leaseRent;

  /// No description provided for @leaseFrequency.
  ///
  /// In ar, this message translates to:
  /// **'دورية الدفع'**
  String get leaseFrequency;

  /// No description provided for @leaseDueDay.
  ///
  /// In ar, this message translates to:
  /// **'يوم الاستحقاق'**
  String get leaseDueDay;

  /// No description provided for @leaseDueDayValue.
  ///
  /// In ar, this message translates to:
  /// **'اليوم {day}'**
  String leaseDueDayValue(int day);

  /// No description provided for @leaseStatusDraft.
  ///
  /// In ar, this message translates to:
  /// **'مسودة'**
  String get leaseStatusDraft;

  /// No description provided for @leaseStatusPendingApproval.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار الموافقة'**
  String get leaseStatusPendingApproval;

  /// No description provided for @leaseStatusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get leaseStatusActive;

  /// No description provided for @leaseStatusRenewalRequested.
  ///
  /// In ar, this message translates to:
  /// **'طلب تجديد'**
  String get leaseStatusRenewalRequested;

  /// No description provided for @leaseStatusRejected.
  ///
  /// In ar, this message translates to:
  /// **'مرفوض'**
  String get leaseStatusRejected;

  /// No description provided for @leaseStatusTerminated.
  ///
  /// In ar, this message translates to:
  /// **'منتهي'**
  String get leaseStatusTerminated;

  /// No description provided for @leaseStatusClosed.
  ///
  /// In ar, this message translates to:
  /// **'مغلق'**
  String get leaseStatusClosed;

  /// No description provided for @leaseFrequencyMonthly.
  ///
  /// In ar, this message translates to:
  /// **'شهري'**
  String get leaseFrequencyMonthly;

  /// No description provided for @leaseFrequencyQuarterly.
  ///
  /// In ar, this message translates to:
  /// **'ربع سنوي'**
  String get leaseFrequencyQuarterly;

  /// No description provided for @leaseFrequencyAnnual.
  ///
  /// In ar, this message translates to:
  /// **'سنوي'**
  String get leaseFrequencyAnnual;

  /// No description provided for @leaseActions.
  ///
  /// In ar, this message translates to:
  /// **'الإجراءات'**
  String get leaseActions;

  /// No description provided for @leaseApprove.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد العقد'**
  String get leaseApprove;

  /// No description provided for @leaseRequestRenewal.
  ///
  /// In ar, this message translates to:
  /// **'طلب التجديد'**
  String get leaseRequestRenewal;

  /// No description provided for @leaseApproveRenewal.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد التجديد'**
  String get leaseApproveRenewal;

  /// No description provided for @leaseRejectRenewal.
  ///
  /// In ar, this message translates to:
  /// **'رفض التجديد'**
  String get leaseRejectRenewal;

  /// No description provided for @leaseTerminate.
  ///
  /// In ar, this message translates to:
  /// **'إنهاء العقد'**
  String get leaseTerminate;

  /// No description provided for @leaseClose.
  ///
  /// In ar, this message translates to:
  /// **'إغلاق العقد'**
  String get leaseClose;

  /// No description provided for @leaseTerminationReason.
  ///
  /// In ar, this message translates to:
  /// **'سبب الإنهاء (اختياري)'**
  String get leaseTerminationReason;

  /// No description provided for @leaseRenewalTerms.
  ///
  /// In ar, this message translates to:
  /// **'شروط التجديد'**
  String get leaseRenewalTerms;

  /// No description provided for @leaseActionCompleted.
  ///
  /// In ar, this message translates to:
  /// **'تم تحديث العقد بنجاح'**
  String get leaseActionCompleted;

  /// No description provided for @leaseActionFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحديث العقد'**
  String get leaseActionFailed;

  /// No description provided for @leaseDeposit.
  ///
  /// In ar, this message translates to:
  /// **'قيمة التأمين'**
  String get leaseDeposit;

  /// No description provided for @leaseGraceDays.
  ///
  /// In ar, this message translates to:
  /// **'أيام السماح'**
  String get leaseGraceDays;

  /// No description provided for @maintenanceTitle.
  ///
  /// In ar, this message translates to:
  /// **'تذاكر الصيانة'**
  String get maintenanceTitle;

  /// No description provided for @maintenanceAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة بلاغ'**
  String get maintenanceAdd;

  /// No description provided for @maintenanceEdit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل البلاغ'**
  String get maintenanceEdit;

  /// No description provided for @maintenanceDescription.
  ///
  /// In ar, this message translates to:
  /// **'متابعة البلاغات والأولويات والإسناد والتقدم والمصروفات المسجلة.'**
  String get maintenanceDescription;

  /// No description provided for @maintenanceTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي التذاكر'**
  String get maintenanceTotal;

  /// No description provided for @maintenanceOpen.
  ///
  /// In ar, this message translates to:
  /// **'الأعمال المفتوحة'**
  String get maintenanceOpen;

  /// No description provided for @maintenanceUrgent.
  ///
  /// In ar, this message translates to:
  /// **'العاجلة'**
  String get maintenanceUrgent;

  /// No description provided for @maintenanceEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد تذاكر صيانة'**
  String get maintenanceEmptyTitle;

  /// No description provided for @maintenanceEmptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر بلاغات الصيانة هنا لمتابعتها وتشغيلها.'**
  String get maintenanceEmptyDescription;

  /// No description provided for @maintenanceTicketNumber.
  ///
  /// In ar, this message translates to:
  /// **'التذكرة'**
  String get maintenanceTicketNumber;

  /// No description provided for @maintenanceIssue.
  ///
  /// In ar, this message translates to:
  /// **'البلاغ'**
  String get maintenanceIssue;

  /// No description provided for @maintenancePriority.
  ///
  /// In ar, this message translates to:
  /// **'الأولوية'**
  String get maintenancePriority;

  /// No description provided for @maintenanceAssignee.
  ///
  /// In ar, this message translates to:
  /// **'المسؤول'**
  String get maintenanceAssignee;

  /// No description provided for @maintenanceExpense.
  ///
  /// In ar, this message translates to:
  /// **'المصروفات'**
  String get maintenanceExpense;

  /// No description provided for @maintenanceReportedBy.
  ///
  /// In ar, this message translates to:
  /// **'مقدم البلاغ'**
  String get maintenanceReportedBy;

  /// No description provided for @maintenancePriorityLow.
  ///
  /// In ar, this message translates to:
  /// **'منخفضة'**
  String get maintenancePriorityLow;

  /// No description provided for @maintenancePriorityMedium.
  ///
  /// In ar, this message translates to:
  /// **'متوسطة'**
  String get maintenancePriorityMedium;

  /// No description provided for @maintenancePriorityHigh.
  ///
  /// In ar, this message translates to:
  /// **'مرتفعة'**
  String get maintenancePriorityHigh;

  /// No description provided for @maintenancePriorityUrgent.
  ///
  /// In ar, this message translates to:
  /// **'عاجلة'**
  String get maintenancePriorityUrgent;

  /// No description provided for @maintenanceStatusOpen.
  ///
  /// In ar, this message translates to:
  /// **'مفتوحة'**
  String get maintenanceStatusOpen;

  /// No description provided for @maintenanceStatusAssigned.
  ///
  /// In ar, this message translates to:
  /// **'تم الإسناد'**
  String get maintenanceStatusAssigned;

  /// No description provided for @maintenanceStatusInProgress.
  ///
  /// In ar, this message translates to:
  /// **'قيد التنفيذ'**
  String get maintenanceStatusInProgress;

  /// No description provided for @maintenanceStatusAwaitingParts.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار قطع الغيار'**
  String get maintenanceStatusAwaitingParts;

  /// No description provided for @maintenanceStatusResolved.
  ///
  /// In ar, this message translates to:
  /// **'تم الحل'**
  String get maintenanceStatusResolved;

  /// No description provided for @maintenanceStatusClosed.
  ///
  /// In ar, this message translates to:
  /// **'مغلقة'**
  String get maintenanceStatusClosed;

  /// No description provided for @maintenanceStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغاة'**
  String get maintenanceStatusCancelled;

  /// No description provided for @documentTitle.
  ///
  /// In ar, this message translates to:
  /// **'مكتبة المستندات'**
  String get documentTitle;

  /// No description provided for @documentDescription.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة مستندات العقار والعملاء والعقود والعمليات المسجلة في سرايا سكوير.'**
  String get documentDescription;

  /// No description provided for @documentTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي المستندات'**
  String get documentTotal;

  /// No description provided for @documentActive.
  ///
  /// In ar, this message translates to:
  /// **'الملفات النشطة'**
  String get documentActive;

  /// No description provided for @documentWithExpiry.
  ///
  /// In ar, this message translates to:
  /// **'مرتبطة بتاريخ انتهاء'**
  String get documentWithExpiry;

  /// No description provided for @documentEmptyTitle.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مستندات مسجلة'**
  String get documentEmptyTitle;

  /// No description provided for @documentEmptyDescription.
  ///
  /// In ar, this message translates to:
  /// **'ستظهر هنا العقود والهويات والإيصالات والملفات التشغيلية المرفوعة.'**
  String get documentEmptyDescription;

  /// No description provided for @documentName.
  ///
  /// In ar, this message translates to:
  /// **'المستند'**
  String get documentName;

  /// No description provided for @documentCategory.
  ///
  /// In ar, this message translates to:
  /// **'التصنيف'**
  String get documentCategory;

  /// No description provided for @documentFileSize.
  ///
  /// In ar, this message translates to:
  /// **'حجم الملف'**
  String get documentFileSize;

  /// No description provided for @documentUploadedBy.
  ///
  /// In ar, this message translates to:
  /// **'رفع بواسطة'**
  String get documentUploadedBy;

  /// No description provided for @documentStatusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get documentStatusActive;

  /// No description provided for @documentStatusArchived.
  ///
  /// In ar, this message translates to:
  /// **'مؤرشف'**
  String get documentStatusArchived;

  /// No description provided for @documentEdit.
  ///
  /// In ar, this message translates to:
  /// **'تعديل المستند'**
  String get documentEdit;

  /// No description provided for @documentExpiresOn.
  ///
  /// In ar, this message translates to:
  /// **'تاريخ الانتهاء (YYYY-MM-DD)'**
  String get documentExpiresOn;

  /// No description provided for @documentUpdated.
  ///
  /// In ar, this message translates to:
  /// **'تم تحديث المستند بنجاح'**
  String get documentUpdated;

  /// No description provided for @documentUpdateFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحديث المستند'**
  String get documentUpdateFailed;

  /// No description provided for @documentAdd.
  ///
  /// In ar, this message translates to:
  /// **'إضافة مستند'**
  String get documentAdd;

  /// No description provided for @documentChooseFile.
  ///
  /// In ar, this message translates to:
  /// **'اختيار ملف'**
  String get documentChooseFile;

  /// No description provided for @documentNoFileSelected.
  ///
  /// In ar, this message translates to:
  /// **'لم يتم اختيار ملف'**
  String get documentNoFileSelected;

  /// No description provided for @documentAllowedFiles.
  ///
  /// In ar, this message translates to:
  /// **'PDF أو JPG أو PNG بحد أقصى 4 ميجابايت'**
  String get documentAllowedFiles;

  /// No description provided for @documentUpload.
  ///
  /// In ar, this message translates to:
  /// **'رفع المستند'**
  String get documentUpload;

  /// No description provided for @documentUploaded.
  ///
  /// In ar, this message translates to:
  /// **'تم رفع المستند بنجاح'**
  String get documentUploaded;

  /// No description provided for @documentUploadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر رفع المستند'**
  String get documentUploadFailed;

  /// No description provided for @documentFileRequired.
  ///
  /// In ar, this message translates to:
  /// **'اختر ملفًا'**
  String get documentFileRequired;

  /// No description provided for @documentFileTooLarge.
  ///
  /// In ar, this message translates to:
  /// **'حجم الملف يتجاوز 4 ميجابايت'**
  String get documentFileTooLarge;

  /// No description provided for @documentCategoryLease.
  ///
  /// In ar, this message translates to:
  /// **'عقد'**
  String get documentCategoryLease;

  /// No description provided for @documentCategoryIdentity.
  ///
  /// In ar, this message translates to:
  /// **'هوية'**
  String get documentCategoryIdentity;

  /// No description provided for @documentCategoryCommercialRegistration.
  ///
  /// In ar, this message translates to:
  /// **'سجل تجاري'**
  String get documentCategoryCommercialRegistration;

  /// No description provided for @documentCategoryHandover.
  ///
  /// In ar, this message translates to:
  /// **'استلام وتسليم'**
  String get documentCategoryHandover;

  /// No description provided for @documentCategoryInvoice.
  ///
  /// In ar, this message translates to:
  /// **'فاتورة'**
  String get documentCategoryInvoice;

  /// No description provided for @documentCategoryReceipt.
  ///
  /// In ar, this message translates to:
  /// **'إيصال'**
  String get documentCategoryReceipt;

  /// No description provided for @documentCategoryMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'صيانة'**
  String get documentCategoryMaintenance;

  /// No description provided for @documentCategoryUtility.
  ///
  /// In ar, this message translates to:
  /// **'خدمات'**
  String get documentCategoryUtility;

  /// No description provided for @documentCategoryOther.
  ///
  /// In ar, this message translates to:
  /// **'أخرى'**
  String get documentCategoryOther;

  /// No description provided for @reportsTitle.
  ///
  /// In ar, this message translates to:
  /// **'التقارير التشغيلية'**
  String get reportsTitle;

  /// No description provided for @reportsDescription.
  ///
  /// In ar, this message translates to:
  /// **'ملخص مالي وتشغيلي مباشر مبني على بيانات سرايا سكوير المسجلة.'**
  String get reportsDescription;

  /// No description provided for @reportsPeriod.
  ///
  /// In ar, this message translates to:
  /// **'فترة التقرير'**
  String get reportsPeriod;

  /// No description provided for @reportsToday.
  ///
  /// In ar, this message translates to:
  /// **'اليوم'**
  String get reportsToday;

  /// No description provided for @reportsMonth.
  ///
  /// In ar, this message translates to:
  /// **'هذا الشهر'**
  String get reportsMonth;

  /// No description provided for @reportsQuarter.
  ///
  /// In ar, this message translates to:
  /// **'الربع الحالي'**
  String get reportsQuarter;

  /// No description provided for @reportsYear.
  ///
  /// In ar, this message translates to:
  /// **'هذه السنة'**
  String get reportsYear;

  /// No description provided for @reportsCustom.
  ///
  /// In ar, this message translates to:
  /// **'فترة مخصصة'**
  String get reportsCustom;

  /// No description provided for @reportsComprehensive.
  ///
  /// In ar, this message translates to:
  /// **'التقرير الشامل'**
  String get reportsComprehensive;

  /// No description provided for @reportsFinance.
  ///
  /// In ar, this message translates to:
  /// **'المالي والتحصيل'**
  String get reportsFinance;

  /// No description provided for @reportsInvoices.
  ///
  /// In ar, this message translates to:
  /// **'الفواتير'**
  String get reportsInvoices;

  /// No description provided for @reportsLeases.
  ///
  /// In ar, this message translates to:
  /// **'العقود'**
  String get reportsLeases;

  /// No description provided for @reportsOccupancy.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات والإشغال'**
  String get reportsOccupancy;

  /// No description provided for @reportsClients.
  ///
  /// In ar, this message translates to:
  /// **'المستأجرون والملاك'**
  String get reportsClients;

  /// No description provided for @reportsVirtualAddresses.
  ///
  /// In ar, this message translates to:
  /// **'العناوين الافتراضية'**
  String get reportsVirtualAddresses;

  /// No description provided for @reportsMaintenance.
  ///
  /// In ar, this message translates to:
  /// **'الصيانة والمصاريف'**
  String get reportsMaintenance;

  /// No description provided for @reportsMeetingRooms.
  ///
  /// In ar, this message translates to:
  /// **'حجوزات قاعات الاجتماعات'**
  String get reportsMeetingRooms;

  /// No description provided for @reportsDownloadPdf.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل PDF'**
  String get reportsDownloadPdf;

  /// No description provided for @reportsDownloadExcel.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل Excel'**
  String get reportsDownloadExcel;

  /// No description provided for @reportsReady.
  ///
  /// In ar, this message translates to:
  /// **'تم تجهيز التقرير وتنزيله'**
  String get reportsReady;

  /// No description provided for @reportsFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تجهيز التقرير، حاول مجددًا'**
  String get reportsFailed;

  /// No description provided for @reportsComprehensiveDescription.
  ///
  /// In ar, this message translates to:
  /// **'ملخص تنفيذي وجميع الأقسام المالية والتشغيلية في ملف واحد.'**
  String get reportsComprehensiveDescription;

  /// No description provided for @reportsFocusedDescription.
  ///
  /// In ar, this message translates to:
  /// **'تقرير تفصيلي منسق للفترة المحددة وجاهز للطباعة والمراجعة.'**
  String get reportsFocusedDescription;

  /// No description provided for @publicHomeHeroEyebrow.
  ///
  /// In ar, this message translates to:
  /// **'مركز سرايا سكوير للأعمال'**
  String get publicHomeHeroEyebrow;

  /// No description provided for @publicHomeHeroTitle.
  ///
  /// In ar, this message translates to:
  /// **'أعمالك تبدأ من عنوان مميز'**
  String get publicHomeHeroTitle;

  /// No description provided for @publicHomeHeroDescription.
  ///
  /// In ar, this message translates to:
  /// **'مكاتب ومحلات وعناوين تجارية مرنة في وجهة واحدة مصممة لنمو أعمالك.'**
  String get publicHomeHeroDescription;

  /// No description provided for @publicHomeBrowse.
  ///
  /// In ar, this message translates to:
  /// **'استعرض المتاح'**
  String get publicHomeBrowse;

  /// No description provided for @publicHomeLogin.
  ///
  /// In ar, this message translates to:
  /// **'دخول الإدارة والمستأجرين'**
  String get publicHomeLogin;

  /// No description provided for @publicHomeUnitsTitle.
  ///
  /// In ar, this message translates to:
  /// **'الوحدات المتاحة'**
  String get publicHomeUnitsTitle;

  /// No description provided for @publicHomeUnitsDescription.
  ///
  /// In ar, this message translates to:
  /// **'اختر مكتبًا أو محلًا جاهزًا لخطوتك التجارية القادمة.'**
  String get publicHomeUnitsDescription;

  /// No description provided for @publicHomeVirtualTitle.
  ///
  /// In ar, this message translates to:
  /// **'العناوين الافتراضية'**
  String get publicHomeVirtualTitle;

  /// No description provided for @publicHomeVirtualDescription.
  ///
  /// In ar, this message translates to:
  /// **'عنوان تجاري موثوق في سرايا سكوير دون الحاجة إلى مكتب دائم.'**
  String get publicHomeVirtualDescription;

  /// No description provided for @publicHomeAvailable.
  ///
  /// In ar, this message translates to:
  /// **'متاح الآن'**
  String get publicHomeAvailable;

  /// No description provided for @publicHomeTotal.
  ///
  /// In ar, this message translates to:
  /// **'إجمالي العناوين'**
  String get publicHomeTotal;

  /// No description provided for @publicHomeMonthly.
  ///
  /// In ar, this message translates to:
  /// **'شهريًا'**
  String get publicHomeMonthly;

  /// No description provided for @publicHomeArea.
  ///
  /// In ar, this message translates to:
  /// **'المساحة'**
  String get publicHomeArea;

  /// No description provided for @publicHomeFloor.
  ///
  /// In ar, this message translates to:
  /// **'الطابق'**
  String get publicHomeFloor;

  /// No description provided for @publicHomeEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد وحدات معلنة حاليًا.'**
  String get publicHomeEmpty;

  /// No description provided for @publicHomeLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل التوافر المباشر.'**
  String get publicHomeLoadFailed;

  /// No description provided for @publicHomeRetry.
  ///
  /// In ar, this message translates to:
  /// **'إعادة المحاولة'**
  String get publicHomeRetry;

  /// No description provided for @publicHomeFooter.
  ///
  /// In ar, this message translates to:
  /// **'سرايا سكوير — البحرين'**
  String get publicHomeFooter;

  /// No description provided for @navViewings.
  ///
  /// In ar, this message translates to:
  /// **'مواعيد الزيارات'**
  String get navViewings;

  /// No description provided for @unitDetailsTitle.
  ///
  /// In ar, this message translates to:
  /// **'تفاصيل الوحدة'**
  String get unitDetailsTitle;

  /// No description provided for @unitDetailsNotFound.
  ///
  /// In ar, this message translates to:
  /// **'هذه الوحدة لم تعد متاحة للعرض العام.'**
  String get unitDetailsNotFound;

  /// No description provided for @unitNumber.
  ///
  /// In ar, this message translates to:
  /// **'الوحدة'**
  String get unitNumber;

  /// No description provided for @unitMonthlyRent.
  ///
  /// In ar, this message translates to:
  /// **'الإيجار الشهري'**
  String get unitMonthlyRent;

  /// No description provided for @unitRentNow.
  ///
  /// In ar, this message translates to:
  /// **'استأجر الآن'**
  String get unitRentNow;

  /// No description provided for @viewingBookVisit.
  ///
  /// In ar, this message translates to:
  /// **'احجز زيارة'**
  String get viewingBookVisit;

  /// No description provided for @viewingSelectSlot.
  ///
  /// In ar, this message translates to:
  /// **'اختر موعدًا متاحًا.'**
  String get viewingSelectSlot;

  /// No description provided for @viewingBookingFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر حجز الزيارة، حاول مجددًا.'**
  String get viewingBookingFailed;

  /// No description provided for @viewingBookingConfirmed.
  ///
  /// In ar, this message translates to:
  /// **'تم تأكيد زيارتك'**
  String get viewingBookingConfirmed;

  /// No description provided for @viewingSlotsLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل المواعيد المتاحة.'**
  String get viewingSlotsLoadFailed;

  /// No description provided for @viewingAvailableTimes.
  ///
  /// In ar, this message translates to:
  /// **'المواعيد المتاحة'**
  String get viewingAvailableTimes;

  /// No description provided for @viewingNoSlots.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مواعيد زيارة متاحة حاليًا.'**
  String get viewingNoSlots;

  /// No description provided for @viewingPlacesLeft.
  ///
  /// In ar, this message translates to:
  /// **'أماكن متبقية'**
  String get viewingPlacesLeft;

  /// No description provided for @viewingVisitorName.
  ///
  /// In ar, this message translates to:
  /// **'الاسم الكامل'**
  String get viewingVisitorName;

  /// No description provided for @viewingVisitorPhone.
  ///
  /// In ar, this message translates to:
  /// **'رقم الهاتف'**
  String get viewingVisitorPhone;

  /// No description provided for @viewingPhoneInvalid.
  ///
  /// In ar, this message translates to:
  /// **'أدخل رقم الهاتف بالصيغة الدولية، مثال: +97339000000.'**
  String get viewingPhoneInvalid;

  /// No description provided for @viewingVisitorEmail.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني'**
  String get viewingVisitorEmail;

  /// No description provided for @viewingEmailInvalid.
  ///
  /// In ar, this message translates to:
  /// **'أدخل بريدًا إلكترونيًا صحيحًا.'**
  String get viewingEmailInvalid;

  /// No description provided for @viewingConfirmVisit.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد الزيارة'**
  String get viewingConfirmVisit;

  /// No description provided for @viewingManagementTitle.
  ///
  /// In ar, this message translates to:
  /// **'مواعيد الزيارات'**
  String get viewingManagementTitle;

  /// No description provided for @viewingManagementDescription.
  ///
  /// In ar, this message translates to:
  /// **'نشر أوقات الزيارة ومتابعة كل موعد مؤكد.'**
  String get viewingManagementDescription;

  /// No description provided for @viewingUpcoming.
  ///
  /// In ar, this message translates to:
  /// **'المواعيد القادمة'**
  String get viewingUpcoming;

  /// No description provided for @viewingAddSlot.
  ///
  /// In ar, this message translates to:
  /// **'إضافة وقت زيارة'**
  String get viewingAddSlot;

  /// No description provided for @viewingLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل مواعيد الزيارات.'**
  String get viewingLoadFailed;

  /// No description provided for @viewingNoAppointments.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد مواعيد زيارة مجدولة.'**
  String get viewingNoAppointments;

  /// No description provided for @viewingNoAccess.
  ///
  /// In ar, this message translates to:
  /// **'لا تملك صلاحية الوصول إلى هذا القسم.'**
  String get viewingNoAccess;

  /// No description provided for @viewingUpdateFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحديث الموعد.'**
  String get viewingUpdateFailed;

  /// No description provided for @viewingSlotPublished.
  ///
  /// In ar, this message translates to:
  /// **'تم نشر وقت الزيارة.'**
  String get viewingSlotPublished;

  /// No description provided for @viewingSlotFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر نشر وقت الزيارة.'**
  String get viewingSlotFailed;

  /// No description provided for @viewingPublishedSlots.
  ///
  /// In ar, this message translates to:
  /// **'أوقات الزيارة المنشورة'**
  String get viewingPublishedSlots;

  /// No description provided for @viewingSlotStatusActive.
  ///
  /// In ar, this message translates to:
  /// **'نشط'**
  String get viewingSlotStatusActive;

  /// No description provided for @viewingSlotStatusDisabled.
  ///
  /// In ar, this message translates to:
  /// **'معطل'**
  String get viewingSlotStatusDisabled;

  /// No description provided for @viewingBooked.
  ///
  /// In ar, this message translates to:
  /// **'محجوز'**
  String get viewingBooked;

  /// No description provided for @viewingComplete.
  ///
  /// In ar, this message translates to:
  /// **'تحديد كمكتمل'**
  String get viewingComplete;

  /// No description provided for @viewingNoShow.
  ///
  /// In ar, this message translates to:
  /// **'لم يحضر'**
  String get viewingNoShow;

  /// No description provided for @viewingStatusConfirmed.
  ///
  /// In ar, this message translates to:
  /// **'مؤكد'**
  String get viewingStatusConfirmed;

  /// No description provided for @viewingStatusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'مكتمل'**
  String get viewingStatusCompleted;

  /// No description provided for @viewingStatusNoShow.
  ///
  /// In ar, this message translates to:
  /// **'لم يحضر'**
  String get viewingStatusNoShow;

  /// No description provided for @viewingStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'ملغي'**
  String get viewingStatusCancelled;

  /// No description provided for @viewingStartAt.
  ///
  /// In ar, this message translates to:
  /// **'البداية (YYYY-MM-DD HH:mm)'**
  String get viewingStartAt;

  /// No description provided for @viewingEndAt.
  ///
  /// In ar, this message translates to:
  /// **'النهاية (YYYY-MM-DD HH:mm)'**
  String get viewingEndAt;

  /// No description provided for @viewingCapacity.
  ///
  /// In ar, this message translates to:
  /// **'السعة'**
  String get viewingCapacity;

  /// No description provided for @viewingUnitOptional.
  ///
  /// In ar, this message translates to:
  /// **'معرف الوحدة (اختياري)'**
  String get viewingUnitOptional;

  /// No description provided for @viewingPropertyWideHint.
  ///
  /// In ar, this message translates to:
  /// **'اتركه فارغًا ليكون الموعد متاحًا للعقار.'**
  String get viewingPropertyWideHint;

  /// No description provided for @fieldRequired.
  ///
  /// In ar, this message translates to:
  /// **'هذا الحقل مطلوب.'**
  String get fieldRequired;

  /// No description provided for @rentalEntryTitle.
  ///
  /// In ar, this message translates to:
  /// **'طلب الاستئجار'**
  String get rentalEntryTitle;

  /// No description provided for @rentalEntryBackToUnit.
  ///
  /// In ar, this message translates to:
  /// **'العودة إلى تفاصيل الوحدة'**
  String get rentalEntryBackToUnit;

  /// No description provided for @rentalTermsTitle.
  ///
  /// In ar, this message translates to:
  /// **'شروط طلب الاستئجار'**
  String get rentalTermsTitle;

  /// No description provided for @rentalTermsBody.
  ///
  /// In ar, this message translates to:
  /// **'راجع سعر الوحدة المباشر وسياسة الموافقة قبل المتابعة. إرسال الطلب لا يضمن الوحدة حتى يؤكدها الخادم.'**
  String get rentalTermsBody;

  /// No description provided for @rentalTermsAccept.
  ///
  /// In ar, this message translates to:
  /// **'راجعت وأوافق على شروط طلب الاستئجار'**
  String get rentalTermsAccept;

  /// No description provided for @rentalStart.
  ///
  /// In ar, this message translates to:
  /// **'ابدأ طلب الاستئجار'**
  String get rentalStart;

  /// No description provided for @rentalApplicantTitle.
  ///
  /// In ar, this message translates to:
  /// **'بيانات مقدم الطلب والتحقق'**
  String get rentalApplicantTitle;

  /// No description provided for @rentalApplicantIndividual.
  ///
  /// In ar, this message translates to:
  /// **'فرد'**
  String get rentalApplicantIndividual;

  /// No description provided for @rentalApplicantCompany.
  ///
  /// In ar, this message translates to:
  /// **'شركة'**
  String get rentalApplicantCompany;

  /// No description provided for @rentalNameAr.
  ///
  /// In ar, this message translates to:
  /// **'الاسم القانوني بالعربية'**
  String get rentalNameAr;

  /// No description provided for @rentalNameEn.
  ///
  /// In ar, this message translates to:
  /// **'الاسم القانوني بالإنجليزية'**
  String get rentalNameEn;

  /// No description provided for @rentalRegistrationNumber.
  ///
  /// In ar, this message translates to:
  /// **'رقم السجل التجاري'**
  String get rentalRegistrationNumber;

  /// No description provided for @rentalOtpIdentity.
  ///
  /// In ar, this message translates to:
  /// **'البريد الإلكتروني أو رقم دولي'**
  String get rentalOtpIdentity;

  /// No description provided for @rentalOtpRequest.
  ///
  /// In ar, this message translates to:
  /// **'إرسال رمز التحقق'**
  String get rentalOtpRequest;

  /// No description provided for @rentalOtpCode.
  ///
  /// In ar, this message translates to:
  /// **'رمز التحقق من 6 أرقام'**
  String get rentalOtpCode;

  /// No description provided for @rentalOtpVerify.
  ///
  /// In ar, this message translates to:
  /// **'تحقق وتابع'**
  String get rentalOtpVerify;

  /// No description provided for @rentalDocumentTitle.
  ///
  /// In ar, this message translates to:
  /// **'مستند الهوية'**
  String get rentalDocumentTitle;

  /// No description provided for @rentalDocumentHelp.
  ///
  /// In ar, this message translates to:
  /// **'ارفع مستند هوية خاصًا واحدًا بصيغة PDF أو JPG أو PNG.'**
  String get rentalDocumentHelp;

  /// No description provided for @rentalDocumentPick.
  ///
  /// In ar, this message translates to:
  /// **'اختر المستند الخاص'**
  String get rentalDocumentPick;

  /// No description provided for @rentalDocumentSelected.
  ///
  /// In ar, this message translates to:
  /// **'تم الاختيار: {name}'**
  String rentalDocumentSelected(String name);

  /// No description provided for @rentalDatesTitle.
  ///
  /// In ar, this message translates to:
  /// **'تواريخ الإيجار المطلوبة'**
  String get rentalDatesTitle;

  /// No description provided for @rentalDurationMonths.
  ///
  /// In ar, this message translates to:
  /// **'المدة بالأشهر'**
  String get rentalDurationMonths;

  /// No description provided for @rentalReviewTitle.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة الطلب'**
  String get rentalReviewTitle;

  /// No description provided for @rentalNext.
  ///
  /// In ar, this message translates to:
  /// **'متابعة'**
  String get rentalNext;

  /// No description provided for @rentalBack.
  ///
  /// In ar, this message translates to:
  /// **'رجوع'**
  String get rentalBack;

  /// No description provided for @rentalSubmit.
  ///
  /// In ar, this message translates to:
  /// **'إرسال طلب الاستئجار'**
  String get rentalSubmit;

  /// No description provided for @rentalLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل الوحدة، وقد لا تكون متاحة الآن.'**
  String get rentalLoadFailed;

  /// No description provided for @rentalActionFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر إكمال الطلب. تحقق من الحقول وحاول مجددًا.'**
  String get rentalActionFailed;

  /// No description provided for @rentalStatusTitle.
  ///
  /// In ar, this message translates to:
  /// **'حالة طلب الاستئجار'**
  String get rentalStatusTitle;

  /// No description provided for @rentalStatusPendingOwner.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار موافقة المالك'**
  String get rentalStatusPendingOwner;

  /// No description provided for @rentalStatusApprovedPayment.
  ///
  /// In ar, this message translates to:
  /// **'تمت الموافقة — الدفع مطلوب'**
  String get rentalStatusApprovedPayment;

  /// No description provided for @rentalStatusRejected.
  ///
  /// In ar, this message translates to:
  /// **'تم رفض الطلب'**
  String get rentalStatusRejected;

  /// No description provided for @rentalStatusPaidSignature.
  ///
  /// In ar, this message translates to:
  /// **'تم تأكيد الدفع — التوقيعات مطلوبة'**
  String get rentalStatusPaidSignature;

  /// No description provided for @rentalStatusCompleted.
  ///
  /// In ar, this message translates to:
  /// **'العقد نشط'**
  String get rentalStatusCompleted;

  /// No description provided for @rentalStatusCancelled.
  ///
  /// In ar, this message translates to:
  /// **'تم إلغاء الطلب'**
  String get rentalStatusCancelled;

  /// No description provided for @rentalTimelineTitle.
  ///
  /// In ar, this message translates to:
  /// **'الخط الزمني للطلب'**
  String get rentalTimelineTitle;

  /// No description provided for @rentalPaymentTitle.
  ///
  /// In ar, this message translates to:
  /// **'اختر طريقة الدفع'**
  String get rentalPaymentTitle;

  /// No description provided for @rentalPayOnline.
  ///
  /// In ar, this message translates to:
  /// **'الدفع الآمن عبر Tap'**
  String get rentalPayOnline;

  /// No description provided for @rentalPayOffline.
  ///
  /// In ar, this message translates to:
  /// **'رفع إيصال التحويل'**
  String get rentalPayOffline;

  /// No description provided for @rentalPaymentReference.
  ///
  /// In ar, this message translates to:
  /// **'مرجع التحويل البنكي'**
  String get rentalPaymentReference;

  /// No description provided for @rentalPaymentOpenFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر فتح صفحة الدفع الآمنة.'**
  String get rentalPaymentOpenFailed;

  /// No description provided for @rentalOfflineSubmitted.
  ///
  /// In ar, this message translates to:
  /// **'تم إرسال الإيصال للمراجعة.'**
  String get rentalOfflineSubmitted;

  /// No description provided for @rentalLeaseTitle.
  ///
  /// In ar, this message translates to:
  /// **'العقد والتوقيعات'**
  String get rentalLeaseTitle;

  /// No description provided for @rentalLeaseChecksum.
  ///
  /// In ar, this message translates to:
  /// **'بصمة العقد'**
  String get rentalLeaseChecksum;

  /// No description provided for @rentalLeaseDraft.
  ///
  /// In ar, this message translates to:
  /// **'فتح مسودة العقد'**
  String get rentalLeaseDraft;

  /// No description provided for @rentalLegalName.
  ///
  /// In ar, this message translates to:
  /// **'اكتب اسمك القانوني الكامل'**
  String get rentalLegalName;

  /// No description provided for @rentalAcceptChecksum.
  ///
  /// In ar, this message translates to:
  /// **'راجعت بصمة هذا العقد نفسها وأوافق عليها'**
  String get rentalAcceptChecksum;

  /// No description provided for @rentalTenantSignature.
  ///
  /// In ar, this message translates to:
  /// **'توقيع المستأجر'**
  String get rentalTenantSignature;

  /// No description provided for @rentalOwnerSignature.
  ///
  /// In ar, this message translates to:
  /// **'توقيع المالك'**
  String get rentalOwnerSignature;

  /// No description provided for @rentalSigned.
  ///
  /// In ar, this message translates to:
  /// **'تم التوقيع'**
  String get rentalSigned;

  /// No description provided for @rentalAwaitingSignature.
  ///
  /// In ar, this message translates to:
  /// **'بانتظار التوقيع'**
  String get rentalAwaitingSignature;

  /// No description provided for @rentalRefreshHint.
  ///
  /// In ar, this message translates to:
  /// **'اسحب للأسفل لتحديث الحالة المباشرة.'**
  String get rentalRefreshHint;

  /// No description provided for @rentalApprovalMode.
  ///
  /// In ar, this message translates to:
  /// **'سياسة موافقة الإيجار'**
  String get rentalApprovalMode;

  /// No description provided for @rentalApprovalInherit.
  ///
  /// In ar, this message translates to:
  /// **'وراثة إعداد العقار'**
  String get rentalApprovalInherit;

  /// No description provided for @rentalApprovalInstant.
  ///
  /// In ar, this message translates to:
  /// **'موافقة فورية'**
  String get rentalApprovalInstant;

  /// No description provided for @rentalApprovalOwnerReview.
  ///
  /// In ar, this message translates to:
  /// **'مراجعة المالك'**
  String get rentalApprovalOwnerReview;

  /// No description provided for @navRentalRequests.
  ///
  /// In ar, this message translates to:
  /// **'طلبات الاستئجار'**
  String get navRentalRequests;

  /// No description provided for @rentalQueueTitle.
  ///
  /// In ar, this message translates to:
  /// **'قائمة طلبات الاستئجار'**
  String get rentalQueueTitle;

  /// No description provided for @rentalQueueEmpty.
  ///
  /// In ar, this message translates to:
  /// **'لا توجد طلبات استئجار بعد'**
  String get rentalQueueEmpty;

  /// No description provided for @rentalQueueLoadFailed.
  ///
  /// In ar, this message translates to:
  /// **'تعذر تحميل طلبات الاستئجار.'**
  String get rentalQueueLoadFailed;

  /// No description provided for @rentalApplicant.
  ///
  /// In ar, this message translates to:
  /// **'مقدم الطلب'**
  String get rentalApplicant;

  /// No description provided for @rentalRequestedDates.
  ///
  /// In ar, this message translates to:
  /// **'التواريخ المطلوبة'**
  String get rentalRequestedDates;

  /// No description provided for @rentalPriceSnapshot.
  ///
  /// In ar, this message translates to:
  /// **'ملخص السعر المحفوظ'**
  String get rentalPriceSnapshot;

  /// No description provided for @rentalPaymentState.
  ///
  /// In ar, this message translates to:
  /// **'حالة الدفع'**
  String get rentalPaymentState;

  /// No description provided for @rentalDocumentAvailable.
  ///
  /// In ar, this message translates to:
  /// **'مستند الطلب متاح'**
  String get rentalDocumentAvailable;

  /// No description provided for @rentalDownloadDocument.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل المستند'**
  String get rentalDownloadDocument;

  /// No description provided for @rentalDownloadIdentityDocument.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل مستند الهوية'**
  String get rentalDownloadIdentityDocument;

  /// No description provided for @rentalDownloadPaymentProof.
  ///
  /// In ar, this message translates to:
  /// **'تنزيل إثبات الدفع'**
  String get rentalDownloadPaymentProof;

  /// No description provided for @rentalLoadMore.
  ///
  /// In ar, this message translates to:
  /// **'تحميل المزيد'**
  String get rentalLoadMore;

  /// No description provided for @rentalApprove.
  ///
  /// In ar, this message translates to:
  /// **'موافقة'**
  String get rentalApprove;

  /// No description provided for @rentalReject.
  ///
  /// In ar, this message translates to:
  /// **'رفض'**
  String get rentalReject;

  /// No description provided for @rentalConfirmApprovalTitle.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد الموافقة'**
  String get rentalConfirmApprovalTitle;

  /// No description provided for @rentalConfirmApprovalBody.
  ///
  /// In ar, this message translates to:
  /// **'هل تريد اعتماد طلب الإيجار بالسعر والتواريخ المحفوظة؟'**
  String get rentalConfirmApprovalBody;

  /// No description provided for @rentalRejectionReason.
  ///
  /// In ar, this message translates to:
  /// **'سبب الرفض'**
  String get rentalRejectionReason;

  /// No description provided for @rentalRejectionReasonRequired.
  ///
  /// In ar, this message translates to:
  /// **'سبب الرفض مطلوب'**
  String get rentalRejectionReasonRequired;

  /// No description provided for @rentalVerifyPayment.
  ///
  /// In ar, this message translates to:
  /// **'اعتماد الدفع'**
  String get rentalVerifyPayment;

  /// No description provided for @rentalRejectPayment.
  ///
  /// In ar, this message translates to:
  /// **'رفض الدفع'**
  String get rentalRejectPayment;

  /// No description provided for @rentalConfirmPaymentTitle.
  ///
  /// In ar, this message translates to:
  /// **'تأكيد اعتماد الدفع'**
  String get rentalConfirmPaymentTitle;

  /// No description provided for @rentalConfirmPaymentBody.
  ///
  /// In ar, this message translates to:
  /// **'هل تمت مراجعة إيصال الدفع غير الإلكتروني واعتماده؟'**
  String get rentalConfirmPaymentBody;

  /// No description provided for @rentalActionSucceeded.
  ///
  /// In ar, this message translates to:
  /// **'تم تحديث الطلب بنجاح.'**
  String get rentalActionSucceeded;

  /// No description provided for @rentalDocumentDownloaded.
  ///
  /// In ar, this message translates to:
  /// **'تم تنزيل المستند بأمان.'**
  String get rentalDocumentDownloaded;

  /// No description provided for @rentalTimeline.
  ///
  /// In ar, this message translates to:
  /// **'السجل الزمني'**
  String get rentalTimeline;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
