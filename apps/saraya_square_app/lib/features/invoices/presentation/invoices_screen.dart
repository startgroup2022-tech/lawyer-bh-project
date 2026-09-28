import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/localization/status_labels.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';
import 'package:saraya_square_app/features/invoices/presentation/invoices_controller.dart';
import 'package:url_launcher/url_launcher.dart';

typedef PaymentLinkOpener = Future<bool> Function(Uri uri);

final class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    this.openPaymentLink,
    super.key,
  });

  final InvoiceRepository repository;
  final String propertyId;
  final AppRole role;
  final PaymentLinkOpener? openPaymentLink;

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

final class _InvoicesScreenState extends State<InvoicesScreen> {
  late final InvoicesController _controller = InvoicesController(
    widget.repository,
  );

  @override
  void initState() {
    super.initState();
    _controller.load(widget.propertyId);
  }

  @override
  void didUpdateWidget(InvoicesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.propertyId != widget.propertyId) {
      _controller.load(widget.propertyId);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageInvoices)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => switch (_controller.state) {
        InvoicesLoading() => const Center(child: CircularProgressIndicator()),
        InvoicesFailure() => _InvoiceError(
          onRetry: () => _controller.load(widget.propertyId),
        ),
        InvoicesLoaded(:final items) => _InvoiceContent(
          items: items,
          onPay: _openPayment,
          onRefresh: () => _controller.load(widget.propertyId),
          canCreate:
              widget.role == AppRole.superAdmin ||
              widget.role == AppRole.accountant,
          onCreate: _createInvoice,
        ),
      },
    );
  }

  Future<void> _openPayment(InvoiceRecord invoice) async {
    final uri = invoice.paymentUrl;
    if (uri == null) return;
    final opener =
        widget.openPaymentLink ??
        (uri) => launchUrl(uri, mode: LaunchMode.platformDefault);
    final opened = await opener(uri);
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.invoiceOpenFailed),
        ),
      );
    }
  }

  Future<void> _createInvoice() async {
    final strings = AppLocalizations.of(context)!;
    try {
      final targets = await widget.repository.targets(widget.propertyId);
      if (!mounted) return;
      if (targets.isEmpty) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.invoiceNoTargets)));
        return;
      }
      final input = await showDialog<InvoiceCreateInput>(
        context: context,
        builder: (context) => _InvoiceCreateDialog(targets: targets),
      );
      if (input == null) return;
      await widget.repository.create(widget.propertyId, input);
      await _controller.load(widget.propertyId);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.invoiceCreated)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.invoiceCreateFailed)));
    }
  }
}

final class _InvoiceContent extends StatelessWidget {
  const _InvoiceContent({
    required this.items,
    required this.onPay,
    required this.onRefresh,
    required this.canCreate,
    required this.onCreate,
  });

  final List<InvoiceRecord> items;
  final ValueChanged<InvoiceRecord> onPay;
  final Future<void> Function() onRefresh;
  final bool canCreate;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(32),
          children: [
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.receipt_long_outlined, size: 48),
                  const SizedBox(height: 12),
                  Text(
                    strings.invoiceEmptyTitle,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  Text(strings.invoiceEmptyDescription),
                  if (canCreate) ...[
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      key: const Key('add-invoice'),
                      onPressed: onCreate,
                      icon: const Icon(Icons.add),
                      label: Text(strings.invoiceAdd),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final child = SarayaBreakpoints.isCompact(constraints.maxWidth)
              ? _InvoiceCards(items: items, onPay: onPay)
              : _InvoiceTable(items: items, onPay: onPay);
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      strings.invoiceListTitle,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  if (canCreate)
                    FilledButton.icon(
                      key: const Key('add-invoice'),
                      onPressed: onCreate,
                      icon: const Icon(Icons.add),
                      label: Text(strings.invoiceAdd),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(strings.invoiceListDescription),
              const SizedBox(height: 20),
              child,
            ],
          );
        },
      ),
    );
  }
}

final class _InvoiceCreateDialog extends StatefulWidget {
  const _InvoiceCreateDialog({required this.targets});

  final List<InvoiceTarget> targets;

  @override
  State<_InvoiceCreateDialog> createState() => _InvoiceCreateDialogState();
}

