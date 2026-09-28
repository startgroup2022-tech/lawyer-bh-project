import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';
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

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Phase 1 administrator journey stays truthful end to end', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1440, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final authRepository = _AuthRepository();
    final invoiceRepository = _InvoiceRepository();
    final accountRepository = _AccountRepository();
    await tester.pumpWidget(
      SarayaApp(
        config: AppConfig(apiBaseUrl: Uri.parse('https://sq.example')),
        locale: const Locale('en'),
        authController: AuthController(authRepository),
        dashboardRepository: _DashboardRepository(),
        managementRepository: _ManagementRepository(),
        invoiceRepository: invoiceRepository,
        accountRepository: accountRepository,
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Your business starts at a distinguished address'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const Key('public-login')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('login-identity')),
      'admin@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('login-password')),
      'valid-value',
    );
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Welcome, Admin'), findsOneWidget);

    await _open(tester, 'Units');
    expect(find.text('A-01'), findsOneWidget);
    expect(find.text('Vacant'), findsOneWidget);

    await _open(tester, 'Team');
    expect(find.text('Saraya Manager'), findsOneWidget);

    await _open(tester, 'Invoices');
    expect(find.text('No invoices yet'), findsOneWidget);

    await _open(tester, 'My account');
    await tester.tap(find.byKey(const Key('account-save')));
    await tester.pumpAndSettle();
    expect(accountRepository.updateCount, 1);

    invoiceRepository.items = const [_invoice];
    await _open(tester, 'Invoices');
    expect(find.text('INV-2026-001'), findsOneWidget);
    expect(find.text('BHD 125.500'), findsOneWidget);

    await tester.tap(find.byTooltip('Log out').first);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login-submit')), findsOneWidget);
    expect(authRepository.logoutCount, 1);
  });
}

Future<void> _open(WidgetTester tester, String label) async {
  final destination = find.text(label).first;
  await tester.ensureVisible(destination);
  await tester.tap(destination);
  await tester.pumpAndSettle();
}

final class _AuthRepository implements AuthRepository {
  int logoutCount = 0;

  @override
  Future<Account> login(String identity, String password) async => _account;

  @override
  Future<void> logout() async => logoutCount += 1;

  @override
  Future<Account?> restore() async => null;
}

final class _DashboardRepository implements DashboardRepository {
  @override
  Future<DashboardSummary> load(String propertyId) async => DashboardSummary(
    propertyId: propertyId,
    role: 'super_admin',
    occupiedUnits: 0,
    vacantUnits: 6,
    tenantCount: 0,
    pendingRequests: 0,
    dueAmount: '0.000',
    paidAmount: '0.000',
    overdueAmount: '0.000',
    currencyCode: 'BHD',
  );
}

final class _ManagementRepository implements ManagementRepository {
  @override
  Future<ManagementPage<ManagementRecord>> list(
    ManagementResource resource,
    ManagementQuery query,
  ) async => switch (resource) {
    ManagementResource.units => const ManagementPage(
      items: [UnitRecord(id: 'unit-1', unitNumber: 'A-01', status: 'vacant')],
      nextCursor: null,
    ),
    ManagementResource.staff => const ManagementPage(
      items: [
        StaffRecord(
          id: 'membership-1',
          userId: 'user-2',
          displayNameAr: 'مدير سرايا',
          displayNameEn: 'Saraya Manager',
          role: 'property_manager',
          isActive: true,
        ),
      ],
      nextCursor: null,
    ),
    _ => const ManagementPage(items: [], nextCursor: null),
  };

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
  List<InvoiceRecord> items = const [];

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async => items;

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async => const [];

  @override
  Future<InvoiceRecord> create(String propertyId, InvoiceCreateInput input) =>
      throw UnimplementedError();
}

final class _AccountRepository implements AccountRepository {
  int updateCount = 0;

  @override
  Future<AccountProfile> load() async => _profile;

  @override
  Future<AccountProfile> update(AccountUpdate input) async {
    updateCount += 1;
    return _profile;
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => throw UnimplementedError();
}

const _membership = AccountMembership(
  propertyId: 'property-1',
  propertyNameAr: 'سرايا سكوير',
  propertyNameEn: 'Saraya Square',
  role: AppRole.superAdmin,
);

const _account = Account(
  id: 'user-1',
  displayNameAr: 'المدير',
  displayNameEn: 'Admin',
  email: 'admin@example.com',
  phone: null,
  memberships: [_membership],
);

const _profile = AccountProfile(
  id: 'user-1',
  displayNameAr: 'المدير',
  displayNameEn: 'Admin',
  email: 'admin@example.com',
  phone: null,
  memberships: [_membership],
);

const _invoice = InvoiceRecord(
  id: 'invoice-1',
  propertyId: 'property-1',
  rentalRequestId: 'request-1',
  number: 'INV-2026-001',
  status: 'due',
  issueDate: '2026-09-01',
  dueDate: '2026-09-30',
  totalAmount: '125.500',
  paidAmount: '0.000',
  currency: 'BHD',
  unitId: 'unit-1',
  unitNumber: 'A-01',
);
