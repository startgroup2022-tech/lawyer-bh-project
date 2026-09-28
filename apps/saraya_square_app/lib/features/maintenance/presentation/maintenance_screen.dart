import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';
import 'package:saraya_square_app/features/maintenance/domain/maintenance_ticket.dart';

final class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    super.key,
  });

  final MaintenanceRepository repository;
  final String propertyId;
  final AppRole role;

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

final class _MaintenanceScreenState extends State<MaintenanceScreen> {
  late Future<List<MaintenanceTicket>> _tickets = _load();

  Future<List<MaintenanceTicket>> _load() =>
      widget.repository.list(widget.propertyId);

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _tickets = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageMaintenance)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return FutureBuilder<List<MaintenanceTicket>>(
      future: _tickets,
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
        return _MaintenanceContent(
          tickets: snapshot.data ?? const [],
          onRefresh: _refresh,
          onAdd: () => _edit(),
          onEdit: (ticket) => _edit(ticket),
        );
      },
    );
  }

  Future<void> _edit([MaintenanceTicket? ticket]) async {
    final input = await showDialog<MaintenanceInput>(
      context: context,
      builder: (context) => _MaintenanceDialog(ticket: ticket),
    );
    if (input == null) return;
    if (ticket == null) {
      await widget.repository.create(widget.propertyId, input);
    } else {
      await widget.repository.update(widget.propertyId, ticket.id, input);
    }
    if (mounted) await _refresh();
  }
}

final class _MaintenanceContent extends StatelessWidget {
  const _MaintenanceContent({
    required this.tickets,
    required this.onRefresh,
    required this.onAdd,
    required this.onEdit,
  });

