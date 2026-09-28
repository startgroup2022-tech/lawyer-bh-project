import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/rental_document_saver.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';
import 'package:saraya_square_app/features/public_rental/presentation/rental_application_wizard.dart';
import 'package:url_launcher/url_launcher.dart';

typedef RentalUriLauncher = Future<bool> Function(Uri uri);

final class RentalStatusScreen extends StatefulWidget {
  const RentalStatusScreen({
    required this.requestId,
    required this.repository,
    required this.documentPicker,
    this.documentSaver = const EmptyRentalDocumentSaver(),
    required this.onBack,
    this.uriLauncher,
    super.key,
  });
  final String requestId;
  final PublicRentalRepository repository;
  final RentalDocumentPicker documentPicker;
  final RentalDocumentSaver documentSaver;
  final VoidCallback onBack;
  final RentalUriLauncher? uriLauncher;
  @override
  State<RentalStatusScreen> createState() => _RentalStatusScreenState();
}

final class _RentalStatusScreenState extends State<RentalStatusScreen>
    with WidgetsBindingObserver {
  final _reference = TextEditingController();
  final _legalName = TextEditingController();
  RentalApplication? _application;
  String? _error;
  bool _loading = true;
  bool _busy = false;
  bool _acceptChecksum = false;
  String? _onlineKey;
  String? _offlineKey;

  String _key(String action) =>
      'flutter-$action-${DateTime.now().microsecondsSinceEpoch}-${widget.requestId}';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _legalName.addListener(_legalNameChanged);
    _refresh();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  void _legalNameChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _legalName.removeListener(_legalNameChanged);
    _reference.dispose();
    _legalName.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final value = await widget.repository.status(widget.requestId);
      if (mounted) {
        setState(() {
          _application = value;
          if (value.paymentStatus == 'failed' ||
              value.paymentStatus == 'cancelled') {
            _onlineKey = null;
          }
        });
      }
    } on ApiError catch (error) {
      if (mounted) setState(() => _error = _localizedError(error));
    } on Object {
      if (mounted) {
        setState(() => _error = AppLocalizations.of(context)!.errorDescription);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: widget.onBack,
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
        ),
        title: Text(strings.rentalStatusTitle),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            key: const Key('rental-status-scroll'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 900),
                  child: _loading && _application == null
                      ? const Padding(
                          padding: EdgeInsets.all(48),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : _error != null && _application == null
                      ? _ErrorCard(message: _error!, onRetry: _refresh)
                      : _content(_application!),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _content(RentalApplication application) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: ListTile(
            leading: Icon(_statusIcon(application.status), size: 34),
            title: Text(
              _statusLabel(application.status),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            subtitle: Text(strings.rentalRefreshHint),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          strings.rentalTimelineTitle,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: application.timeline.isEmpty
                ? [ListTile(title: Text(_statusLabel(application.status)))]
                : application.timeline
                      .map(
                        (entry) => ListTile(
                          leading: const Icon(
                            Icons.check_circle_outline_rounded,
                          ),
                          title: Text(_timelineLabel(entry)),
                          subtitle: Text(entry.occurredAt),
                        ),
                      )
                      .toList(),
          ),
        ),
        if (application.status ==
            RentalApplicationStatus.approvedAwaitingPayment) ...[
          const SizedBox(height: 16),
          _paymentCard(application),
        ],
        if (application.status ==
                RentalApplicationStatus.paidAwaitingSignature ||
            application.status == RentalApplicationStatus.completed) ...[
          const SizedBox(height: 16),
          _leaseCard(application),
        ],
        if (_error case final error?) ...[
          const SizedBox(height: 12),
          Text(
            error,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }

  Widget _paymentCard(RentalApplication application) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.rentalPaymentTitle,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (application.totalAmount case final amount?) ...[
              const SizedBox(height: 6),
              Text(
                '$amount ${application.currency ?? ''}',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const Key('rental-pay-online'),
              onPressed: _busy ? null : () => _payOnline(application),
              icon: const Icon(Icons.lock_rounded),
              label: Text(strings.rentalPayOnline),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('offline-reference'),
              controller: _reference,
              decoration: InputDecoration(
                labelText: strings.rentalPaymentReference,
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              key: const Key('rental-pay-offline'),
              onPressed: _busy || application.paymentDemandId == null
                  ? null
                  : () => _payOffline(application),
              icon: const Icon(Icons.receipt_long_outlined),
              label: Text(strings.rentalPayOffline),
            ),
          ],
        ),
      ),
    );
  }

  Widget _leaseCard(RentalApplication application) {
    final strings = AppLocalizations.of(context)!;
    final lease = application.lease;
    if (lease == null) {
      return _ErrorCard(message: strings.errorDescription, onRetry: _refresh);
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              strings.rentalLeaseTitle,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Text(strings.rentalLeaseChecksum),
            SelectableText(lease.checksum, key: const Key('lease-checksum')),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('lease-draft-open'),
              onPressed: !lease.documentAvailable || _busy
                  ? null
                  : () => _downloadLease(lease),
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: Text(strings.rentalLeaseDraft),
            ),
            const SizedBox(height: 12),
            _SignatureProgress(
              label: strings.rentalTenantSignature,
              signed: lease.tenantSigned,
            ),
            _SignatureProgress(
              label: strings.rentalOwnerSignature,
              signed: lease.ownerSigned,
            ),
            if (!lease.tenantSigned) ...[
              const Divider(height: 28),
              TextField(
                key: const Key('lease-legal-name'),
                controller: _legalName,
                decoration: InputDecoration(labelText: strings.rentalLegalName),
              ),
              CheckboxListTile(
                key: const Key('lease-checksum-accept'),
                contentPadding: EdgeInsets.zero,
                value: _acceptChecksum,
                onChanged: _busy
                    ? null
                    : (value) =>
                          setState(() => _acceptChecksum = value == true),
                title: Text(strings.rentalAcceptChecksum),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              FilledButton(
                key: const Key('lease-sign'),
                onPressed:
                    _busy || !_acceptChecksum || _legalName.text.trim().isEmpty
                    ? null
                    : () => _sign(lease),
                child: Text(strings.actionSign),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _payOnline(RentalApplication application) async =>
      _run(() async {
        final session = await widget.repository.createOnlinePayment(
          application.id,
          idempotencyKey: _onlineKey ??= _key('online'),
        );
        await _open(session.paymentUrl);
      });

  Future<void> _downloadLease(RentalLeaseState lease) => _run(() async {
    final document = await widget.repository.downloadLeaseDocument(
      lease.id,
      finalVersion: lease.active && lease.finalDocumentAvailable,
    );
    await widget.documentSaver.save(document);
  });

  Future<void> _payOffline(RentalApplication application) async {
    if (_reference.text.trim().isEmpty) {
      return _setError(AppLocalizations.of(context)!.rentalActionFailed);
    }
    final document = await widget.documentPicker();
    if (document == null) return;
    await _run(() async {
      await widget.repository.submitOfflineProof(
        application.paymentDemandId!,
        document,
        _reference.text.trim(),
        idempotencyKey: _offlineKey ??= _key('offline'),
      );
      _offlineKey = null;
      await _refresh();
    });
  }

  Future<void> _sign(RentalLeaseState lease) async => _run(() async {
    await widget.repository.sign(
      lease.id,
      LeaseSignatureInput(
        acceptedName: _legalName.text.trim(),
        checksum: lease.checksum,
      ),
    );
    _application = await widget.repository.status(widget.requestId);
  });

  Future<void> _open(Uri uri) async {
    if (uri.scheme != 'https' || uri.host.isEmpty) {
      return _setError(AppLocalizations.of(context)!.rentalPaymentOpenFailed);
    }
    final opened =
        await (widget.uriLauncher?.call(uri) ??
            launchUrl(uri, mode: LaunchMode.platformDefault));
    if (!opened && mounted) {
      _setError(AppLocalizations.of(context)!.rentalPaymentOpenFailed);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiError catch (error) {
      if (mounted) _setError(_localizedError(error));
    } on Object {
      if (mounted) _setError(AppLocalizations.of(context)!.rentalActionFailed);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _localizedError(ApiError error) =>
      Localizations.localeOf(context).languageCode == 'ar'
      ? error.messageAr
      : error.messageEn;
  void _setError(String message) => setState(() => _error = message);

  String _statusLabel(RentalApplicationStatus status) {
    final strings = AppLocalizations.of(context)!;
    return switch (status) {
      RentalApplicationStatus.pendingOwnerReview =>
        strings.rentalStatusPendingOwner,
      RentalApplicationStatus.approvedAwaitingPayment =>
        strings.rentalStatusApprovedPayment,
      RentalApplicationStatus.rejected => strings.rentalStatusRejected,
      RentalApplicationStatus.paidAwaitingSignature =>
        strings.rentalStatusPaidSignature,
      RentalApplicationStatus.completed => strings.rentalStatusCompleted,
      RentalApplicationStatus.cancelled => strings.rentalStatusCancelled,
    };
  }

  String _timelineLabel(RentalTimelineEntry entry) {
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final serverLabel = isArabic ? entry.labelAr : entry.labelEn;
    if (serverLabel != null && serverLabel.isNotEmpty) return serverLabel;
    return switch (entry.code) {
      'submitted' => AppLocalizations.of(context)!.rentalSubmit,
      'owner_approved' || 'instant_approved' => AppLocalizations.of(
        context,
      )!.rentalStatusApprovedPayment,
      'payment_confirmed' => AppLocalizations.of(
        context,
      )!.rentalStatusPaidSignature,
      'tenant_signed' => AppLocalizations.of(context)!.rentalTenantSignature,
      'owner_signed' => AppLocalizations.of(context)!.rentalOwnerSignature,
      'activated' => AppLocalizations.of(context)!.rentalStatusCompleted,
      _ => entry.code.replaceAll('_', ' '),
    };
  }

  IconData _statusIcon(RentalApplicationStatus status) => switch (status) {
    RentalApplicationStatus.completed => Icons.verified_rounded,
    RentalApplicationStatus.rejected ||
    RentalApplicationStatus.cancelled => Icons.cancel_outlined,
    RentalApplicationStatus.pendingOwnerReview => Icons.schedule_rounded,
    RentalApplicationStatus.approvedAwaitingPayment => Icons.payments_outlined,
    RentalApplicationStatus.paidAwaitingSignature => Icons.draw_outlined,
  };
}

final class _SignatureProgress extends StatelessWidget {
  const _SignatureProgress({required this.label, required this.signed});
  final String label;
  final bool signed;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(signed ? Icons.check_circle_rounded : Icons.schedule_rounded),
    title: Text(label),
    trailing: Text(
      signed
          ? AppLocalizations.of(context)!.rentalSigned
          : AppLocalizations.of(context)!.rentalAwaitingSignature,
    ),
  );
}

final class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: onRetry,
            child: Text(AppLocalizations.of(context)!.actionRetry),
          ),
        ],
      ),
    ),
  );
}
