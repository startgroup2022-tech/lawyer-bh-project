import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/rental_requests/domain/rental_request.dart';

final class RentalRequestsScreen extends StatefulWidget {
  const RentalRequestsScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    this.documentSaver = const EmptyRentalRequestDocumentSaver(),
    super.key,
  });

  final RentalRequestRepository repository;
  final RentalRequestDocumentSaver documentSaver;
  final String propertyId;
  final AppRole role;

  @override
  State<RentalRequestsScreen> createState() => _RentalRequestsScreenState();
}

final class _RentalRequestsScreenState extends State<RentalRequestsScreen> {
  final Map<String, String> _keys = {};
  List<RentalRequestQueueItem> _items = const [];
  Object? _error;
  bool _loading = true;
  bool _loadingMore = false;
  String? _nextCursor;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool reset = true}) async {
    if (!reset && (_loadingMore || _nextCursor == null)) return;
    if (!reset) setState(() => _loadingMore = true);
    try {
      final page = await widget.repository.list(
        widget.propertyId,
        cursor: reset ? null : _nextCursor,
      );
      if (mounted) {
        setState(() {
          _items = reset ? page.items : [..._items, ...page.items];
          _nextCursor = page.nextCursor;
          _error = null;
          _loading = false;
          _loadingMore = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: () => _load(),
      child: ListView(
        key: const Key('rental-request-queue'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            strings.rentalQueueTitle,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          if (_error != null)
            _StateCard(
              icon: Icons.error_outline,
              message: strings.rentalQueueLoadFailed,
            )
          else if (_items.isEmpty)
            _StateCard(
              icon: Icons.inbox_outlined,
              message: strings.rentalQueueEmpty,
            )
          else
            for (final item in _items) ...[
              _RequestCard(
                item: item,
                onApprove: item.canApprove ? () => _approve(item) : null,
                onReject: item.canApprove ? () => _reject(item) : null,
                onVerify: item.canVerifyOfflinePayment
                    ? () => _verify(item, true)
                    : null,
                onRejectPayment: item.canVerifyOfflinePayment
                    ? () => _verify(item, false)
                    : null,
                onDownloadIdentity: item.canDownloadIdentityDocument
                    ? () => _download(item, RentalRequestDocumentKind.identity)
                    : null,
                onDownloadPaymentProof: item.canDownloadPaymentProof
                    ? () => _download(
                        item,
                        RentalRequestDocumentKind.paymentProof,
                      )
                    : null,
              ),
              const SizedBox(height: 12),
            ],
          if (_nextCursor != null)
            Center(
              child: OutlinedButton(
                key: const Key('rental-load-more'),
                onPressed: _loadingMore ? null : () => _load(reset: false),
                child: _loadingMore
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(strings.rentalLoadMore),
              ),
            ),
        ],
      ),
    );
  }

  String _key(String target, String action) => _keys.putIfAbsent(
    '$target:$action',
    () => '$action-$target-${DateTime.now().microsecondsSinceEpoch}',
  );

  Future<void> _approve(RentalRequestQueueItem item) async {
    final strings = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.rentalConfirmApprovalTitle),
        content: Text(strings.rentalConfirmApprovalBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(strings.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(strings.rentalApprove),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _mutate(
      () => widget.repository.decide(
        widget.propertyId,
        item.id,
        approve: true,
        idempotencyKey: _key(item.id, 'approve'),
      ),
    );
  }

  Future<void> _reject(RentalRequestQueueItem item) async {
    final strings = AppLocalizations.of(context)!;
    final controller = TextEditingController();
    String? error;
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(strings.rentalReject),
          content: TextField(
            key: const Key('rental-rejection-reason'),
            controller: controller,
            decoration: InputDecoration(
              labelText: strings.rentalRejectionReason,
              errorText: error,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(strings.actionCancel),
            ),
            FilledButton(
              onPressed: () {
                final value = controller.text.trim();
                if (value.isEmpty) {
                  setDialogState(
                    () => error = strings.rentalRejectionReasonRequired,
                  );
                  return;
                }
                Navigator.pop(context, value);
              },
              child: Text(strings.rentalReject),
            ),
          ],
        ),
      ),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => controller.dispose());
    if (reason == null) return;
    await _mutate(
      () => widget.repository.decide(
        widget.propertyId,
        item.id,
        approve: false,
        reason: reason,
        idempotencyKey: _key(item.id, 'reject'),
      ),
    );
  }

  Future<void> _verify(RentalRequestQueueItem item, bool approve) async {
    final strings = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          approve
              ? strings.rentalConfirmPaymentTitle
              : strings.rentalRejectPayment,
        ),
        content: Text(strings.rentalConfirmPaymentBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(strings.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              approve
                  ? strings.rentalVerifyPayment
                  : strings.rentalRejectPayment,
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || item.demandId == null) return;
    await _mutate(
      () => widget.repository.decideOffline(
        item.demandId!,
        approve: approve,
        failureCode: approve ? null : 'REJECTED_BY_REVIEWER',
        idempotencyKey: _key(
          item.demandId!,
          approve ? 'verify' : 'reject-payment',
        ),
      ),
    );
  }

  Future<void> _download(
    RentalRequestQueueItem item,
    RentalRequestDocumentKind kind,
  ) async {
    final strings = AppLocalizations.of(context)!;
    try {
      final document = await widget.repository.downloadDocument(
        widget.propertyId,
        item.id,
        kind,
      );
      await widget.documentSaver.save(document);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(strings.rentalDocumentDownloaded)),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.rentalActionFailed)));
      }
    }
  }

  Future<void> _mutate(Future<void> Function() action) async {
    final strings = AppLocalizations.of(context)!;
    try {
      await action();
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.rentalActionSucceeded)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(strings.rentalActionFailed)));
      }
    }
  }
}

