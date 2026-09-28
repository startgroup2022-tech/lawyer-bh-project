import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/design/saraya_theme.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/documents/data/document_picker.dart';
import 'package:saraya_square_app/features/documents/domain/saraya_document.dart';
import 'package:saraya_square_app/features/documents/presentation/documents_screen.dart';

void main() {
  testWidgets('shows registered document metadata', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await _pump(tester, _Repository());

    expect(find.text('Document library'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Add document'), findsOneWidget);
    expect(find.text('Signed lease'), findsOneWidget);
    expect(find.byTooltip('Edit'), findsOneWidget);
    expect(find.text('OFF-101'), findsOneWidget);
    expect(find.text('Lease'), findsOneWidget);
    expect(find.text('240 KB'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('adds a selected file using only its document name', (
    tester,
  ) async {
    final repository = _Repository();
    await _pump(
      tester,
      repository,
      picker: () async => PickedDocumentFile(
        name: 'insurance.pdf',
        contentType: 'application/pdf',
        bytes: Uint8List.fromList([1, 2, 3]),
      ),
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Add document'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('document-upload-name')),
      'Insurance certificate',
    );
    await tester.tap(find.byKey(const Key('document-upload-file')));
    await tester.pumpAndSettle();
    expect(find.text('insurance.pdf'), findsOneWidget);
    await tester.tap(find.byKey(const Key('document-upload-submit')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(repository.uploads.single.title, 'Insurance certificate');
    expect(repository.uploads.single.fileName, 'insurance.pdf');
    expect(find.text('Insurance certificate'), findsOneWidget);
  });

  testWidgets('keeps the add action available when the library is empty', (
    tester,
  ) async {
    final repository = _Repository()..items.clear();
    await _pump(tester, repository);

    expect(find.text('No documents registered'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Add document'), findsOneWidget);
  });
}

Future<void> _pump(
  WidgetTester tester,
  DocumentRepository repository, {
  DocumentFilePicker? picker,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      theme: SarayaTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: DocumentsScreen(
          repository: repository,
          propertyId: 'property-1',
          role: AppRole.superAdmin,
          filePicker: picker,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

final class _Repository implements DocumentRepository {
  final List<DocumentUploadInput> uploads = [];
  final List<SarayaDocument> items = [_document];

  @override
  Future<SarayaDocument> create(
    String propertyId,
    DocumentUploadInput input,
  ) async {
    uploads.add(input);
    final document = SarayaDocument(
      id: 'document-${items.length + 1}',
      propertyId: propertyId,
      category: 'other',
      title: input.title,
      originalName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.bytes.length,
      status: 'active',
      createdAt: '2026-09-26T12:00:00.000Z',
      uploadedByNameEn: 'Administrator',
    );
    items.insert(0, document);
    return document;
  }

  @override
  Future<SarayaDocument> update(
    String propertyId,
    String id,
    DocumentInput input,
  ) => throw UnimplementedError();

  @override
  Future<List<SarayaDocument>> list(String propertyId) async =>
      List.unmodifiable(items);
}

const _document = SarayaDocument(
  id: 'document-1',
  propertyId: 'property-1',
  unitId: 'unit-1',
  tenantOrganizationId: 'tenant-1',
  leaseId: 'lease-1',
  category: 'lease',
  title: 'Signed lease',
  originalName: 'lease.pdf',
  contentType: 'application/pdf',
  sizeBytes: 245760,
  status: 'active',
  createdAt: '2026-09-26T08:00:00.000Z',
  unitNumber: 'OFF-101',
  tenantNameAr: 'شركة البحرين',
  tenantNameEn: 'Bahrain Company',
  uploadedByNameAr: 'مدير النظام',
  uploadedByNameEn: 'Administrator',
);
