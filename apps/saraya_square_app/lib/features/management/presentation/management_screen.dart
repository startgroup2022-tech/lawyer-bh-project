import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/management_controller.dart';
import 'package:saraya_square_app/features/management/presentation/resource_definition.dart';
import 'package:saraya_square_app/features/management/presentation/widgets/resource_cards.dart';
import 'package:saraya_square_app/features/management/presentation/widgets/resource_form_sheet.dart';
import 'package:saraya_square_app/features/management/presentation/widgets/resource_table.dart';
import 'package:saraya_square_app/features/management/presentation/widgets/owner_onboarding_sheet.dart';
import 'package:saraya_square_app/features/management/presentation/widgets/tenant_onboarding_sheet.dart';

final class ManagementRouteView extends StatefulWidget {
  const ManagementRouteView({
    required this.repository,
    required this.resources,
    required this.propertyId,
    required this.role,
    this.onboardingRepository = const EmptyClientOnboardingRepository(),
    super.key,
  });

  final ManagementRepository repository;
  final List<ManagementResource> resources;
  final String propertyId;
  final AppRole role;
  final ClientOnboardingRepository onboardingRepository;

  @override
  State<ManagementRouteView> createState() => _ManagementRouteViewState();
}

final class _ManagementRouteViewState extends State<ManagementRouteView> {
  late ManagementResource _selected = widget.resources.first;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      children: [
        if (widget.resources.length > 1)
          Material(
            color: Theme.of(context).colorScheme.surface,
            child: SegmentedButton<ManagementResource>(
              segments: [
                ButtonSegment(
                  value: ManagementResource.tenants,
                  label: Text(strings.managementTenantsTab),
                  icon: const Icon(Icons.business_outlined),
                ),
                ButtonSegment(
                  value: ManagementResource.owners,
                  label: Text(strings.managementOwnersTab),
                  icon: const Icon(Icons.person_outline),
                ),
              ],
              selected: {_selected},
              onSelectionChanged: (selection) =>
                  setState(() => _selected = selection.single),
            ),
          ),
        Expanded(
          child: ManagementScreen(
            key: ValueKey(_selected),
            controller: ManagementController(
              widget.repository,
              resource: _selected,
            ),
            resource: _selected,
            propertyId: widget.propertyId,
            role: widget.role,
            onboardingRepository: widget.onboardingRepository,
            disposeController: true,
          ),
        ),
      ],
    );
  }
}

final class ManagementScreen extends StatefulWidget {
  const ManagementScreen({
    required this.controller,
    required this.resource,
    required this.propertyId,
    required this.role,
    this.onboardingRepository = const EmptyClientOnboardingRepository(),
    this.disposeController = false,
    super.key,
  });

  final ManagementController controller;
  final ManagementResource resource;
  final String propertyId;
  final AppRole role;
  final ClientOnboardingRepository onboardingRepository;
  final bool disposeController;

  @override
  State<ManagementScreen> createState() => _ManagementScreenState();
}

