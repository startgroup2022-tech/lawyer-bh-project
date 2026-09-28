import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';
import 'package:saraya_square_app/features/reports/data/report_downloader.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/reports/domain/report_export.dart';

final class ReportsScreen extends StatefulWidget {
  const ReportsScreen({
    required this.repository,
    required this.propertyId,
    this.reportRepository = const EmptyReportRepository(),
    this.downloader = const EmptyReportDownloader(),
    super.key,
  });
  final DashboardRepository repository;
  final ReportRepository reportRepository;
  final ReportDownloader downloader;
  final String propertyId;
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

final class _ReportsScreenState extends State<ReportsScreen> {
  late Future<DashboardSummary> _report = widget.repository.load(
    widget.propertyId,
  );
  ReportPeriodPreset _preset = ReportPeriodPreset.month;
  late DateTimeRange _range = _rangeFor(_preset, DateTime.now());
  final _loading = <String>{};

  Future<void> _refresh() async {
    final next = widget.repository.load(widget.propertyId);
    setState(() => _report = next);
    await next;
  }

  static DateTimeRange _rangeFor(ReportPeriodPreset preset, DateTime now) =>
      switch (preset) {
        ReportPeriodPreset.today => DateTimeRange(
          start: DateTime(now.year, now.month, now.day),
          end: DateTime(now.year, now.month, now.day),
        ),
        ReportPeriodPreset.month => DateTimeRange(
          start: DateTime(now.year, now.month),
          end: DateTime(now.year, now.month + 1, 0),
        ),
        ReportPeriodPreset.quarter => DateTimeRange(
          start: DateTime(now.year, ((now.month - 1) ~/ 3) * 3 + 1),
          end: DateTime(now.year, ((now.month - 1) ~/ 3) * 3 + 4, 0),
        ),
        ReportPeriodPreset.year => DateTimeRange(
          start: DateTime(now.year),
          end: DateTime(now.year, 12, 31),
        ),
        ReportPeriodPreset.custom => DateTimeRange(start: now, end: now),
      };
  Future<void> _select(ReportPeriodPreset preset) async {
    if (preset == ReportPeriodPreset.custom) {
      final selected = await showDateRangePicker(
        context: context,
        firstDate: DateTime(2020),
        lastDate: DateTime(2100),
        initialDateRange: _range,
      );
      if (selected == null) return;
      setState(() {
        _preset = preset;
        _range = selected;
      });
    } else {
      setState(() {
        _preset = preset;
        _range = _rangeFor(preset, DateTime.now());
      });
    }
  }

