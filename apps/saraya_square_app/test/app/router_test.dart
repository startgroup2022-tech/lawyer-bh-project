import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:saraya_square_app/app/router.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';
import 'package:saraya_square_app/features/auth/data/auth_repository.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';

void main() {
  testWidgets(
    'root stays public while protected dashboard still requires login',
    (tester) async {
      final controller = AuthController(
        _RouterRepository(loginAccount: _account(const [])),
      );
      final router = createSarayaRouter(
        authController: controller,
        dashboardRepository: _DashboardRepository(),
        managementRepository: _ManagementRepository(),
        invoiceRepository: _InvoiceRepository(),
        accountRepository: _AccountRepository(),
        publicHomeRepository: const _PublicHomeRepository(),
        onLocaleChanged: (_) {},
        initialLocation: '/',
      );
      addTearDown(router.dispose);

      await _pumpRouter(tester, router);

      expect(router.routeInformationProvider.value.uri.path, '/');
      expect(
        find.text('Your business starts at a distinguished address'),
        findsOneWidget,
      );

      router.go('/dashboard');
      await tester.pumpAndSettle();
      expect(router.routeInformationProvider.value.uri.path, '/login');
    },
  );

  testWidgets('public unit route stays anonymous and exposes both actions', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.propertyManager,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      publicHomeRepository: const _PublicHomeRepository(withUnit: true),
      viewingRepository: const EmptyViewingRepository(),
      publicRentalRepository: const _PublicRentalRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/units/unit-101',
    );
    addTearDown(router.dispose);

    await _pumpRouter(tester, router);

    expect(router.routeInformationProvider.value.uri.path, '/units/unit-101');
    expect(find.byKey(const Key('book-visit')), findsOneWidget);
    expect(find.byKey(const Key('rent-now')), findsOneWidget);

    await tester.tap(find.byKey(const Key('rent-now')));
    await tester.pumpAndSettle();

    expect(
      router.routeInformationProvider.value.uri.path,
      '/units/unit-101/rent',
    );
    expect(find.byKey(const Key('rental-start')), findsOneWidget);
    expect(find.byKey(const Key('visit-booking-form')), findsNothing);
  });

  testWidgets(
    'rental request status route stays public and supports pull refresh',
    (tester) async {
      final controller = AuthController(
        _RouterRepository(loginAccount: _account(const [])),
      );
      final router = createSarayaRouter(
        authController: controller,
        dashboardRepository: _DashboardRepository(),
        managementRepository: _ManagementRepository(),
        invoiceRepository: _InvoiceRepository(),
        accountRepository: _AccountRepository(),
        publicRentalRepository: const _PublicRentalRepository(),
        onLocaleChanged: (_) {},
        initialLocation: '/rental-requests/request-1',
      );
      addTearDown(router.dispose);

      await _pumpRouter(tester, router);

      expect(
        router.routeInformationProvider.value.uri.path,
        '/rental-requests/request-1',
      );
      expect(find.byType(RefreshIndicator), findsOneWidget);
      expect(find.text('Approved — payment required'), findsOneWidget);
    },
  );

  testWidgets('verified HTTPS payment return opens the native status route', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(loginAccount: _account(const [])),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      publicRentalRepository: const _PublicRentalRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/saraya/rental-requests/request-1',
    );
    addTearDown(router.dispose);

    await _pumpRouter(tester, router);

    expect(
      router.routeInformationProvider.value.uri.path,
      '/rental-requests/request-1',
    );
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });

  testWidgets('viewings route allows managers and blocks accountants', (
    tester,
  ) async {
    final manager = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.propertyManager,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: manager,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      viewingRepository: const EmptyViewingRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/viewings',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);
    await manager.login('manager@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/viewings');
    expect(find.text('Viewing appointments'), findsWidgets);

    final accountant = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.accountant,
          ),
        ]),
      ),
    );
    final blockedRouter = createSarayaRouter(
      authController: accountant,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      viewingRepository: const EmptyViewingRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/viewings',
    );
    addTearDown(blockedRouter.dispose);
    await _pumpRouter(tester, blockedRouter);
    await accountant.login('accountant@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(blockedRouter.routeInformationProvider.value.uri.path, '/dashboard');
  });

  testWidgets('protected route redirects to login and returns after login', (
    tester,
  ) async {
    final repository = _RouterRepository(
      loginAccount: _account(const [
        AccountMembership(
          propertyId: 'property-1',
          propertyNameAr: 'سرايا سكوير',
          propertyNameEn: 'Saraya Square',
          role: AppRole.superAdmin,
        ),
      ]),
    );
    final controller = AuthController(repository);
    final dashboardRepository = _DashboardRepository();
    final managementRepository = _ManagementRepository();
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: dashboardRepository,
      managementRepository: managementRepository,
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/dashboard',
    );
    addTearDown(router.dispose);

    await _pumpRouter(tester, router);

    expect(router.routeInformationProvider.value.uri.path, '/login');
    expect(
      router.routeInformationProvider.value.uri.queryParameters['from'],
      '/dashboard',
    );

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/dashboard');
    expect(find.text('Welcome, Admin'), findsOneWidget);
    expect(dashboardRepository.loadedPropertyId, 'property-1');
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });

  testWidgets('multiple memberships stay on login until one is selected', (
    tester,
  ) async {
    final repository = _RouterRepository(
      loginAccount: _account(const [
        AccountMembership(
          propertyId: 'property-1',
          propertyNameAr: 'سرايا سكوير',
          propertyNameEn: 'Saraya Square',
          role: AppRole.propertyManager,
        ),
        AccountMembership(
          propertyId: 'property-2',
          propertyNameAr: 'سرايا بارك',
          propertyNameEn: 'Saraya Park',
          role: AppRole.owner,
        ),
      ]),
    );
    final controller = AuthController(repository);
    final dashboardRepository = _DashboardRepository();
    final managementRepository = _ManagementRepository();
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: dashboardRepository,
      managementRepository: managementRepository,
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/dashboard',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/login');
    expect(find.text('Saraya Square'), findsOneWidget);
    expect(find.text('Saraya Park'), findsOneWidget);
    expect(find.text('property-1'), findsNothing);
    expect(find.text('property-2'), findsNothing);

    controller.selectMembership('property-2');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/dashboard');
    expect(dashboardRepository.loadedPropertyId, 'property-2');
  });

  testWidgets('multiple memberships use Arabic property names without UUIDs', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.propertyManager,
          ),
          AccountMembership(
            propertyId: 'property-2',
            propertyNameAr: 'سرايا بارك',
            propertyNameEn: 'Saraya Park',
            role: AppRole.owner,
          ),
        ]),
      ),
    );
    final dashboardRepository = _DashboardRepository();
    final managementRepository = _ManagementRepository();
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: dashboardRepository,
      managementRepository: managementRepository,
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/dashboard',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router, locale: const Locale('ar'));

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(find.text('سرايا سكوير'), findsOneWidget);
    expect(find.text('سرايا بارك'), findsOneWidget);
    expect(find.text('property-1'), findsNothing);
    expect(find.text('property-2'), findsNothing);
  });

  testWidgets('management routes load scoped resources for an administrator', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final managementRepository = _ManagementRepository();
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: managementRepository,
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/clients',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/clients');
    expect(find.text('Tenants'), findsOneWidget);
    expect(find.text('Owners'), findsOneWidget);
    expect(managementRepository.requests.single.$1, ManagementResource.tenants);
    expect(managementRepository.requests.single.$2.propertyId, 'property-1');
  });

  testWidgets('authenticated navigation keeps the same shell mounted', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/dashboard',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);
    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    final shellBefore = find
        .byKey(const Key('saraya-authenticated-shell'))
        .evaluate()
        .single;
    router.go('/units');
    await tester.pumpAndSettle();
    final shellAfter = find
        .byKey(const Key('saraya-authenticated-shell'))
        .evaluate()
        .single;

    expect(identical(shellAfter, shellBefore), isTrue);
    expect(find.text('Units'), findsWidgets);
  });

  testWidgets('routing blocks roles without the requested capability', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.accountant,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/team',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('accountant@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/dashboard');
    expect(find.text('Team management'), findsNothing);
  });

  testWidgets('invoice route loads the selected property for accountants', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.accountant,
          ),
        ]),
      ),
    );
    final invoices = _InvoiceRepository();
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: invoices,
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/invoices',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('accountant@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/invoices');
    expect(invoices.propertyIds, ['property-1']);
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });

  testWidgets('virtual-address route opens instead of a not-found page', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/virtual-addresses',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(
      router.routeInformationProvider.value.uri.path,
      '/virtual-addresses',
    );
    expect(find.text('Virtual address inventory'), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('meeting-room route opens instead of a not-found page', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/meeting-rooms',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/meeting-rooms');
    expect(find.text('Meeting room inventory'), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('lease route opens instead of a not-found page', (tester) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/leases',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/leases');
    expect(find.text('Lease portfolio'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('maintenance route opens instead of a not-found page', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/maintenance',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/maintenance');
    expect(find.text('Maintenance tickets'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('documents route opens instead of a not-found page', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/documents',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/documents');
    expect(find.text('Document library'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('reports route opens instead of a not-found page', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.superAdmin,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/reports',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);
    await controller.login('admin@example.com', 'valid-value');
    await tester.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, '/reports');
    expect(find.text('Operational reports'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
    expect(find.text('Page Not Found'), findsNothing);
  });

  testWidgets('maintenance cannot open invoices but can open account', (
    tester,
  ) async {
    final controller = AuthController(
      _RouterRepository(
        loginAccount: _account(const [
          AccountMembership(
            propertyId: 'property-1',
            propertyNameAr: 'سرايا سكوير',
            propertyNameEn: 'Saraya Square',
            role: AppRole.maintenance,
          ),
        ]),
      ),
    );
    final router = createSarayaRouter(
      authController: controller,
      dashboardRepository: _DashboardRepository(),
      managementRepository: _ManagementRepository(),
      invoiceRepository: _InvoiceRepository(),
      accountRepository: _AccountRepository(),
      onLocaleChanged: (_) {},
      initialLocation: '/invoices',
    );
    addTearDown(router.dispose);
    await _pumpRouter(tester, router);

    await controller.login('maintenance@example.com', 'valid-value');
    await tester.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, '/dashboard');

    router.go('/account');
    await tester.pumpAndSettle();
    expect(router.routeInformationProvider.value.uri.path, '/account');
    expect(find.text('Profile details'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });
}

final class _PublicHomeRepository implements PublicHomeRepository {
  const _PublicHomeRepository({this.withUnit = false});

  final bool withUnit;

  @override
  Future<PublicHomeInventory> load() async => PublicHomeInventory(
    units: withUnit ? [_publicUnit] : [],
    virtualAddresses: PublicVirtualAddressSummary(total: 50, available: 50),
  );
}

const _publicUnit = PublicUnitListing(
  id: 'unit-101',
  propertyId: 'property-1',
  propertyNameAr: 'سرايا سكوير',
  propertyNameEn: 'Saraya Square',
  unitNumber: '101',
  unitType: 'office',
  displayNameAr: 'مكتب ١٠١',
  displayNameEn: 'Office 101',
  descriptionAr: 'مكتب خاص جاهز للعمل',
  descriptionEn: 'A private office ready for work',
  imageKey: 'office_101',
  status: 'vacant',
  marketRent: '450.000',
);

final class _PublicRentalRepository extends EmptyPublicRentalRepository {
  const _PublicRentalRepository();

  @override
  Future<PublicRentalUnit> loadUnit(String unitId) async => PublicRentalUnit(
    id: unitId,
    propertyId: 'property-1',
    unitNumber: '101',
    displayNameAr: 'مكتب ١٠١',
    displayNameEn: 'Office 101',
    rentAmount: '450.000',
    depositAmount: '0.000',
    feeAmount: '0.000',
    currency: 'BHD',
    approvalMode: RentalApprovalMode.instant,
  );

  @override
  Future<RentalApplication> status(String requestId) async => RentalApplication(
    id: requestId,
    propertyId: 'property-1',
    unitId: 'unit-101',
    status: RentalApplicationStatus.approvedAwaitingPayment,
    approvalMode: RentalApprovalMode.instant,
    paymentDemandId: 'demand-1',
    totalAmount: '450.000',
    currency: 'BHD',
    timeline: const [
      RentalTimelineEntry(
        code: 'submitted',
        occurredAt: '2026-09-27T10:00:00Z',
      ),
    ],
  );
}

final class _DashboardRepository implements DashboardRepository {
  String? loadedPropertyId;

  @override
  Future<DashboardSummary> load(String propertyId) async {
    loadedPropertyId = propertyId;
    return DashboardSummary(
      propertyId: propertyId,
      role: 'property_manager',
      occupiedUnits: 0,
      vacantUnits: 0,
      tenantCount: 0,
      pendingRequests: 0,
      dueAmount: '0.000',
      paidAmount: '0.000',
      overdueAmount: '0.000',
      currencyCode: 'BHD',
    );
  }
}

Future<void> _pumpRouter(
  WidgetTester tester,
  GoRouter router, {
  Locale locale = const Locale('en'),
}) {
  return tester
      .pumpWidget(
        MaterialApp.router(
          routerConfig: router,
          locale: locale,
          theme: SarayaTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      )
      .then((_) => tester.pumpAndSettle());
}

Account _account(List<AccountMembership> memberships) => Account(
  id: 'user-1',
  displayNameAr: 'مدير',
  displayNameEn: 'Admin',
  email: 'admin@example.com',
  phone: null,
  memberships: memberships,
);

final class _RouterRepository implements AuthRepository {
  _RouterRepository({required this.loginAccount});

  final Account loginAccount;

  @override
  Future<Account> login(String identity, String password) async => loginAccount;

  @override
  Future<void> logout() async {}

  @override
  Future<Account?> restore() async => null;
}

final class _ManagementRepository implements ManagementRepository {
  final List<(ManagementResource, ManagementQuery)> requests = [];

  @override
  Future<ManagementPage<ManagementRecord>> list(
    ManagementResource resource,
    ManagementQuery query,
  ) async {
    requests.add((resource, query));
    return const ManagementPage(items: [], nextCursor: null);
  }

  @override
  Future<ManagementRecord> create(
    ManagementResource resource,
    ManagementQuery query,
    ManagementInput input,
  ) => throw UnimplementedError();

  @override
  Future<ManagementRecord> update(
    ManagementResource resource,
    ManagementQuery query,
    String id,
    ManagementInput input,
  ) => throw UnimplementedError();

  @override
  Future<void> deactivate(
    ManagementResource resource,
    ManagementQuery query,
    String id,
  ) => throw UnimplementedError();
}

final class _InvoiceRepository implements InvoiceRepository {
  final List<String> propertyIds = [];

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async {
    propertyIds.add(propertyId);
    return const [];
  }

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async => const [];

  @override
  Future<InvoiceRecord> create(String propertyId, InvoiceCreateInput input) =>
      throw UnimplementedError();
}

final class _AccountRepository implements AccountRepository {
  @override
  Future<AccountProfile> load() async => const AccountProfile(
    id: 'user-1',
    displayNameAr: 'مدير',
    displayNameEn: 'Admin',
    email: 'admin@example.com',
    phone: null,
    memberships: [
      AccountMembership(
        propertyId: 'property-1',
        propertyNameAr: 'سرايا سكوير',
        propertyNameEn: 'Saraya Square',
        role: AppRole.maintenance,
      ),
    ],
  );

  @override
  Future<AccountProfile> update(AccountUpdate input) =>
      throw UnimplementedError();

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => throw UnimplementedError();
}
