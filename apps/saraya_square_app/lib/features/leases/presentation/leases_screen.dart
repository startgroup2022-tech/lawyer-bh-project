import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/leases/domain/lease.dart';

final class LeasesScreen extends StatefulWidget {
  const LeasesScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    super.key,
  });

  final LeaseRepository repository;
  final String propertyId;
  final AppRole role;

  @override
  State<LeasesScreen> createState() => _LeasesScreenState();
}

final class _LeasesScreenState extends State<LeasesScreen> {
  late Future<List<LeaseRecord>> _leases = _load();
  bool _busy = false;

  Future<List<LeaseRecord>> _load() =>
      widget.repository.list(widget.propertyId);

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _leases = next);
    await next;
  }

  Future<void> _runAction(LeaseRecord lease, LeaseAction action) async {
    if (_busy) return;
    LeaseRenewalTerms? terms;
    String? reason;
    if (action == LeaseAction.approveRenewal) {
      terms = await showDialog<LeaseRenewalTerms>(
        context: context,
        builder: (context) => _RenewalTermsDialog(lease: lease),
      );
      if (terms == null) return;
    } else if (action == LeaseAction.terminate) {
      reason = await showDialog<String>(
        context: context,
        builder: (context) => const _TerminationDialog(),
      );
      if (reason == null) return;
    } else {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(_actionLabel(AppLocalizations.of(context)!, action)),
          content: Text(AppLocalizations.of(context)!.leaseDescription),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(AppLocalizations.of(context)!.actionCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(AppLocalizations.of(context)!.actionApprove),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    setState(() => _busy = true);
    try {
      await widget.repository.command(
        widget.propertyId,
        lease.id,
        action,
        terms: terms,
        reason: reason,
      );
      await _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.leaseActionCompleted),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.leaseActionFailed),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageLeases)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return FutureBuilder<List<LeaseRecord>>(
      future: _leases,
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
        return _LeaseContent(
          leases: snapshot.data ?? const [],
          onRefresh: _refresh,
          onAction: _runAction,
          busy: _busy,
        );
      },
    );
  }
}

final class _LeaseContent extends StatelessWidget {
  const _LeaseContent({
    required this.leases,
    required this.onRefresh,
    required this.onAction,
    required this.busy,
  });

  final List<LeaseRecord> leases;
  final Future<void> Function() onRefresh;
  final Future<void> Function(LeaseRecord, LeaseAction) onAction;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (leases.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              strings.leaseTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(strings.leaseDescription),
            const SizedBox(height: 48),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.description_outlined, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    strings.leaseEmptyTitle,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  Text(strings.leaseEmptyDescription),
                ],
              ),
            ),
          ],
        ),
      );
    }
    final active = leases.where((lease) => lease.status == 'active').length;
    final renewals = leases
        .where((lease) => lease.status == 'renewal_requested')
        .length;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              strings.leaseTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(strings.leaseDescription),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _SummaryCard(
                  label: strings.leaseTotal,
                  value: leases.length.toString(),
                ),
                _SummaryCard(
                  label: strings.leaseActive,
                  value: active.toString(),
                ),
                _SummaryCard(
                  label: strings.leaseRenewalRequested,
                  value: renewals.toString(),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (SarayaBreakpoints.isCompact(constraints.maxWidth))
              _LeaseCards(leases: leases, onAction: onAction, busy: busy)
            else
              _LeaseTable(leases: leases, onAction: onAction, busy: busy),
          ],
        ),
      ),
    );
  }
}

final class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 190,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
      ),
    ),
  );
}

final class _LeaseTable extends StatelessWidget {
  const _LeaseTable({
    required this.leases,
    required this.onAction,
    required this.busy,
  });

