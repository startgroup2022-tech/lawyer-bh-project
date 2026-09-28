import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/virtual_addresses/domain/virtual_address.dart';

final class VirtualAddressesScreen extends StatefulWidget {
  const VirtualAddressesScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    super.key,
  });

  final VirtualAddressRepository repository;
  final String propertyId;
  final AppRole role;

  @override
  State<VirtualAddressesScreen> createState() => _VirtualAddressesScreenState();
}

final class _VirtualAddressesScreenState extends State<VirtualAddressesScreen> {
  late Future<List<VirtualAddressRecord>> _items = _load();

  Future<List<VirtualAddressRecord>> _load() =>
      widget.repository.list(widget.propertyId);

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _items = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageVirtualAddresses)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return FutureBuilder<List<VirtualAddressRecord>>(
      future: _items,
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
        return _VirtualAddressContent(
          items: snapshot.data ?? const [],
          onRefresh: _refresh,
          onEdit: _edit,
        );
      },
    );
  }

  Future<void> _edit(VirtualAddressRecord item) async {
    final result = await showDialog<VirtualAddressInput>(
      context: context,
      builder: (context) => _AddressDialog(item: item),
    );
    if (result == null) return;
    await widget.repository.update(widget.propertyId, item.id, result);
    if (mounted) await _refresh();
  }
}

final class _VirtualAddressContent extends StatelessWidget {
  const _VirtualAddressContent({
    required this.items,
    required this.onRefresh,
    required this.onEdit,
  });

  final List<VirtualAddressRecord> items;
  final Future<void> Function() onRefresh;
  final ValueChanged<VirtualAddressRecord> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final available = items.where((item) => item.status == 'available').length;
    final active = items.where((item) => item.status == 'active').length;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              strings.virtualAddressTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(strings.virtualAddressDescription),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _SummaryCard(
                  label: strings.virtualAddressTotal,
                  value: items.length.toString(),
                ),
                _SummaryCard(
                  label: strings.virtualAddressAvailable,
                  value: available.toString(),
                ),
                _SummaryCard(
                  label: strings.virtualAddressActive,
                  value: active.toString(),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.all(32),
                child: Center(child: Text(strings.virtualAddressEmpty)),
              )
            else if (SarayaBreakpoints.isCompact(constraints.maxWidth))
              _AddressCards(items: items, onEdit: onEdit)
            else
              _AddressTable(items: items, onEdit: onEdit),
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
    width: 180,
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

final class _AddressTable extends StatelessWidget {
  const _AddressTable({required this.items, required this.onEdit});