final class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.item,
    this.onApprove,
    this.onReject,
    this.onVerify,
    this.onRejectPayment,
    this.onDownloadIdentity,
    this.onDownloadPaymentProof,
  });
  final RentalRequestQueueItem item;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;
  final VoidCallback? onVerify;
  final VoidCallback? onRejectPayment;
  final VoidCallback? onDownloadIdentity;
  final VoidCallback? onDownloadPaymentProof;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              runSpacing: 8,
              children: [
                Text(
                  item.unitNumber,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                Chip(label: Text(item.status.replaceAll('_', ' '))),
              ],
            ),
            const SizedBox(height: 8),
            Text('${strings.rentalApplicant}: ${item.applicantDisplayName}'),
            Text(
              '${strings.rentalRequestedDates}: ${item.startDate} — ${item.endDate}',
            ),
            Text(
              '${strings.rentalPriceSnapshot}: ${item.rentAmount} + ${item.depositAmount} + ${item.feeAmount} ${item.currency}',
            ),
            Text(
              '${strings.rentalApprovalMode}: ${item.approvalMode == 'instant' ? strings.rentalApprovalInstant : strings.rentalApprovalOwnerReview}',
            ),
            Text('${strings.rentalPaymentState}: ${item.paymentState ?? '—'}'),
            if (item.timeline.isNotEmpty)
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: Text(strings.rentalTimeline),
                children: [
                  for (final event in item.timeline)
                    ListTile(
                      dense: true,
                      title: Text(event.event),
                      subtitle: Text(event.occurredAt),
                    ),
                ],
              ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (onApprove != null)
                  FilledButton(
                    key: Key('approve-request-${item.id}'),
                    onPressed: onApprove,
                    child: Text(strings.rentalApprove),
                  ),
                if (onReject != null)
                  OutlinedButton(
                    key: Key('reject-request-${item.id}'),
                    onPressed: onReject,
                    child: Text(strings.rentalReject),
                  ),
                if (onVerify != null)
                  FilledButton.tonal(
                    key: Key('verify-payment-${item.demandId}'),
                    onPressed: onVerify,
                    child: Text(strings.rentalVerifyPayment),
                  ),
                if (onRejectPayment != null)
                  OutlinedButton(
                    key: Key('reject-payment-${item.demandId}'),
                    onPressed: onRejectPayment,
                    child: Text(strings.rentalRejectPayment),
                  ),
                if (onDownloadIdentity != null)
                  TextButton.icon(
                    key: Key('download-identity-${item.id}'),
                    onPressed: onDownloadIdentity,
                    icon: const Icon(Icons.download_outlined),
                    label: Text(strings.rentalDownloadIdentityDocument),
                  ),
                if (onDownloadPaymentProof != null)
                  TextButton.icon(
                    key: Key('download-payment-proof-${item.id}'),
                    onPressed: onDownloadPaymentProof,
                    icon: const Icon(Icons.receipt_long_outlined),
                    label: Text(strings.rentalDownloadPaymentProof),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

final class _StateCard extends StatelessWidget {
  const _StateCard({required this.icon, required this.message});
  final IconData icon;
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 64),
    child: Column(
      children: [
        Icon(icon, size: 44),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
      ],
    ),
  );
}
