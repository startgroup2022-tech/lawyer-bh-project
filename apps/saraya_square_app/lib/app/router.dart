import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/presentation/account_screen.dart';
import 'package:saraya_square_app/features/auth/domain/auth_state.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';
import 'package:saraya_square_app/features/auth/presentation/login_screen.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/presentation/dashboard_controller.dart';
import 'package:saraya_square_app/features/dashboard/presentation/dashboard_screen.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/documents/presentation/documents_screen.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/presentation/invoices_screen.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/leases/presentation/leases_screen.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/management_screen.dart';
import 'package:saraya_square_app/features/management/presentation/resource_definition.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';
import 'package:saraya_square_app/features/maintenance/presentation/maintenance_screen.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/presentation/meeting_rooms_screen.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_home/domain/public_unit_details.dart';
import 'package:saraya_square_app/features/public_home/presentation/public_home_screen.dart';
import 'package:saraya_square_app/features/documents/data/document_picker.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/rental_document_saver.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';
import 'package:saraya_square_app/features/public_rental/presentation/rental_application_wizard.dart';
import 'package:saraya_square_app/features/public_rental/presentation/rental_status_screen.dart';
import 'package:saraya_square_app/features/reports/presentation/reports_screen.dart';
import 'package:saraya_square_app/features/reports/data/report_downloader.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/rental_requests/presentation/rental_requests_screen.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/virtual_addresses/presentation/virtual_addresses_screen.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/presentation/public_unit_details_screen.dart';
import 'package:saraya_square_app/features/viewings/presentation/viewing_management_screen.dart';