  Future<void> _export(ReportKind kind, ReportFileFormat format) async {
    final key = '${kind.name}-${format.name}';
    if (_loading.contains(key)) return;
    setState(() => _loading.add(key));
    final strings = AppLocalizations.of(context)!;
    try {
      final date = DateFormat('yyyy-MM-dd');
      final file = await widget.reportRepository.export(
        ReportExportRequest(
          propertyId: widget.propertyId,
          kind: kind,
          format: format,
          locale: Localizations.localeOf(context).languageCode,
          from: date.format(_range.start),
          to: date.format(_range.end),
        ),
      );
      await widget.downloader.save(file);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.reportsReady)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.reportsFailed)));
      }
    } finally {
      if (mounted) setState(() => _loading.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return FutureBuilder<DashboardSummary>(
      future: _report,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: OutlinedButton(
              onPressed: _refresh,
              child: Text(strings.actionRetry),
            ),
          );
        }
        final report = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                strings.reportsTitle,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(strings.reportsDescription),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _Metric(
                    strings.dashboardOccupiedUnits,
                    '${report.occupiedUnits}',
                    Icons.apartment,
                  ),
                  _Metric(
                    strings.dashboardVacantUnits,
                    '${report.vacantUnits}',
                    Icons.domain_outlined,
                  ),
                  _Metric(
                    strings.dashboardTenants,
                    '${report.tenantCount}',
                    Icons.groups_outlined,
                  ),
                  _Metric(
                    strings.dashboardDueAmount,
                    formatMoney(report.currencyCode, report.dueAmount),
                    Icons.schedule,
                  ),
                  _Metric(
                    strings.dashboardPaidAmount,
                    formatMoney(report.currencyCode, report.paidAmount),
                    Icons.payments_outlined,
                  ),
                  _Metric(
                    strings.dashboardOverdueAmount,
                    formatMoney(report.currencyCode, report.overdueAmount),
                    Icons.warning_amber_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 26),
              Text(
                strings.reportsPeriod,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in [
                    (
                      ReportPeriodPreset.today,
                      strings.reportsToday,
                      'period-today',
                    ),
                    (
                      ReportPeriodPreset.month,
                      strings.reportsMonth,
                      'period-month',
                    ),
                    (
                      ReportPeriodPreset.quarter,
                      strings.reportsQuarter,
                      'period-quarter',
                    ),
                    (
                      ReportPeriodPreset.year,
                      strings.reportsYear,
                      'period-year',
                    ),
                    (
                      ReportPeriodPreset.custom,
                      strings.reportsCustom,
                      'period-custom',
                    ),
                  ])
                    ChoiceChip(
                      key: Key(item.$3),
                      label: Text(item.$2),
                      selected: _preset == item.$1,
                      onSelected: (_) => _select(item.$1),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${DateFormat.yMMMd(Localizations.localeOf(context).toLanguageTag()).format(_range.start)} — ${DateFormat.yMMMd(Localizations.localeOf(context).toLanguageTag()).format(_range.end)}',
              ),
              const SizedBox(height: 24),
              _ReportCard(
                kind: ReportKind.comprehensive,
                title: strings.reportsComprehensive,
                description: strings.reportsComprehensiveDescription,
                icon: Icons.assessment,
                prominent: true,
                loading: _loading,
                onExport: _export,
              ),
              const SizedBox(height: 14),
              LayoutBuilder(
                builder: (context, constraints) {
                  final cardWidth = constraints.maxWidth >= 900
                      ? (constraints.maxWidth - 14) / 2
                      : constraints.maxWidth;
                  return Wrap(
                    spacing: 14,
                    runSpacing: 14,
                    children: [
                      for (final item in [
                        (
                          ReportKind.finance,
                          strings.reportsFinance,
                          Icons.account_balance,
                        ),
                        (
                          ReportKind.invoices,
                          strings.reportsInvoices,
                          Icons.receipt_long,
                        ),
                        (
                          ReportKind.leases,
                          strings.reportsLeases,
                          Icons.description,
                        ),
                        (
                          ReportKind.occupancy,
                          strings.reportsOccupancy,
                          Icons.apartment,
                        ),
                        (
                          ReportKind.clients,
                          strings.reportsClients,
                          Icons.groups,
                        ),
                        (
                          ReportKind.virtualAddresses,
                          strings.reportsVirtualAddresses,
                          Icons.alternate_email,
                        ),
                        (
                          ReportKind.maintenance,
                          strings.reportsMaintenance,
                          Icons.build,
                        ),
                        (
                          ReportKind.meetingRooms,
                          strings.reportsMeetingRooms,
                          Icons.meeting_room,
                        ),
                      ])
                        SizedBox(
                          width: cardWidth,
                          child: _ReportCard(
                            kind: item.$1,
                            title: item.$2,
                            description: strings.reportsFocusedDescription,
                            icon: item.$3,
                            loading: _loading,
                            onExport: _export,
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

final class _ReportCard extends StatelessWidget {
  const _ReportCard({
    required this.kind,
    required this.title,
    required this.description,
    required this.icon,
    required this.loading,
    required this.onExport,
    this.prominent = false,
  });
  final ReportKind kind;
  final String title;
  final String description;
  final IconData icon;
  final Set<String> loading;
  final bool prominent;
  final Future<void> Function(ReportKind, ReportFileFormat) onExport;
  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    Widget button(ReportFileFormat format, String label, IconData icon) {
      final busy = loading.contains('${kind.name}-${format.name}');
      return OutlinedButton.icon(
        key: Key('report-${kind.apiValue}-${format.name}'),
        onPressed: busy ? null : () => onExport(kind, format),
        icon: busy
            ? const SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(icon),
        label: Text(label),
      );
    }

    return Card(
      color: prominent
          ? Theme.of(
              context,
            ).colorScheme.primaryContainer.withValues(alpha: .55)
          : null,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(child: Icon(icon)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 6),
                  Text(description),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      button(
                        ReportFileFormat.pdf,
                        strings.reportsDownloadPdf,
                        Icons.picture_as_pdf,
                      ),
                      button(
                        ReportFileFormat.xlsx,
                        strings.reportsDownloadExcel,
                        Icons.table_view,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, this.icon);
  final String label;
  final String value;
  final IconData icon;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 230,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label),
                  const SizedBox(height: 8),
                  Text(value, style: Theme.of(context).textTheme.titleLarge),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