  final List<VirtualAddressRecord> items;
  final ValueChanged<VirtualAddressRecord> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: [
            DataColumn(label: Text(strings.virtualAddressCode)),
            DataColumn(label: Text(strings.fieldStatus)),
            DataColumn(label: Text(strings.virtualAddressTenant)),
            DataColumn(label: Text(strings.virtualAddressBusinessName)),
            DataColumn(label: Text(strings.virtualAddressMonthlyFee)),
            DataColumn(label: Text(strings.virtualAddressPeriod)),
            DataColumn(label: Text(strings.actionEdit)),
          ],
          rows: [
            for (final item in items)
              DataRow(
                cells: [
                  DataCell(Text(item.code)),
                  DataCell(Text(_status(strings, item.status))),
                  DataCell(Text(_tenant(context, item))),
                  DataCell(Text(_business(context, item))),
                  DataCell(Text(_fee(strings, item))),
                  DataCell(Text(_period(strings, item))),
                  DataCell(
                    IconButton(
                      tooltip: strings.actionEdit,
                      onPressed: () => onEdit(item),
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

final class _AddressCards extends StatelessWidget {
  const _AddressCards({required this.items, required this.onEdit});

  final List<VirtualAddressRecord> items;
  final ValueChanged<VirtualAddressRecord> onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      children: [
        for (final item in items)
          Card(
            child: ListTile(
              title: Text(item.code),
              subtitle: Text(_tenant(context, item)),
              trailing: IconButton(
                tooltip: strings.actionEdit,
                onPressed: () => onEdit(item),
                icon: const Icon(Icons.edit_outlined),
              ),
            ),
          ),
      ],
    );
  }
}

final class _AddressDialog extends StatefulWidget {
  const _AddressDialog({required this.item});
  final VirtualAddressRecord item;
  @override
  State<_AddressDialog> createState() => _AddressDialogState();
}

final class _AddressDialogState extends State<_AddressDialog> {
  late String _status = widget.item.status;
  late final _businessAr = TextEditingController(
    text: widget.item.businessNameAr,
  );
  late final _businessEn = TextEditingController(
    text: widget.item.businessNameEn,
  );
  late final _fee = TextEditingController(text: widget.item.monthlyFee);
  late final _start = TextEditingController(text: widget.item.startDate);
  late final _end = TextEditingController(text: widget.item.endDate);

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text('${strings.actionEdit} ${widget.item.code}'),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _status,
                decoration: InputDecoration(labelText: strings.fieldStatus),
                items:
                    const [
                          'available',
                          'reserved',
                          'active',
                          'suspended',
                          'inactive',
                        ]
                        .map(
                          (value) => DropdownMenuItem(
                            value: value,
                            child: Text(_statusLabel(strings, value)),
                          ),
                        )
                        .toList(),
                onChanged: (value) => setState(() => _status = value!),
              ),
              TextField(
                controller: _businessAr,
                decoration: InputDecoration(
                  labelText: strings.virtualAddressBusinessNameAr,
                ),
              ),
              TextField(
                controller: _businessEn,
                decoration: InputDecoration(
                  labelText: strings.virtualAddressBusinessNameEn,
                ),
              ),
              TextField(
                controller: _fee,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: strings.virtualAddressMonthlyFee,
                ),
              ),
              TextField(
                controller: _start,
                decoration: InputDecoration(
                  labelText: strings.fieldStartDate,
                  hintText: 'YYYY-MM-DD',
                ),
              ),
              TextField(
                controller: _end,
                decoration: InputDecoration(
                  labelText: strings.fieldEndDate,
                  hintText: 'YYYY-MM-DD',
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
          onPressed: () => Navigator.pop(
            context,
            VirtualAddressInput(
              status: _status,
              tenantOrganizationId: widget.item.tenantOrganizationId,
              businessNameAr: _empty(_businessAr.text),
              businessNameEn: _empty(_businessEn.text),
              monthlyFee: _empty(_fee.text),
              startDate: _empty(_start.text),
              endDate: _empty(_end.text),
            ),
          ),
          child: Text(strings.actionSave),
        ),
      ],
    );
  }
}

String? _empty(String value) => value.trim().isEmpty ? null : value.trim();
String _statusLabel(AppLocalizations strings, String value) =>
    _status(strings, value);

String _tenant(BuildContext context, VirtualAddressRecord item) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  return (isArabic ? item.tenantNameAr : item.tenantNameEn) ??
      AppLocalizations.of(context)!.managementNotProvided;
}

String _business(BuildContext context, VirtualAddressRecord item) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  return (isArabic ? item.businessNameAr : item.businessNameEn) ??
      AppLocalizations.of(context)!.managementNotProvided;
}

String _fee(AppLocalizations strings, VirtualAddressRecord item) =>
    item.monthlyFee == null
    ? strings.managementNotProvided
    : formatMoney('BHD', item.monthlyFee!);

String _period(AppLocalizations strings, VirtualAddressRecord item) {
  if (item.startDate == null && item.endDate == null) {
    return strings.managementNotProvided;
  }
  return '${item.startDate ?? '—'} – ${item.endDate ?? '—'}';
}

String _status(AppLocalizations strings, String status) => switch (status) {
  'available' => strings.virtualAddressStatusAvailable,
  'reserved' => strings.virtualAddressStatusReserved,
  'active' => strings.virtualAddressStatusActive,
  'suspended' => strings.virtualAddressStatusSuspended,
  'inactive' => strings.virtualAddressStatusInactive,
  _ => strings.managementNotProvided,
};