GoRouter createSarayaRouter({
  required AuthController authController,
  required DashboardRepository dashboardRepository,
  required ManagementRepository managementRepository,
  PublicHomeRepository publicHomeRepository = const EmptyPublicHomeRepository(),
  ViewingRepository viewingRepository = const EmptyViewingRepository(),
  PublicRentalRepository publicRentalRepository =
      const EmptyPublicRentalRepository(),
  RentalDocumentSaver rentalDocumentSaver = const EmptyRentalDocumentSaver(),
  ClientOnboardingRepository clientOnboardingRepository =
      const EmptyClientOnboardingRepository(),
  required InvoiceRepository invoiceRepository,
  required AccountRepository accountRepository,
  VirtualAddressRepository virtualAddressRepository =
      const EmptyVirtualAddressRepository(),
  MeetingRoomRepository meetingRoomRepository =
      const EmptyMeetingRoomRepository(),
  LeaseRepository leaseRepository = const EmptyLeaseRepository(),
  MaintenanceRepository maintenanceRepository =
      const EmptyMaintenanceRepository(),
  DocumentRepository documentRepository = const EmptyDocumentRepository(),
  ReportRepository reportRepository = const EmptyReportRepository(),
  ReportDownloader reportDownloader = const EmptyReportDownloader(),
  RentalRequestRepository rentalRequestRepository =
      const EmptyRentalRequestRepository(),
  RentalRequestDocumentSaver rentalRequestDocumentSaver =
      const EmptyRentalRequestDocumentSaver(),
  required ValueChanged<Locale> onLocaleChanged,
  String initialLocation = '/',
}) {
  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: authController,
    redirect: (context, state) {
      final authState = authController.state;
      final location = state.uri.toString();
      final isPublicHome = state.uri.path == '/';
      final isPublicUnit =
          state.uri.pathSegments.isNotEmpty &&
          state.uri.pathSegments.first == 'units' &&
          (state.uri.pathSegments.length == 2 ||
              (state.uri.pathSegments.length == 3 &&
                  state.uri.pathSegments.last == 'rent'));
      final isPublicRentalStatus =
          (state.uri.pathSegments.length == 2 &&
              state.uri.pathSegments.first == 'rental-requests') ||
          (state.uri.pathSegments.length == 3 &&
              state.uri.pathSegments.first == 'saraya' &&
              state.uri.pathSegments[1] == 'rental-requests');
      final isPublicJourney =
          isPublicHome || isPublicUnit || isPublicRentalStatus;
      final isLogin = state.uri.path == '/login';
      final requested = _safeRequestedLocation(
        state.uri.queryParameters['from'],
      );

      if (authState is AuthChecking) {
        if (isPublicJourney) return null;
        return _withRequestedLocation('/', location);
      }

      if (authState is Unauthenticated || authState is AuthFailure) {
        if (isPublicJourney && requested == null) return null;
        if (isLogin) return null;
        return _withRequestedLocation('/login', requested ?? location);
      }

      if (authState case Authenticated(needsMembershipSelection: true)) {
        if (isPublicJourney && requested == null) return null;
        if (isLogin) return null;
        return _withRequestedLocation('/login', requested ?? location);
      }

      if (authState is Authenticated) {
        if (isPublicJourney && requested == null) return null;
        final target = isPublicHome || isLogin
            ? requested ?? '/dashboard'
            : location;
        final membership = authState.selectedMembership!;
        if (!_canAccessPath(target, membership.role)) {
          return '/dashboard';
        }
        if (isPublicHome || isLogin) return target;
        return null;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => _PublicHomeRoute(
          authController: authController,
          repository: publicHomeRepository,
          onLogin: () => context.go('/login'),
          onOpenUnit: (unitId) => context.go('/units/$unitId'),
          onLocaleChanged: onLocaleChanged,
        ),
      ),
      GoRoute(
        path: '/units/:unitId',
        builder: (context, state) => _PublicUnitDetailsRoute(
          authController: authController,
          unitId: state.pathParameters['unitId']!,
          publicHomeRepository: publicHomeRepository,
          viewingRepository: viewingRepository,
          onBack: () => context.go('/'),
          onRentNow: () =>
              context.go('/units/${state.pathParameters['unitId']}/rent'),
        ),
      ),
      GoRoute(
        path: '/units/:unitId/rent',
        builder: (context, state) {
          final unitId = state.pathParameters['unitId']!;
          return RentalApplicationWizard(
            unitId: unitId,
            repository: publicRentalRepository,
            documentPicker: _pickRentalDocument,
            onBack: () => context.go('/units/$unitId'),
            onSubmitted: (requestId) =>
                context.go('/rental-requests/$requestId'),
            onSessionVerified: authController.adoptCurrentSession,
          );
        },
      ),
      GoRoute(
        path: '/rental-requests/:requestId',
        builder: (context, state) => RentalStatusScreen(
          requestId: state.pathParameters['requestId']!,
          repository: publicRentalRepository,
          documentPicker: _pickRentalDocument,
          documentSaver: rentalDocumentSaver,
          onBack: () => context.go('/'),
        ),
      ),
      GoRoute(
        path: '/saraya/rental-requests/:requestId',
        redirect: (context, state) =>
            '/rental-requests/${state.pathParameters['requestId']}',
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => LoginScreen(
          authController: authController,
          onLocaleChanged: onLocaleChanged,
        ),
      ),
      ShellRoute(
        builder: (context, state, child) {
          final authState = authController.state as Authenticated;
          final membership = authState.selectedMembership!;
          final path = state.uri.path;
          return AppShell(
            key: const Key('saraya-authenticated-shell'),
            role: membership.role,
            selectedPath: path,
            onNavigate: context.go,
            title: Text(_routeTitle(AppLocalizations.of(context)!, path)),
            actions: [
              IconButton(
                tooltip: AppLocalizations.of(context)!.actionLogout,
                onPressed: authController.logout,
                icon: const Icon(Icons.logout),
              ),
            ],
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) {
              final authState = authController.state as Authenticated;
              final membership = authState.selectedMembership!;
              final isArabic =
                  Localizations.localeOf(context).languageCode == 'ar';
              return DashboardScreen(
                controller: DashboardController(dashboardRepository),
                propertyId: membership.propertyId,
                propertyName: isArabic
                    ? membership.propertyNameAr
                    : membership.propertyNameEn,
                displayName: isArabic
                    ? authState.account.displayNameAr
                    : authState.account.displayNameEn,
                role: membership.role,
                onNavigate: context.go,
                disposeController: true,
              );
            },
          ),
          GoRoute(
            path: '/virtual-addresses',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return VirtualAddressesScreen(
                repository: virtualAddressRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/meeting-rooms',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return MeetingRoomsScreen(
                repository: meetingRoomRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/viewings',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return ViewingManagementScreen(
                repository: viewingRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/rental-requests',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return RentalRequestsScreen(
                repository: rentalRequestRepository,
                documentSaver: rentalRequestDocumentSaver,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/leases',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return LeasesScreen(
                repository: leaseRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/invoices',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return InvoicesScreen(
                repository: invoiceRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/maintenance',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return MaintenanceScreen(
                repository: maintenanceRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/documents',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return DocumentsScreen(
                repository: documentRepository,
                propertyId: membership.propertyId,
                role: membership.role,
              );
            },
          ),
          GoRoute(
            path: '/reports',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return ReportsScreen(
                repository: dashboardRepository,
                reportRepository: reportRepository,
                downloader: reportDownloader,
                propertyId: membership.propertyId,
              );
            },
          ),
          GoRoute(
            path: '/account',
            builder: (context, state) {
              final membership =
                  (authController.state as Authenticated).selectedMembership!;
              return AccountScreen(
                repository: accountRepository,
                role: membership.role,
              );
            },
          ),
          for (final route in const [
            _ManagementRoute('/properties', [ManagementResource.properties]),
            _ManagementRoute('/units', [ManagementResource.units]),
            _ManagementRoute('/clients', [
              ManagementResource.tenants,
              ManagementResource.owners,
            ]),
            _ManagementRoute('/team', [ManagementResource.staff]),
          ])
            GoRoute(
              path: route.path,
              builder: (context, state) {
                final membership =
                    (authController.state as Authenticated).selectedMembership!;
                return ManagementRouteView(
                  repository: managementRepository,
                  onboardingRepository: clientOnboardingRepository,
                  resources: route.resources,
                  propertyId: membership.propertyId,
                  role: membership.role,
                );
              },
            ),
        ],
      ),
    ],
  );
}