final class _InvoiceCreateDialogState extends State<_InvoiceCreateDialog> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  final _issueDate = TextEditingController();
  final _dueDate = TextEditingController();
  InvoiceTarget? _target;
  String _status = 'due';

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    _issueDate.dispose();
    _dueDate.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final arabic = Localizations.localeOf(context).languageCode == 'ar';
    return AlertDialog(
      title: Text(strings.invoiceAdd),
      content: SizedBox(
        width: 520,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<InvoiceTarget>(
                  key: const Key('invoice-target'),
                  initialValue: _target,
                  decoration: InputDecoration(labelText: strings.invoiceTarget),
                  items: [
                    for (final target in widget.targets)
                      DropdownMenuItem(
                        value: target,
                        child: Text(
                          '${target.unitNumber} — ${arabic ? target.tenantNameAr : target.tenantNameEn}',
                        ),
                      ),
                  ],
                  onChanged: (value) => setState(() => _target = value),
                  validator: (value) =>
                      value == null ? strings.managementFieldRequired : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('invoice-description'),
                  controller: _description,
                  decoration: InputDecoration(
                    labelText: strings.fieldDescription,
                  ),
                  validator: _required,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('invoice-amount'),
                  controller: _amount,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    labelText: strings.invoiceAmountBhd,
                  ),
                  validator: (value) =>
                      RegExp(
                            r'^(?:0|[1-9]\d*)(?:\.\d{1,3})?$',
                          ).hasMatch(value?.trim() ?? '') &&
                          double.tryParse(value!.trim())! > 0
                      ? null
                      : strings.managementFieldInvalid,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('invoice-issue-date'),
                  controller: _issueDate,
                  decoration: InputDecoration(
                    labelText: strings.invoiceIssueDate,
                  ),
                  validator: _date,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('invoice-due-date'),
                  controller: _dueDate,
                  decoration: InputDecoration(labelText: strings.fieldDueDate),
                  validator: (value) {
                    final error = _date(value);
                    if (error != null) return error;
                    return value!.trim().compareTo(_issueDate.text.trim()) < 0
                        ? strings.managementFieldInvalid
                        : null;
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: InputDecoration(labelText: strings.fieldStatus),
                  items: [
                    DropdownMenuItem(
                      value: 'draft',
                      child: Text(strings.invoiceStatusDraft),
                    ),
                    DropdownMenuItem(
                      value: 'due',
                      child: Text(strings.invoiceStatusDue),
                    ),
                  ],
                  onChanged: (value) =>
                      setState(() => _status = value ?? 'due'),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(strings.actionCancel),
        ),
        FilledButton(
          key: const Key('create-invoice'),
          onPressed: _submit,
          child: Text(strings.invoiceCreate),
        ),
      ],
    );
  }

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? AppLocalizations.of(context)!.managementFieldRequired
      : null;

  String? _date(String? value) {
    final raw = value?.trim() ?? '';
    return RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(raw) &&
            DateTime.tryParse(raw) != null
        ? null
        : AppLocalizations.of(context)!.managementFieldInvalid;
  }

  void _submit() {
    if (!_formKey.currentState!.validate() || _target == null) return;
    Navigator.pop(
      context,
      InvoiceCreateInput(
        rentalRequestId: _target!.rentalRequestId,
        description: _description.text.trim(),
        amount: _amount.text.trim(),
        issueDate: _issueDate.text.trim(),
        dueDate: _dueDate.text.trim(),
        status: _status,
      ),
    );
  }
}

final class _InvoiceTable extends StatelessWidget {
  const _InvoiceTable({required this.items, required this.onPay});

  final List<InvoiceRecord> items;
  final ValueChanged<InvoiceRecord> onPay;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      key: const Key('invoices-table'),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: [
            DataColumn(label: Text(strings.fieldInvoiceNumber)),
            DataColumn(label: Text(strings.fieldUnit)),
            DataColumn(label: Text(strings.fieldStatus)),
            DataColumn(label: Text(strings.invoiceTotalAmount)),
            DataColumn(label: Text(strings.invoicePaidAmount)),
            DataColumn(label: Text(strings.fieldDueDate)),
            DataColumn(label: Text(strings.invoicePaymentAction)),
          ],
          rows: [
            for (final invoice in items)
              DataRow(
                cells: [
                  DataCell(Text(invoice.number)),
                  DataCell(Text(invoice.unitNumber)),
                  DataCell(
                    Text(localizedInvoiceStatus(strings, invoice.status)),
                  ),
                  DataCell(
                    Text(formatMoney(invoice.currency, invoice.totalAmount)),
                  ),
                  DataCell(
                    Text(formatMoney(invoice.currency, invoice.paidAmount)),
                  ),
                  DataCell(Text(_formatDate(context, invoice.dueDate))),
                  DataCell(_PaymentButton(invoice: invoice, onPay: onPay)),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

final class _InvoiceCards extends StatelessWidget {
  const _InvoiceCards({required this.items, required this.onPay});

  final List<InvoiceRecord> items;
  final ValueChanged<InvoiceRecord> onPay;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const Key('invoices-cards'),
      children: [
        for (final invoice in items)
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
                            invoice.number,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                        Chip(
                          label: Text(
                            localizedInvoiceStatus(strings, invoice.status),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _Detail(strings.fieldUnit, invoice.unitNumber),
                    _Detail(
                      strings.invoiceTotalAmount,
                      formatMoney(invoice.currency, invoice.totalAmount),
                    ),
                    _Detail(
                      strings.invoicePaidAmount,
                      formatMoney(invoice.currency, invoice.paidAmount),
                    ),
                    _Detail(
                      strings.fieldDueDate,
                      _formatDate(context, invoice.dueDate),
                    ),
                    if (invoice.paymentUrl != null) ...[
                      const SizedBox(height: 12),
                      Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: _PaymentButton(invoice: invoice, onPay: onPay),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

final class _Detail extends StatelessWidget {
  const _Detail(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: Text(label)),
        const SizedBox(width: 12),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
      ],
    ),
  );
}

final class _PaymentButton extends StatelessWidget {
  const _PaymentButton({required this.invoice, required this.onPay});

  final InvoiceRecord invoice;
  final ValueChanged<InvoiceRecord> onPay;

  @override
  Widget build(BuildContext context) {
    if (invoice.paymentUrl == null) return const SizedBox.shrink();
    return FilledButton.tonalIcon(
      key: Key('pay-${invoice.id}'),
      onPressed: () => onPay(invoice),
      icon: const Icon(Icons.open_in_new, size: 18),
      label: Text(AppLocalizations.of(context)!.invoiceOpenPayment),
    );
  }
}

final class _InvoiceError extends StatelessWidget {
  const _InvoiceError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(strings.errorTitle),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: Text(strings.actionRetry)),
        ],
      ),
    );
  }
}

String _formatDate(BuildContext context, String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  return DateFormat.yMMMd(
    Localizations.localeOf(context).toLanguageTag(),
  ).format(date);
}
