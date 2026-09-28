import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/domain/client_onboarding.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/management_controller.dart';
import 'package:saraya_square_app/features/management/presentation/management_screen.dart';

void main() {
  testWidgets('desktop uses a server-paginated management table', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _Repository([
      const PropertyRecord(
        id: 'property-1',
        code: 'SS',
        nameAr: 'سرايا سكوير',
        nameEn: 'Saraya Square',
        isActive: true,
      ),
    ], nextCursor: 'page-2');

    await _pump(tester, ManagementResource.properties, repository);

    expect(find.byKey(const Key('management-resource-table')), findsOneWidget);
    expect(find.byKey(const Key('management-resource-cards')), findsNothing);
    expect(find.byIcon(Icons.swap_vert_rounded), findsWidgets);
    expect(find.text('Load more'), findsOneWidget);
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(repository.queries.last.cursor, 'page-2');
  });

  testWidgets('mobile uses cards and forwards search and filter', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _Repository([
      const TenantRecord(
        id: 'tenant-1',
        nameAr: 'شركة المستأجر',
        nameEn: 'Tenant Company',
        isActive: true,
      ),
    ]);

    await _pump(tester, ManagementResource.tenants, repository);

    expect(find.byKey(const Key('management-resource-cards')), findsOneWidget);
    expect(find.byKey(const Key('management-resource-table')), findsNothing);
    await tester.enterText(
      find.byKey(const Key('management-search')),
      'Tenant',
    );
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(repository.queries.last.search, 'Tenant');

    await tester.tap(find.byKey(const Key('management-filter')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Inactive').last);
    await tester.pumpAndSettle();
    expect(repository.queries.last.status, 'inactive');
  });

  testWidgets('properties do not expose an unsupported active filter', (
    tester,
  ) async {
    await _pump(tester, ManagementResource.properties, _Repository(const []));

    expect(find.byKey(const Key('management-filter')), findsNothing);
    expect(find.text('Active'), findsNothing);
    expect(find.text('Inactive'), findsNothing);
  });

  testWidgets('empty tenants and owners explain the next useful action', (
    tester,
  ) async {
    for (final resource in [
      ManagementResource.tenants,
      ManagementResource.owners,
    ]) {
      await _pump(tester, resource, _Repository(const []));
      expect(
        find.text(
          resource == ManagementResource.tenants
              ? 'No tenants yet'
              : 'No owners yet',
        ),
        findsOneWidget,
      );
      expect(
        find.text('Add the first record to start managing this section.'),
        findsOneWidget,
      );
    }
  });

  testWidgets('staff uses display names and localized roles, never user id', (
    tester,
  ) async {
    await _pump(
      tester,
      ManagementResource.staff,
      _Repository(const [
        StaffRecord(
          id: 'membership-1',
          userId: 'hidden-user-uuid',
          displayNameAr: 'مدير سرايا',
          displayNameEn: 'Saraya Manager',
          email: 'manager@example.com',
          role: 'property_manager',
          isActive: true,
        ),
      ]),
    );

    expect(find.text('Saraya Manager'), findsOneWidget);
    expect(find.text('Property manager'), findsOneWidget);
    expect(find.textContaining('hidden-user-uuid'), findsNothing);
    expect(find.text('property_manager'), findsNothing);
  });

  testWidgets('staff creation accepts identity without exposing a UUID field', (
    tester,
  ) async {
    final repository = _Repository(const []);
    await _pump(tester, ManagementResource.staff, repository);

    await tester.tap(find.text('Add team member'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('field-identity')), findsOneWidget);
    expect(find.byKey(const Key('field-userId')), findsNothing);
    expect(find.textContaining('UUID'), findsNothing);
    await tester.enterText(
      find.byKey(const Key('field-identity')),
      'manager@example.com',
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    expect(
      (repository.createdInputs.single as StaffInput).identity,
      'manager@example.com',
    );
  });

  testWidgets('unit floor status and missing values are localized', (
    tester,
  ) async {
    await _pump(
      tester,
      ManagementResource.units,
      _Repository(const [
        UnitRecord(
          id: 'unit-1',
          unitNumber: 'A-01',
          floor: 'G',
          status: 'vacant',
          areaSquareMeters: null,
          marketRent: null,
        ),
      ]),
    );

    expect(find.text('Ground floor'), findsOneWidget);
    expect(find.text('Vacant'), findsOneWidget);
    expect(find.text('Not provided'), findsWidgets);
    expect(find.text('G'), findsNothing);
    expect(find.text('vacant'), findsNothing);
    expect(find.text('null'), findsNothing);
  });

  testWidgets('unit approval defaults to inherit and can override', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _Repository(const [
      UnitRecord(
        id: 'unit-1',
        unitNumber: 'A-01',
        status: 'vacant',
        resolvedRentalApprovalMode: 'owner_review',
      ),
    ]);
    await _pump(tester, ManagementResource.units, repository);
    await tester.ensureVisible(find.byKey(const Key('edit-unit-1')));
    await tester.tap(find.byKey(const Key('edit-unit-1')));
    await tester.pumpAndSettle();
    expect(find.text('Inherit property setting'), findsOneWidget);
    await tester.tap(find.byKey(const Key('field-rentalApprovalOverride')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Instant approval').last);
    await tester.ensureVisible(find.byKey(const Key('management-save')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('management-save')));
    await tester.pumpAndSettle();
    expect(
      (repository.updatedInputs.single as UnitInput).rentalApprovalOverride,
      'instant',
    );
  });

  testWidgets('owner archive is unavailable and clearly explained', (
    tester,
  ) async {
    await _pump(
      tester,
      ManagementResource.owners,
      _Repository(const [
        OwnerRecord(id: 'owner-1', nameAr: 'المالك', nameEn: 'Owner'),
      ]),
    );

    expect(
      find.text('Owner deactivation is not available yet.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('deactivate-owner-1')), findsNothing);
  });

  testWidgets('server field errors render inline with localized text', (
    tester,
  ) async {
    final repository = _Repository(
      const [],
      createError: const ApiError(
        status: 422,
        code: 'INVALID_REQUEST',
        messageAr: 'بيانات غير صالحة',
        messageEn: 'Invalid request',
        fieldErrors: {
          'nameAr': ['REQUIRED'],
        },
      ),
    );
    await _pump(tester, ManagementResource.tenants, repository);

    await tester.tap(find.text('Add tenant'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('field-nameEn')), 'Tenant');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('field-nameAr-error')), findsOneWidget);
    expect(find.text('This field is required.'), findsOneWidget);
    expect(find.text('REQUIRED'), findsNothing);
  });

  testWidgets(
    'tenant selects a property before its units and virtual addresses',
    (tester) async {
      final onboarding = _OnboardingRepository();
      await _pump(
        tester,
        ManagementResource.tenants,
        _Repository(const []),
        onboardingRepository: onboarding,
      );

      await tester.tap(find.text('Add tenant'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const Key('tenant-onboarding-property')),
        findsOneWidget,
      );
      expect(find.text('Office 101'), findsNothing);

      await tester.tap(find.byKey(const Key('tenant-onboarding-property')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Saraya Square').last);
      await tester.pumpAndSettle();

      expect(onboarding.optionProperties, [null, 'property-1']);
      expect(find.textContaining('Office 101'), findsOneWidget);
      expect(find.textContaining('VA-001'), findsOneWidget);
    },
  );

  testWidgets('tenant can save a unit and virtual address together', (
    tester,
  ) async {
    final onboarding = _OnboardingRepository();
    await _pump(
      tester,
      ManagementResource.tenants,
      _Repository(const []),
      onboardingRepository: onboarding,
    );

    await tester.tap(find.text('Add tenant'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('tenant-name-ar')), 'شركة ألف');
    await tester.enterText(find.byKey(const Key('tenant-name-en')), 'Alpha');
    await tester.tap(find.byKey(const Key('tenant-onboarding-property')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Saraya Square').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('tenant-unit-unit-1')));
    await tester.tap(find.byKey(const Key('tenant-address-address-1')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('save-tenant-onboarding')));
    await tester.tap(find.byKey(const Key('save-tenant-onboarding')));
    await tester.pumpAndSettle();

    expect(onboarding.tenantInput?.propertyId, 'property-1');
    expect(onboarding.tenantInput?.units.single.unitId, 'unit-1');
    expect(
      onboarding.tenantInput?.virtualAddresses.single.virtualAddressId,
      'address-1',
    );
  });

  testWidgets('owner can select multiple properties', (tester) async {
    final onboarding = _OnboardingRepository();
    await _pump(
      tester,
      ManagementResource.owners,
      _Repository(const []),
      onboardingRepository: onboarding,
    );

    await tester.tap(find.text('Add owner'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('owner-name-ar')), 'المالك');
    await tester.enterText(find.byKey(const Key('owner-name-en')), 'Owner');
    await tester.tap(find.byKey(const Key('owner-property-property-1')));
    await tester.tap(find.byKey(const Key('owner-property-property-2')));
    await tester.tap(find.byKey(const Key('save-owner-onboarding')));
    await tester.pumpAndSettle();

    expect(onboarding.ownerInput?.propertyIds, ['property-1', 'property-2']);
  });

  testWidgets('supported deactivate confirmation names the record', (
    tester,
  ) async {
    final repository = _Repository(const [
      TenantRecord(
        id: 'tenant-1',
        nameAr: 'شركة المستأجر',
        nameEn: 'Tenant Company',
        isActive: true,
      ),
    ]);
    await _pump(tester, ManagementResource.tenants, repository);

    await tester.tap(find.byKey(const Key('deactivate-tenant-1')));
    await tester.pumpAndSettle();
    expect(find.text('Deactivate Tenant Company?'), findsOneWidget);
    await tester.tap(find.text('Deactivate'));
    await tester.pumpAndSettle();

    expect(repository.deactivatedIds, ['tenant-1']);
  });

  testWidgets('read-only roles do not receive mutation actions', (
    tester,
  ) async {
    await _pump(
      tester,
      ManagementResource.units,
      _Repository(const [
        UnitRecord(id: 'unit-1', unitNumber: 'A-01', status: 'vacant'),
      ]),
      role: AppRole.maintenance,
    );

    expect(find.text('Add unit'), findsNothing);
    expect(find.byKey(const Key('edit-unit-1')), findsNothing);
    expect(find.byKey(const Key('deactivate-unit-1')), findsNothing);
  });
}

Future<void> _pump(
  WidgetTester tester,
  ManagementResource resource,
  _Repository repository, {
  AppRole role = AppRole.superAdmin,
  ClientOnboardingRepository onboardingRepository =
      const EmptyClientOnboardingRepository(),
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: ManagementScreen(
        controller: ManagementController(repository, resource: resource),
        resource: resource,
        propertyId: 'property-1',
        role: role,
        onboardingRepository: onboardingRepository,
      ),
    ),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

final class _OnboardingRepository implements ClientOnboardingRepository {
  final List<String?> optionProperties = [];
  TenantOnboardingInput? tenantInput;
  OwnerOnboardingInput? ownerInput;

  @override
  Future<ClientOnboardingOptions> options({String? propertyId}) async {
    optionProperties.add(propertyId);
    return ClientOnboardingOptions(
      properties: const [
        OnboardingProperty(
          id: 'property-1',
          code: 'SQ',
          nameAr: 'سرايا سكوير',
          nameEn: 'Saraya Square',
          currencyCode: 'BHD',
        ),
        OnboardingProperty(
          id: 'property-2',
          code: 'SP',
          nameAr: 'سرايا بلازا',
          nameEn: 'Saraya Plaza',
          currencyCode: 'BHD',
        ),
      ],
      units: propertyId == null
          ? const []
          : const [
              OnboardingUnit(
                id: 'unit-1',
                propertyId: 'property-1',
                unitNumber: '101',
                displayNameAr: 'مكتب 101',
                displayNameEn: 'Office 101',
                marketRent: '500.000',
              ),
            ],
      virtualAddresses: propertyId == null
          ? const []
          : const [
              OnboardingVirtualAddress(
                id: 'address-1',
                propertyId: 'property-1',
                code: 'VA-001',
                slotNumber: 1,
                monthlyFee: '35.000',
              ),
            ],
    );
  }

  @override
  Future<void> createTenant(TenantOnboardingInput input) async {
    tenantInput = input;
  }

  @override
  Future<void> createOwner(OwnerOnboardingInput input) async {
    ownerInput = input;
  }
}

final class _Repository implements ManagementRepository {
  _Repository(this.items, {this.nextCursor, this.createError});

  final List<ManagementRecord> items;
  final String? nextCursor;
  final ApiError? createError;
  final List<ManagementQuery> queries = [];
  final List<String> deactivatedIds = [];
  final List<ManagementInput> createdInputs = [];
  final List<ManagementInput> updatedInputs = [];

  @override
  Future<ManagementPage<ManagementRecord>> list(
    ManagementResource resource,
    ManagementQuery query,
  ) async {
    queries.add(query);
    return ManagementPage(
      items: items,
      nextCursor: query.cursor == null ? nextCursor : null,
    );
  }

  @override
  Future<ManagementRecord> create(
    ManagementResource resource,
    ManagementQuery query,
    ManagementInput input,
  ) async {
    if (createError case final error?) throw error;
    createdInputs.add(input);
    return items.firstOrNull ??
        const StaffRecord(
          id: 'membership-1',
          userId: 'internal-user-id',
          displayNameAr: 'مدير سرايا',
          displayNameEn: 'Saraya Manager',
          role: 'property_manager',
          isActive: true,
        );
  }

  @override
  Future<ManagementRecord> update(
    ManagementResource resource,
    ManagementQuery query,
    String id,
    ManagementInput input,
  ) async {
    updatedInputs.add(input);
    return items.first;
  }

  @override
  Future<void> deactivate(
    ManagementResource resource,
    ManagementQuery query,
    String id,
  ) async {
    deactivatedIds.add(id);
  }
}