  final List<LeaseRecord> leases;
  final Future<void> Function(LeaseRecord, LeaseAction) onAction;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: [
            DataColumn(label: Text(strings.fieldUnit)),
            DataColumn(label: Text(strings.leaseTenant)),
            DataColumn(label: Text(strings.fieldStatus)),
            DataColumn(label: Text(strings.leasePeriod)),
            DataColumn(label: Text(strings.leaseRent)),
            DataColumn(label: Text(strings.leaseFrequency)),
            DataColumn(label: Text(strings.leaseActions)),
          ],
          rows: [
            for (final lease in leases)
              DataRow(
                cells: [
                  DataCell(Text(lease.unitNumber)),
                  DataCell(Text(_tenant(context, lease))),
                  DataCell(Text(_status(strings, lease.status))),
                  DataCell(Text('${lease.startDate} – ${lease.endDate}')),
                  DataCell(Text(formatMoney('BHD', lease.rentAmount))),
                  DataCell(Text(_frequency(strings, lease.frequency))),
                  DataCell(
                    _LeaseActions(lease: lease, onAction: onAction, busy: busy),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

final class _LeaseCards extends StatelessWidget {
  const _LeaseCards({
    required this.leases,
    required this.onAction,
    required this.busy,
  });

  final List<LeaseRecord> leases;
  final Future<void> Function(LeaseRecord, LeaseAction) onAction;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      children: [
        for (final lease in leases)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            lease.unitNumber,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        Chip(label: Text(_status(strings, lease.status))),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _Detail(strings.leaseTenant, _tenant(context, lease)),
                    _Detail(
                      strings.leasePeriod,
                      '${lease.startDate} – ${lease.endDate}',
                    ),
                    _Detail(
                      strings.leaseRent,
                      formatMoney('BHD', lease.rentAmount),
                    ),
                    _Detail(
                      strings.leaseFrequency,
                      _frequency(strings, lease.frequency),
                    ),
                    _Detail(
                      strings.leaseDueDay,
                      strings.leaseDueDayValue(lease.dueDay),
                    ),
                    const SizedBox(height: 8),
                    _LeaseActions(lease: lease, onAction: onAction, busy: busy),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

final class _LeaseActions extends StatelessWidget {
  const _LeaseActions({
    required this.lease,
    required this.onAction,
    required this.busy,
  });
  final LeaseRecord lease;
  final Future<void> Function(LeaseRecord, LeaseAction) onAction;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final actions = switch (lease.status) {
      'pending_approval' => const [LeaseAction.approve],
      'active' => const [LeaseAction.terminate],
      'renewal_requested' => const [
        LeaseAction.approveRenewal,
        LeaseAction.rejectRenewal,
        LeaseAction.terminate,
      ],
      'terminated' => const [LeaseAction.close],
      _ => const <LeaseAction>[],
    };
    if (actions.isEmpty) return const SizedBox.shrink();
    final strings = AppLocalizations.of(context)!;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final action in actions)
          OutlinedButton(
            onPressed: busy ? null : () => onAction(lease, action),
            child: Text(_actionLabel(strings, action)),
          ),
      ],
    );
  }
}

final class _TerminationDialog extends StatefulWidget {
  const _TerminationDialog();
  @override
  State<_TerminationDialog> createState() => _TerminationDialogState();
}

final class _TerminationDialogState extends State<_TerminationDialog> {
  final _reason = TextEditingController();
  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(strings.leaseTerminate),
      content: TextField(
        controller: _reason,
        maxLines: 3,
        decoration: InputDecoration(labelText: strings.leaseTerminationReason),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(strings.actionCancel),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _reason.text),
          child: Text(strings.leaseTerminate),
        ),
      ],
    );
  }
}

final class _RenewalTermsDialog extends StatefulWidget {
  const _RenewalTermsDialog({required this.lease});
  final LeaseRecord lease;
  @override
  State<_RenewalTermsDialog> createState() => _RenewalTermsDialogState();
}

final class _RenewalTermsDialogState extends State<_RenewalTermsDialog> {
  late final _start = TextEditingController(text: widget.lease.startDate);
  late final _end = TextEditingController(text: widget.lease.endDate);
  late final _rent = TextEditingController(text: widget.lease.rentAmount);
  late final _deposit = TextEditingController(text: widget.lease.depositAmount);
  late final _dueDay = TextEditingController(text: '${widget.lease.dueDay}');
  late final _graceDays = TextEditingController(
    text: '${widget.lease.graceDays}',
  );
  late String _frequency = widget.lease.frequency;

