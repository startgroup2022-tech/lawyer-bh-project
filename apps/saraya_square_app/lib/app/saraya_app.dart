import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/config/app_config.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/rental_document_saver.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/reports/data/report_downloader.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';

import 'router.dart';

final class SarayaApp extends StatefulWidget {
  const SarayaApp({
    required this.config,
    this.locale = const Locale('ar'),
    this.home,
    this.authController,
    this.dashboardRepository,
    this.managementRepository,
    this.clientOnboardingRepository,
    this.invoiceRepository,
    this.accountRepository,
    this.virtualAddressRepository,
    this.meetingRoomRepository,
    this.publicHomeRepository,
    this.viewingRepository,
    this.publicRentalRepository,
    this.rentalDocumentSaver,
    this.leaseRepository,
    this.maintenanceRepository,
    this.documentRepository,
    this.reportRepository,
    this.reportDownloader,
    this.rentalRequestRepository,
    this.rentalRequestDocumentSaver,
    super.key,
  }) : assert(
         authController == null ||
             (dashboardRepository != null &&
                 managementRepository != null &&
                 invoiceRepository != null &&
                 accountRepository != null),
       );

  final AppConfig config;
  final Locale locale;
  final Widget? home;
  final AuthController? authController;
  final DashboardRepository? dashboardRepository;
  final ManagementRepository? managementRepository;
  final ClientOnboardingRepository? clientOnboardingRepository;
  final InvoiceRepository? invoiceRepository;
  final AccountRepository? accountRepository;
  final VirtualAddressRepository? virtualAddressRepository;
  final MeetingRoomRepository? meetingRoomRepository;
  final PublicHomeRepository? publicHomeRepository;
  final ViewingRepository? viewingRepository;
  final PublicRentalRepository? publicRentalRepository;
  final RentalDocumentSaver? rentalDocumentSaver;
  final LeaseRepository? leaseRepository;
  final MaintenanceRepository? maintenanceRepository;
  final DocumentRepository? documentRepository;
  final ReportRepository? reportRepository;
  final ReportDownloader? reportDownloader;
  final RentalRequestRepository? rentalRequestRepository;
  final RentalRequestDocumentSaver? rentalRequestDocumentSaver;

  @override
  State<SarayaApp> createState() => _SarayaAppState();
}

final class _SarayaAppState extends State<SarayaApp> {
  late Locale _locale = widget.locale;
  late final _router = widget.authController == null
      ? null
      : createSarayaRouter(
          authController: widget.authController!,
          dashboardRepository: widget.dashboardRepository!,
          managementRepository: widget.managementRepository!,
          publicHomeRepository:
              widget.publicHomeRepository ?? const EmptyPublicHomeRepository(),
          viewingRepository:
              widget.viewingRepository ?? const EmptyViewingRepository(),
          publicRentalRepository:
              widget.publicRentalRepository ??
              const EmptyPublicRentalRepository(),
          rentalDocumentSaver:
              widget.rentalDocumentSaver ?? const EmptyRentalDocumentSaver(),
          clientOnboardingRepository:
              widget.clientOnboardingRepository ??
              const EmptyClientOnboardingRepository(),
          invoiceRepository: widget.invoiceRepository!,
          accountRepository: widget.accountRepository!,
          virtualAddressRepository:
              widget.virtualAddressRepository ??
              const EmptyVirtualAddressRepository(),
          meetingRoomRepository:
              widget.meetingRoomRepository ??
              const EmptyMeetingRoomRepository(),
          leaseRepository:
              widget.leaseRepository ?? const EmptyLeaseRepository(),
          maintenanceRepository:
              widget.maintenanceRepository ??
              const EmptyMaintenanceRepository(),
          documentRepository:
              widget.documentRepository ?? const EmptyDocumentRepository(),
          reportRepository:
              widget.reportRepository ?? const EmptyReportRepository(),
          reportDownloader:
              widget.reportDownloader ?? const EmptyReportDownloader(),
          rentalRequestRepository:
              widget.rentalRequestRepository ??
              const EmptyRentalRequestRepository(),
          rentalRequestDocumentSaver:
              widget.rentalRequestDocumentSaver ??
              const EmptyRentalRequestDocumentSaver(),
          onLocaleChanged: (locale) => setState(() => _locale = locale),
        );

  @override
  void didUpdateWidget(SarayaApp oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.locale != widget.locale) {
      _locale = widget.locale;
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = _router;
    if (router != null && widget.home == null) {
      return MaterialApp.router(
        debugShowCheckedModeBanner: false,
        locale: _locale,
        theme: SarayaTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        onGenerateTitle: (context) => AppLocalizations.of(context)!.appName,
        routerConfig: router,
      );
    }
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      locale: _locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      onGenerateTitle: (context) => AppLocalizations.of(context)!.appName,
      home: widget.home ?? const _LocalizedHome(),
    );
  }

  @override
  void dispose() {
    _router?.dispose();
    super.dispose();
  }
}

final class _LocalizedHome extends StatelessWidget {
  const _LocalizedHome();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          AppLocalizations.of(context)!.appName,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
      ),
    );
  }
}