final class _PublicHomeRoute extends StatefulWidget {
  const _PublicHomeRoute({
    required this.authController,
    required this.repository,
    required this.onLogin,
    required this.onOpenUnit,
    required this.onLocaleChanged,
  });

  final AuthController authController;
  final PublicHomeRepository repository;
  final VoidCallback onLogin;
  final ValueChanged<String> onOpenUnit;
  final ValueChanged<Locale> onLocaleChanged;

  @override
  State<_PublicHomeRoute> createState() => _PublicHomeRouteState();
}

final class _PublicHomeRouteState extends State<_PublicHomeRoute> {
  @override
  void initState() {
    super.initState();
    if (widget.authController.state is AuthChecking) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.authController.restore();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PublicHomeScreen(
      repository: widget.repository,
      onLogin: widget.onLogin,
      onOpenUnit: widget.onOpenUnit,
      onLocaleChanged: widget.onLocaleChanged,
    );
  }
}

final class _PublicUnitDetailsRoute extends StatefulWidget {
  const _PublicUnitDetailsRoute({
    required this.authController,
    required this.unitId,
    required this.publicHomeRepository,
    required this.viewingRepository,
    required this.onBack,
    required this.onRentNow,
  });

  final AuthController authController;
  final String unitId;
  final PublicHomeRepository publicHomeRepository;
  final ViewingRepository viewingRepository;
  final VoidCallback onBack;
  final VoidCallback onRentNow;

