import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';
import 'package:saraya_square_app/features/invoices/presentation/invoices_screen.dart';

void main() {
  testWidgets('desktop table localizes statuses and shows exact BHD amounts', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(tester, _Repository(_invoices));

    expect(find.byKey(const Key('invoices-table')), findsOneWidget);
    expect(find.byKey(const Key('invoices-cards')), findsNothing);
    expect(find.text('Partially paid'), findsOneWidget);
    expect(find.text('Due'), findsOneWidget);
    expect(find.text('BHD 1,250.500'), findsOneWidget);
    expect(find.text('BHD 250.125'), findsOneWidget);
    expect(find.text('partially_paid'), findsNothing);
  });

  testWidgets('mobile cards render without overflow in Arabic RTL', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await _pump(tester, _Repository(_invoices), locale: const Locale('ar'));

    expect(find.byKey(const Key('invoices-cards')), findsOneWidget);
    expect(find.byKey(const Key('invoices-table')), findsNothing);
    expect(find.text('مدفوعة جزئيًا'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('payment action exists only for an API-provided safe link', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    Uri? opened;
    await _pump(
      tester,
      _Repository(_invoices),
      openPaymentLink: (uri) async {
        opened = uri;
        return true;
      },
    );

    expect(find.byKey(const Key('pay-invoice-1')), findsOneWidget);
    expect(find.byKey(const Key('pay-invoice-2')), findsNothing);
    await tester.scrollUntilVisible(
      find.byKey(const Key('pay-invoice-1')),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('pay-invoice-1')));
    await tester.pumpAndSettle();

    expect(opened, Uri.parse('https://pay.example/i/1'));
    expect(find.textContaining('Paid successfully'), findsNothing);
  });

  testWidgets('empty response states there are no invoices', (tester) async {
    await _pump(tester, _Repository(const []));

    expect(find.text('No invoices yet'), findsOneWidget);
  });

  testWidgets('pull to refresh reloads invoices from the repository', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _CountingRepository(_invoices);
    await _pump(tester, repository);

    expect(repository.loadCount, 1);
    await tester.fling(find.byType(ListView).first, const Offset(0, 350), 1000);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(repository.loadCount, 2);
  });

  testWidgets('accountant creates an invoice and refreshes the list', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _CreatingRepository();
    await _pump(tester, repository);

    await tester.tap(find.byKey(const Key('add-invoice')));
    await tester.pumpAndSettle();
    expect(find.text('Add invoice'), findsWidgets);
    await tester.tap(find.byKey(const Key('invoice-target')));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('A-01').last);
    await tester.enterText(
      find.byKey(const Key('invoice-description')),
      'September rent',
    );
    await tester.enterText(find.byKey(const Key('invoice-amount')), '1250.500');
    await tester.enterText(
      find.byKey(const Key('invoice-issue-date')),
      '2026-09-01',
    );
    await tester.enterText(
      find.byKey(const Key('invoice-due-date')),
      '2026-09-30',
    );
    await tester.tap(find.byKey(const Key('create-invoice')));
    await tester.pumpAndSettle();

    expect(repository.created?.description, 'September rent');
    expect(repository.loadCount, 2);
    expect(find.text('Invoice created successfully'), findsOneWidget);
  });

  testWidgets('tenant cannot see the add invoice action', (tester) async {
    await _pump(tester, _Repository(_invoices), role: AppRole.tenant);
    expect(find.byKey(const Key('add-invoice')), findsNothing);
  });
}

Future<void> _pump(
  WidgetTester tester,
  InvoiceRepository repository, {
  Locale locale = const Locale('en'),
  AppRole role = AppRole.accountant,
  Future<bool> Function(Uri uri)? openPaymentLink,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: InvoicesScreen(
          repository: repository,
          propertyId: 'property-1',
          role: role,
          openPaymentLink: openPaymentLink,
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pumpAndSettle();
}

final class _Repository implements InvoiceRepository {
  const _Repository(this.items);

  final List<InvoiceRecord> items;

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async => items;

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async => const [];

  @override
  Future<InvoiceRecord> create(String propertyId, InvoiceCreateInput input) =>
      throw UnimplementedError();
}

final class _CountingRepository implements InvoiceRepository {
  _CountingRepository(this.items);

  final List<InvoiceRecord> items;
  int loadCount = 0;

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async {
    loadCount += 1;
    return items;
  }

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async => const [];

  @override
  Future<InvoiceRecord> create(String propertyId, InvoiceCreateInput input) =>
      throw UnimplementedError();
}

final class _CreatingRepository implements InvoiceRepository {
  int loadCount = 0;
  InvoiceCreateInput? created;

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async {
    loadCount += 1;
    return loadCount == 1 ? const [] : _invoices;
  }

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async => const [
    InvoiceTarget(
      rentalRequestId: 'request-1',
      unitNumber: 'A-01',
      tenantNameAr: 'شركة ألف',
      tenantNameEn: 'Alpha Company',
    ),
  ];

  @override
  Future<InvoiceRecord> create(
    String propertyId,
    InvoiceCreateInput input,
  ) async {
    created = input;
    return _invoices.first;
  }
}

final _invoices = [
  InvoiceRecord(
    id: 'invoice-1',
    propertyId: 'property-1',
    rentalRequestId: 'request-1',
    number: 'INV-2026-001',
    status: 'partially_paid',
    issueDate: '2026-09-01',
    dueDate: '2026-09-30',
    totalAmount: '1250.500',
    paidAmount: '250.125',
    currency: 'BHD',
    unitId: 'unit-1',
    unitNumber: 'A-01',
    paymentDemandId: 'demand-1',
    paymentStatus: 'pending',
    paymentUrl: Uri(scheme: 'https', host: 'pay.example', path: '/i/1'),
  ),
  InvoiceRecord(
    id: 'invoice-2',
    propertyId: 'property-1',
    rentalRequestId: 'request-2',
    number: 'INV-2026-002',
    status: 'due',
    issueDate: '2026-09-05',
    dueDate: '2026-10-05',
    totalAmount: '500.000',
    paidAmount: '0.000',
    currency: 'BHD',
    unitId: 'unit-2',
    unitNumber: 'A-02',
  ),
];