  @override
  void dispose() {
    for (final controller in [
      _start,
      _end,
      _rent,
      _deposit,
      _dueDay,
      _graceDays,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(strings.leaseRenewalTerms),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _start,
                decoration: InputDecoration(labelText: strings.fieldStartDate),
              ),
              TextField(
                controller: _end,
                decoration: InputDecoration(labelText: strings.fieldEndDate),
              ),
              TextField(
                controller: _rent,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.leaseRent),
              ),
              TextField(
                controller: _deposit,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.leaseDeposit),
              ),
              DropdownButtonFormField<String>(
                initialValue: _frequency,
                decoration: InputDecoration(labelText: strings.leaseFrequency),
                items: [
                  DropdownMenuItem(
                    value: 'monthly',
                    child: Text(strings.leaseFrequencyMonthly),
                  ),
                  DropdownMenuItem(
                    value: 'quarterly',
                    child: Text(strings.leaseFrequencyQuarterly),
                  ),
                  DropdownMenuItem(
                    value: 'annual',
                    child: Text(strings.leaseFrequencyAnnual),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) setState(() => _frequency = value);
                },
              ),
              TextField(
                controller: _dueDay,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.leaseDueDay),
              ),
              TextField(
                controller: _graceDays,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.leaseGraceDays),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(strings.actionCancel),
        ),
        FilledButton(
          onPressed: _submit,
          child: Text(strings.leaseApproveRenewal),
        ),
      ],
    );
  }

  void _submit() {
    final dueDay = int.tryParse(_dueDay.text);
    final graceDays = int.tryParse(_graceDays.text);
    if (_start.text.trim().isEmpty ||
        _end.text.trim().isEmpty ||
        double.tryParse(_rent.text) == null ||
        double.tryParse(_deposit.text) == null ||
        dueDay == null ||
        graceDays == null) {
      return;
    }
    Navigator.pop(
      context,
      LeaseRenewalTerms(
        startDate: _start.text.trim(),
        endDate: _end.text.trim(),
        rentAmount: _rent.text.trim(),
        depositAmount: _deposit.text.trim(),
        frequency: _frequency,
        dueDay: dueDay,
        graceDays: graceDays,
      ),
    );
  }
}

String _actionLabel(AppLocalizations strings, LeaseAction action) =>
    switch (action) {
      LeaseAction.approve => strings.leaseApprove,
      LeaseAction.requestRenewal => strings.leaseRequestRenewal,
      LeaseAction.approveRenewal => strings.leaseApproveRenewal,
      LeaseAction.rejectRenewal => strings.leaseRejectRenewal,
      LeaseAction.terminate => strings.leaseTerminate,
      LeaseAction.close => strings.leaseClose,
    };

final class _Detail extends StatelessWidget {
  const _Detail(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 7),
    child: Row(
      children: [
        Expanded(child: Text(label)),
        const SizedBox(width: 12),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
      ],
    ),
  );
}

String _tenant(BuildContext context, LeaseRecord lease) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  return isArabic ? lease.tenantNameAr : lease.tenantNameEn;
}

String _status(AppLocalizations strings, String status) => switch (status) {
  'draft' => strings.leaseStatusDraft,
  'pending_approval' => strings.leaseStatusPendingApproval,
  'active' => strings.leaseStatusActive,
  'renewal_requested' => strings.leaseStatusRenewalRequested,
  'rejected' => strings.leaseStatusRejected,
  'terminated' => strings.leaseStatusTerminated,
  'closed' => strings.leaseStatusClosed,
  _ => strings.managementNotProvided,
};

String _frequency(AppLocalizations strings, String frequency) =>
    switch (frequency) {
      'monthly' => strings.leaseFrequencyMonthly,
      'quarterly' => strings.leaseFrequencyQuarterly,
      'annual' => strings.leaseFrequencyAnnual,
      _ => strings.managementNotProvided,
    };