  @override
  State<_PublicUnitDetailsRoute> createState() =>
      _PublicUnitDetailsRouteState();
}

final class _PublicUnitDetailsRouteState
    extends State<_PublicUnitDetailsRoute> {
  @override
  void initState() {
    super.initState();
    if (widget.authController.state is AuthChecking) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.authController.restore();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: widget.publicHomeRepository.load(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final units = snapshot.data?.units ?? const [];
        PublicUnitDetails? details;
        for (final unit in units) {
          if (unit.id == widget.unitId) {
            details = PublicUnitDetails.fromListing(unit);
            break;
          }
        }
        if (snapshot.hasError || details == null) {
          return Scaffold(
            appBar: AppBar(
              leading: IconButton(
                onPressed: widget.onBack,
                icon: const Icon(Icons.arrow_back_rounded),
              ),
            ),
            body: Center(
              child: Text(AppLocalizations.of(context)!.unitDetailsNotFound),
            ),
          );
        }
        return PublicUnitDetailsScreen(
          details: details,
          repository: widget.viewingRepository,
          onBack: widget.onBack,
          onRentNow: widget.onRentNow,
        );
      },
    );
  }
}

final class _ManagementRoute {
  const _ManagementRoute(this.path, this.resources);

  final String path;
  final List<ManagementResource> resources;
}

bool _canAccessPath(String location, AppRole role) {
  final path = Uri.parse(location).path;
  final capability = switch (path) {
    '/virtual-addresses' => AppCapability.manageVirtualAddresses,
    '/meeting-rooms' => AppCapability.manageMeetingRooms,
    '/viewings' => AppCapability.manageViewings,
    '/rental-requests' => AppCapability.manageRentalRequests,
    '/leases' => AppCapability.manageLeases,
    '/maintenance' => AppCapability.manageMaintenance,
    '/documents' => AppCapability.manageDocuments,
    '/reports' => AppCapability.viewReports,
    '/invoices' => AppCapability.manageInvoices,
    '/account' => AppCapability.viewAccount,
    _ => null,
  };
  if (capability != null) return roleHasCapability(role, capability);
  final resource = switch (path) {
    '/properties' => ManagementResource.properties,
    '/units' => ManagementResource.units,
    '/clients' => ManagementResource.tenants,
    '/team' => ManagementResource.staff,
    _ => null,
  };
  return resource == null || canViewManagementResource(role, resource);
}

String _managementTitle(AppLocalizations strings, String path) =>
    switch (path) {
      '/properties' => strings.navProperties,
      '/units' => strings.navUnits,
      '/clients' => strings.navClients,
      '/team' => strings.navTeam,
      _ => strings.appName,
    };

String _routeTitle(AppLocalizations strings, String path) => switch (path) {
  '/dashboard' => strings.navOverview,
  '/virtual-addresses' => strings.navVirtualAddresses,
  '/meeting-rooms' => strings.navMeetingRooms,
  '/viewings' => strings.navViewings,
  '/rental-requests' => strings.navRentalRequests,
  '/leases' => strings.navLeases,
  '/invoices' => strings.navInvoices,
  '/maintenance' => strings.navMaintenance,
  '/documents' => strings.navDocuments,
  '/reports' => strings.navReports,
  '/account' => strings.navMyAccount,
  _ => _managementTitle(strings, path),
};

String _withRequestedLocation(String path, String requested) {
  final safe = _safeRequestedLocation(requested);
  if (safe == null || safe == path) return path;
  return Uri(path: path, queryParameters: {'from': safe}).toString();
}

String? _safeRequestedLocation(String? value) {
  if (value == null || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}

Future<RentalDocument?> _pickRentalDocument() async {
  final file = await pickDocumentFile();
  if (file == null) return null;
  return RentalDocument(
    fileName: file.name,
    contentType: file.contentType,
    bytes: file.bytes,
  );
}
