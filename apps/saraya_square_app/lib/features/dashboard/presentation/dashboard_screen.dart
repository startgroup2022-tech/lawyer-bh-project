import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/core/widgets/async_content.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';
import 'package:saraya_square_app/features/dashboard/presentation/dashboard_controller.dart';
import 'package:saraya_square_app/features/dashboard/presentation/widgets/attention_panel.dart';
import 'package:saraya_square_app/features/dashboard/presentation/widgets/summary_card.dart';

final class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    required this.controller,
    required this.propertyId,
    required this.propertyName,
    required this.displayName,
    required this.role,
    required this.onNavigate,
    this.disposeController = false,
    super.key,
  });

  final DashboardController controller;
  final String propertyId;
  final String propertyName;
  final String displayName;
  final AppRole role;
  final ValueChanged<String> onNavigate;
  final bool disposeController;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

final class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.load(widget.propertyId);
  }

  @override
  void didUpdateWidget(DashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.propertyId != widget.propertyId ||
        oldWidget.controller != widget.controller) {
      widget.controller.load(widget.propertyId);
    }
  }

  @override
  void dispose() {
    if (widget.disposeController) widget.controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) => switch (widget.controller.state) {
        DashboardLoading() => AsyncContent<DashboardSummary>.loading(
          builder: _buildDashboard,
        ),
        DashboardFailure() => AsyncContent<DashboardSummary>.error(
          onRetry: () => widget.controller.load(widget.propertyId),
          builder: _buildDashboard,
        ),
        DashboardLoaded(:final summary) => AsyncContent.data(
          data: summary,
          builder: _buildDashboard,
        ),
      },
    );
  }

  Widget _buildDashboard(DashboardSummary summary) {
    final strings = AppLocalizations.of(context)!;
    final attentionItems = _attentionItems(strings, summary);
    final quickActions = _quickActions(strings);
    return RefreshIndicator(
      onRefresh: () => widget.controller.load(widget.propertyId),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final horizontalPadding = constraints.maxWidth < 700 ? 16.0 : 28.0;
          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.fromLTRB(
              horizontalPadding,
              24,
              horizontalPadding,
              32,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1240),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      strings.dashboardGreeting(widget.displayName),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strings.dashboardPropertyContext(widget.propertyName),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: SarayaColors.mutedInk,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _SummaryGrid(summary: summary),
                    if (attentionItems.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      AttentionPanel(
                        key: const Key('dashboard-attention-panel'),
                        title: strings.dashboardAttentionTitle,
                        items: attentionItems,
                      ),
                    ],
                    if (quickActions.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Text(
                        strings.dashboardQuickActionsTitle,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Wrap(spacing: 12, runSpacing: 12, children: quickActions),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  List<AttentionItem> _attentionItems(
    AppLocalizations strings,
    DashboardSummary summary,
  ) {
    return [
      if (summary.pendingRequests > 0)
        AttentionItem(
          key: const Key('attention-pending-requests'),
          icon: Icons.assignment_outlined,
          label: strings.dashboardPendingAttention,
          value: summary.pendingRequests.toString(),
        ),
      if (_isPositiveMoney(summary.dueAmount))
        AttentionItem(
          key: const Key('attention-due-amount'),
          icon: Icons.receipt_long_outlined,
          label: strings.dashboardDueAttention,
          value: _formatMoney(summary.currencyCode, summary.dueAmount),
        ),
      if (_isPositiveMoney(summary.overdueAmount))
        AttentionItem(
          key: const Key('attention-overdue-amount'),
          icon: Icons.warning_amber_rounded,
          label: strings.dashboardOverdueAttention,
          value: _formatMoney(summary.currencyCode, summary.overdueAmount),
          isDanger: true,
        ),
    ];
  }

  List<Widget> _quickActions(AppLocalizations strings) {
    final actions = <Widget>[];
    if ({
      AppRole.superAdmin,
      AppRole.propertyManager,
      AppRole.owner,
    }.contains(widget.role)) {
      actions.add(
        _QuickAction(
          key: const Key('quick-action-units'),
          icon: Icons.apartment_outlined,
          label: strings.dashboardQuickUnits,
          onPressed: () => widget.onNavigate('/units'),
        ),
      );
    }
    if ({
      AppRole.superAdmin,
      AppRole.propertyManager,
      AppRole.accountant,
      AppRole.owner,
      AppRole.tenant,
    }.contains(widget.role)) {
      actions.add(
        _QuickAction(
          key: const Key('quick-action-invoices'),
          icon: Icons.receipt_long_outlined,
          label: strings.dashboardQuickInvoices,
          onPressed: () => widget.onNavigate('/invoices'),
        ),
      );
    }
    if ({
      AppRole.superAdmin,
      AppRole.propertyManager,
      AppRole.maintenance,
      AppRole.tenant,
    }.contains(widget.role)) {
      actions.add(
        _QuickAction(
          key: const Key('quick-action-maintenance'),
          icon: Icons.build_outlined,
          label: strings.dashboardQuickMaintenance,
          onPressed: () => widget.onNavigate('/maintenance'),
        ),
      );
    }
    return actions;
  }
}

final class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.summary});

  final DashboardSummary summary;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final cards = [
      SummaryCard(
        key: const Key('summary-occupied'),
        label: strings.dashboardOccupiedUnits,
        value: summary.occupiedUnits.toString(),
        icon: Icons.business_rounded,
      ),
      SummaryCard(
        key: const Key('summary-vacant'),
        label: strings.dashboardVacantUnits,
        value: summary.vacantUnits.toString(),
        icon: Icons.meeting_room_outlined,
      ),
      SummaryCard(
        key: const Key('summary-tenants'),
        label: strings.dashboardTenants,
        value: summary.tenantCount.toString(),
        icon: Icons.groups_outlined,
      ),
      SummaryCard(
        key: const Key('summary-pending'),
        label: strings.dashboardPendingRequests,
        value: summary.pendingRequests.toString(),
        icon: Icons.pending_actions_outlined,
      ),
      SummaryCard(
        key: const Key('summary-due'),
        label: strings.dashboardDueAmount,
        value: _formatMoney(summary.currencyCode, summary.dueAmount),
        icon: Icons.schedule_outlined,
      ),
      SummaryCard(
        key: const Key('summary-paid'),
        label: strings.dashboardPaidAmount,
        value: _formatMoney(summary.currencyCode, summary.paidAmount),
        icon: Icons.task_alt_outlined,
      ),
      SummaryCard(
        key: const Key('summary-overdue'),
        label: strings.dashboardOverdueAmount,
        value: _formatMoney(summary.currencyCode, summary.overdueAmount),
        icon: Icons.warning_amber_rounded,
        isDanger: _isPositiveMoney(summary.overdueAmount),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 960
            ? 4
            : constraints.maxWidth >= 320
            ? 2
            : 1;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: cards.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: 128,
          ),
          itemBuilder: (context, index) => cards[index],
        );
      },
    );
  }
}

final class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onPressed,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
    );
  }
}

bool _isPositiveMoney(String value) {
  return value.runes.any((character) => character >= 49 && character <= 57);
}

String _formatMoney(String currencyCode, String value) {
  final parts = value.split('.');
  final whole = parts.first.replaceFirst(RegExp(r'^0+(?=\d)'), '');
  final fraction = parts.length == 1 ? '' : parts[1];
  final padded = '${fraction}0000';
  var minorUnits = BigInt.parse(whole) * BigInt.from(1000);
  minorUnits += BigInt.parse(padded.substring(0, 3));
  if (int.parse(padded[3]) >= 5) minorUnits += BigInt.one;
  final roundedWhole = (minorUnits ~/ BigInt.from(1000)).toString();
  final roundedFraction = (minorUnits % BigInt.from(1000)).toString().padLeft(
    3,
    '0',
  );
  final groupedWhole = roundedWhole.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '$currencyCode $groupedWhole.$roundedFraction';
}