final class _ManagementScreenState extends State<ManagementScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.load(widget.propertyId);
  }

  @override
  void dispose() {
    if (widget.disposeController) widget.controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final definition = resourceDefinition(widget.resource, strings, isArabic);
    if (!canViewManagementResource(widget.role, widget.resource)) {
      return Center(child: Text(strings.managementNoPermission));
    }
    return Material(
      color: Colors.transparent,
      child: AnimatedBuilder(
        animation: widget.controller,
        builder: (context, _) => RefreshIndicator(
          onRefresh: widget.controller.refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              _Toolbar(
                definition: definition,
                resource: widget.resource,
                controller: widget.controller,
                canCreate: canCreateManagementResource(
                  widget.role,
                  widget.resource,
                ),
                onCreate: () => _openForm(definition),
              ),
              if (widget.resource == ManagementResource.owners) ...[
                const SizedBox(height: 14),
                Card(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: ListTile(
                    leading: const Icon(Icons.info_outline),
                    title: Text(strings.managementOwnerArchiveUnavailable),
                    subtitle: Text(strings.managementOwnerArchiveExplanation),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (widget.controller.isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(48),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (widget.controller.loadError != null &&
                  widget.controller.items.isEmpty)
                _ErrorState(onRetry: widget.controller.refresh)
              else if (widget.controller.items.isEmpty)
                _EmptyState(definition: definition)
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final canEdit = canEditManagementResource(
                      widget.role,
                      widget.resource,
                    );
                    final canDeactivate = canDeactivateManagementResource(
                      widget.role,
                      widget.resource,
                    );
                    if (SarayaBreakpoints.isCompact(constraints.maxWidth)) {
                      return ResourceCards(
                        definition: definition,
                        items: widget.controller.items,
                        canEdit: canEdit,
                        canDeactivate: canDeactivate,
                        onEdit: (item) => _openForm(definition, item),
                        onDeactivate: _confirmDeactivate,
                      );
                    }
                    return ResourceTable(
                      definition: definition,
                      items: widget.controller.items,
                      canEdit: canEdit,
                      canDeactivate: canDeactivate,
                      onEdit: (item) => _openForm(definition, item),
                      onDeactivate: _confirmDeactivate,
                    );
                  },
                ),
              if (widget.controller.nextCursor != null) ...[
                const SizedBox(height: 14),
                Center(
                  child: OutlinedButton.icon(
                    onPressed: widget.controller.isRefreshing
                        ? null
                        : widget.controller.loadMore,
                    icon: const Icon(Icons.expand_more),
                    label: Text(strings.managementLoadMore),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openForm(
    ResourceDefinition definition, [
    ManagementRecord? item,
  ]) async {
    final saved =
        item == null &&
            widget.onboardingRepository is! EmptyClientOnboardingRepository
        ? switch (widget.resource) {
            ManagementResource.tenants => showTenantOnboardingSheet(
              context: context,
              repository: widget.onboardingRepository,
            ),
            ManagementResource.owners => showOwnerOnboardingSheet(
              context: context,
              repository: widget.onboardingRepository,
            ),
            _ => showResourceFormSheet(
              context: context,
              controller: widget.controller,
              resource: widget.resource,
              definition: definition,
              existing: item,
            ),
          }
        : showResourceFormSheet(
            context: context,
            controller: widget.controller,
            resource: widget.resource,
            definition: definition,
            existing: item,
          );
    final completed = await saved;
    if (completed == true && mounted) {
      await widget.controller.refresh();
    }
    if (completed == true && mounted && Scaffold.maybeOf(context) != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            AppLocalizations.of(context)!.managementSavedConfirmation,
          ),
        ),
      );
    }
  }

  Future<void> _confirmDeactivate(ManagementRecord item) async {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.managementDeactivateTitle),
        content: Text(
          strings.managementDeactivateMessage(item.displayName(isArabic)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(strings.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(strings.managementDeactivate),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final deactivated = await widget.controller.deactivate(item.id);
    if (deactivated && mounted && Scaffold.maybeOf(context) != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(strings.managementDeactivatedConfirmation)),
      );
    }
  }
}

final class _Toolbar extends StatelessWidget {
  const _Toolbar({
    required this.definition,
    required this.resource,
    required this.controller,
    required this.canCreate,
    required this.onCreate,
  });

  final ResourceDefinition definition;
  final ManagementResource resource;
  final ManagementController controller;
  final bool canCreate;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        SizedBox(
          width: 300,
          child: TextField(
            key: const Key('management-search'),
            textInputAction: TextInputAction.search,
            onSubmitted: controller.search,
            decoration: InputDecoration(
              hintText: strings.managementSearchHint,
              prefixIcon: const Icon(Icons.search),
            ),
          ),
        ),
        if (definition.filters.isNotEmpty)
          PopupMenuButton<String?>(
            key: const Key('management-filter'),
            tooltip: strings.actionFilter,
            icon: const Icon(Icons.filter_list),
            onSelected: controller.filter,
            itemBuilder: (context) => [
              for (final option in definition.filters)
                PopupMenuItem(value: option.value, child: Text(option.label)),
            ],
          ),
        if (canCreate)
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: Text(definition.addLabel),
          ),
        if (controller.isRefreshing)
          const SizedBox.square(
            dimension: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
      ],
    );
  }
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.definition});

  final ResourceDefinition definition;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, size: 48),
          const SizedBox(height: 14),
          Text(
            definition.emptyTitle,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(strings.managementEmptyAction, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

final class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Column(
        children: [
          Text(
            strings.errorTitle,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(strings.errorDescription, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          OutlinedButton(onPressed: onRetry, child: Text(strings.actionRetry)),
        ],
      ),
    );
  }
}