  final List<MaintenanceTicket> tickets;
  final Future<void> Function() onRefresh;
  final VoidCallback onAdd;
  final ValueChanged<MaintenanceTicket> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (tickets.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    strings.maintenanceTitle,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                FilledButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.add),
                  label: Text(strings.maintenanceAdd),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(strings.maintenanceDescription),
            const SizedBox(height: 48),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.handyman_outlined, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    strings.maintenanceEmptyTitle,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  Text(strings.maintenanceEmptyDescription),
                ],
              ),
            ),
          ],
        ),
      );
    }
    final open = tickets
        .where(
          (ticket) =>
              !['resolved', 'closed', 'cancelled'].contains(ticket.status),
        )
        .length;
    final urgent = tickets
        .where((ticket) => ticket.priority == 'urgent')
        .length;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    strings.maintenanceTitle,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                FilledButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.add),
                  label: Text(strings.maintenanceAdd),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(strings.maintenanceDescription),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _SummaryCard(
                  label: strings.maintenanceTotal,
                  value: tickets.length.toString(),
                ),
                _SummaryCard(
                  label: strings.maintenanceOpen,
                  value: open.toString(),
                ),
                _SummaryCard(
                  label: strings.maintenanceUrgent,
                  value: urgent.toString(),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (SarayaBreakpoints.isCompact(constraints.maxWidth))
              _TicketCards(tickets: tickets, onEdit: onEdit)
            else
              _TicketTable(tickets: tickets, onEdit: onEdit),
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

final class _TicketTable extends StatelessWidget {
  const _TicketTable({required this.tickets, required this.onEdit});

  final List<MaintenanceTicket> tickets;
  final ValueChanged<MaintenanceTicket> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: [
            DataColumn(label: Text(strings.maintenanceTicketNumber)),
            DataColumn(label: Text(strings.maintenanceIssue)),
            DataColumn(label: Text(strings.fieldUnit)),
            DataColumn(label: Text(strings.maintenancePriority)),
            DataColumn(label: Text(strings.fieldStatus)),
            DataColumn(label: Text(strings.maintenanceAssignee)),
            DataColumn(label: Text(strings.maintenanceExpense)),
            DataColumn(label: Text(strings.actionEdit)),
          ],
          rows: [
            for (final ticket in tickets)
              DataRow(
                cells: [
                  DataCell(Text(ticket.ticketNumber)),
                  DataCell(Text(ticket.title)),
                  DataCell(
                    Text(ticket.unitNumber ?? strings.managementNotProvided),
                  ),
                  DataCell(Text(_priority(strings, ticket.priority))),
                  DataCell(Text(_status(strings, ticket.status))),
                  DataCell(Text(_assignee(context, ticket))),
                  DataCell(Text(formatMoney('BHD', ticket.expenseAmount))),
                  DataCell(
                    IconButton(
                      tooltip: strings.actionEdit,
                      onPressed: () => onEdit(ticket),
                      icon: const Icon(Icons.edit_outlined),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

final class _TicketCards extends StatelessWidget {
  const _TicketCards({required this.tickets, required this.onEdit});

  final List<MaintenanceTicket> tickets;
  final ValueChanged<MaintenanceTicket> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      children: [
        for (final ticket in tickets)
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
                            ticket.ticketNumber,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        Chip(label: Text(_status(strings, ticket.status))),
                        IconButton(
                          tooltip: strings.actionEdit,
                          onPressed: () => onEdit(ticket),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      ticket.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(ticket.description),
                    const SizedBox(height: 12),
                    _Detail(
                      strings.fieldUnit,
                      ticket.unitNumber ?? strings.managementNotProvided,
                    ),
                    _Detail(
                      strings.maintenancePriority,
                      _priority(strings, ticket.priority),
                    ),
                    _Detail(
                      strings.maintenanceAssignee,
                      _assignee(context, ticket),
                    ),
                    _Detail(
                      strings.maintenanceExpense,
                      formatMoney('BHD', ticket.expenseAmount),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

final class _MaintenanceDialog extends StatefulWidget {
  const _MaintenanceDialog({this.ticket});
  final MaintenanceTicket? ticket;
  @override
  State<_MaintenanceDialog> createState() => _MaintenanceDialogState();
}

final class _MaintenanceDialogState extends State<_MaintenanceDialog> {
  late final _title = TextEditingController(text: widget.ticket?.title);
  late final _description = TextEditingController(
    text: widget.ticket?.description,
  );
  late final _expense = TextEditingController(
    text: widget.ticket?.expenseAmount ?? '0.000',
  );
  late String _priority = widget.ticket?.priority ?? 'medium';
  late String _statusValue = widget.ticket?.status ?? 'open';
  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(
        widget.ticket == null
            ? strings.maintenanceAdd
            : strings.maintenanceEdit,
      ),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _title,
                decoration: InputDecoration(
                  labelText: strings.maintenanceIssue,
                ),
              ),
              TextField(
                controller: _description,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: strings.fieldDescription,
                ),
              ),
              DropdownButtonFormField<String>(
                initialValue: _priority,
                decoration: InputDecoration(
                  labelText: strings.maintenancePriority,
                ),
                items: const ['low', 'medium', 'high', 'urgent']
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(_priorityLabel(strings, value)),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _priority = value!),
              ),
              DropdownButtonFormField<String>(
                initialValue: _statusValue,
                decoration: InputDecoration(labelText: strings.fieldStatus),
                items:
                    const [
                          'open',
                          'assigned',
                          'in_progress',
                          'awaiting_parts',
                          'resolved',
                          'closed',
                          'cancelled',
                        ]
                        .map(
                          (value) => DropdownMenuItem(
                            value: value,
                            child: Text(_status(strings, value)),
                          ),
                        )
                        .toList(),
                onChanged: (value) => setState(() => _statusValue = value!),
              ),
              TextField(
                controller: _expense,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: strings.maintenanceExpense,
                ),
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
          onPressed: () {
            if (_title.text.trim().isEmpty ||
                _description.text.trim().isEmpty ||
                double.tryParse(_expense.text) == null) {
              return;
            }
            Navigator.pop(
              context,
              MaintenanceInput(
                title: _title.text.trim(),
                description: _description.text.trim(),
                priority: _priority,
                status: _statusValue,
                expenseAmount: _expense.text.trim(),
              ),
            );
          },
          child: Text(strings.actionSave),
        ),
      ],
    );
  }
}

String _priorityLabel(AppLocalizations strings, String value) =>
    _priority(strings, value);

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

String _assignee(BuildContext context, MaintenanceTicket ticket) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  return (isArabic ? ticket.assignedToNameAr : ticket.assignedToNameEn) ??
      AppLocalizations.of(context)!.managementNotProvided;
}

String _priority(AppLocalizations strings, String priority) =>
    switch (priority) {
      'low' => strings.maintenancePriorityLow,
      'medium' => strings.maintenancePriorityMedium,
      'high' => strings.maintenancePriorityHigh,
      'urgent' => strings.maintenancePriorityUrgent,
      _ => strings.managementNotProvided,
    };

String _status(AppLocalizations strings, String status) => switch (status) {
  'open' => strings.maintenanceStatusOpen,
  'assigned' => strings.maintenanceStatusAssigned,
  'in_progress' => strings.maintenanceStatusInProgress,
  'awaiting_parts' => strings.maintenanceStatusAwaitingParts,
  'resolved' => strings.maintenanceStatusResolved,
  'closed' => strings.maintenanceStatusClosed,
  'cancelled' => strings.maintenanceStatusCancelled,
  _ => strings.managementNotProvided,
};
