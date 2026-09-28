import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';
import 'package:saraya_square_app/features/reports/data/report_downloader.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/reports/domain/report_export.dart';
import 'package:saraya_square_app/features/reports/presentation/reports_screen.dart';

void main() {
  testWidgets('shows complete report catalogue and downloads PDF', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 3000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final repository = _Reports();
    final downloader = _Downloader();
    await tester.pumpWidget(
      SarayaApp(
        config: AppConfig(apiBaseUrl: Uri()),
        home: Scaffold(
          body: ReportsScreen(
            repository: _Dashboard(),
            reportRepository: repository,
            downloader: downloader,
            propertyId: 'p',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('التقرير الشامل'), findsOneWidget);
    expect(find.text('الفواتير'), findsOneWidget);
    expect(find.text('الصيانة والمصاريف'), findsOneWidget);
    expect(find.byKey(const Key('period-month')), findsOneWidget);
    await tester.tap(find.byKey(const Key('report-comprehensive-pdf')));
    await tester.pumpAndSettle();
    expect(repository.requests.single.kind, ReportKind.comprehensive);
    expect(repository.requests.single.format, ReportFileFormat.pdf);
    expect(downloader.saved, hasLength(1));
  });
}

final class _Dashboard implements DashboardRepository {
  @override
  Future<DashboardSummary> load(String propertyId) async =>
      const DashboardSummary(
        propertyId: 'p',
        role: 'property_manager',
        occupiedUnits: 3,
        vacantUnits: 2,
        tenantCount: 4,
        pendingRequests: 1,
        dueAmount: '10.000',
        paidAmount: '20.000',
        overdueAmount: '5.000',
        currencyCode: 'BHD',
      );
}

final class _Reports implements ReportRepository {
  final requests = <ReportExportRequest>[];
  @override
  Future<ReportFile> export(ReportExportRequest request) async {
    requests.add(request);
    return ReportFile(
      bytes: Uint8List.fromList([1]),
      fileName: 'report.pdf',
      contentType: 'application/pdf',
    );
  }
}

final class _Downloader implements ReportDownloader {
  final saved = <ReportFile>[];
  @override
  Future<void> save(ReportFile file) async {
    saved.add(file);
  }
}
