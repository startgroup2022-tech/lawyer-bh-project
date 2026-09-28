import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';

enum AppRole {
  superAdmin,
  propertyManager,
  accountant,
  maintenance,
  owner,
  tenant,
  visitor,
}

enum AppCapability {
  viewDashboard,
  manageProperties,
  manageUnits,
  manageClients,
  manageVirtualAddresses,
  manageMeetingRooms,
  manageViewings,
  manageRentalRequests,
  manageLeases,
  manageInvoices,
  manageMaintenance,
  manageDocuments,
  viewReports,
  manageTeam,
  viewAccount,
}

final class AppShell extends StatelessWidget {
  const AppShell({
    required this.role,
    required this.selectedPath,
    required this.onNavigate,
    required this.title,
    required this.child,
    this.actions = const [],
    this.capabilities,
    super.key,
  });

  final AppRole role;
  final Set<AppCapability>? capabilities;
  final String selectedPath;
  final ValueChanged<String> onNavigate;
  final Widget title;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final roleCapabilities = capabilitiesForRole(role);
    final allowed = capabilities == null
        ? roleCapabilities
        : roleCapabilities.intersection(capabilities!);
    final destinations = _destinations
        .where((destination) => allowed.contains(destination.capability))
        .toList(growable: false);

    return LayoutBuilder(
      builder: (context, constraints) {
        if (SarayaBreakpoints.isExpanded(constraints.maxWidth)) {
          return _ExpandedShell(
            role: role,
            destinations: destinations,
            selectedPath: selectedPath,
            onNavigate: onNavigate,
            title: title,
            actions: actions,
            child: child,
          );
        }
        if (!SarayaBreakpoints.isCompact(constraints.maxWidth)) {
          return _MediumShell(
            destinations: destinations,
            selectedPath: selectedPath,
            onNavigate: onNavigate,
            title: title,
            actions: actions,
            child: child,
          );
        }
        return _CompactShell(
          destinations: destinations,
          selectedPath: selectedPath,
          onNavigate: onNavigate,
          title: title,
          actions: actions,
          child: child,
        );
      },
    );
  }
}

final class _ExpandedShell extends StatelessWidget {
  const _ExpandedShell({
    required this.role,
    required this.destinations,
    required this.selectedPath,
    required this.onNavigate,
    required this.title,
    required this.actions,
    required this.child,
  });

  final AppRole role;
  final List<_AppDestination> destinations;
  final String selectedPath;
  final ValueChanged<String> onNavigate;
  final Widget title;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          SizedBox(
            key: const Key('saraya-grouped-side-navigation'),
            width: 288,
            child: _GroupedSideNavigation(
              role: role,
              destinations: destinations,
              selectedPath: selectedPath,
              onNavigate: onNavigate,
            ),
          ),
          Expanded(
            child: Column(
              children: [
                _ShellHeader(title: title, actions: actions),
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _MediumShell extends StatelessWidget {
  const _MediumShell({
    required this.destinations,
    required this.selectedPath,
    required this.onNavigate,
    required this.title,
    required this.actions,
    required this.child,
  });

  final List<_AppDestination> destinations;
  final String selectedPath;
  final ValueChanged<String> onNavigate;
  final Widget title;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          _CompactNavigationRail(
            key: const Key('saraya-compact-navigation-rail'),
            destinations: destinations,
            selectedPath: selectedPath,
            onNavigate: onNavigate,
          ),
          const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                _ShellHeader(title: title, actions: actions),
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _CompactShell extends StatelessWidget {
  const _CompactShell({
    required this.destinations,
    required this.selectedPath,
    required this.onNavigate,
    required this.title,
    required this.actions,
    required this.child,
  });

  final List<_AppDestination> destinations;
  final String selectedPath;
  final ValueChanged<String> onNavigate;
  final Widget title;
  final List<Widget> actions;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final mobileDestinations = _mobileDestinations(destinations);
    final selectedIndex = mobileDestinations.indexWhere(
      (destination) => destination.path == selectedPath,
    );
    return Scaffold(
      appBar: AppBar(title: title, actions: actions),
      body: child,
      bottomNavigationBar: NavigationBar(
        key: const Key('saraya-bottom-navigation'),
        selectedIndex: selectedIndex < 0 ? 0 : selectedIndex,
        onDestinationSelected: (index) {
          onNavigate(mobileDestinations[index].path);
        },
        destinations: [
          for (final destination in mobileDestinations)
            NavigationDestination(
              icon: Icon(destination.icon),
              selectedIcon: Icon(destination.selectedIcon),
              label: destination.label(AppLocalizations.of(context)!),
            ),
        ],
      ),
    );
  }
}

final class _ShellHeader extends StatelessWidget {
  const _ShellHeader({required this.title, required this.actions});

  final Widget title;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 76,
      padding: const EdgeInsetsDirectional.fromSTEB(28, 0, 20, 0),
      decoration: const BoxDecoration(
        color: SarayaColors.warmSurface,
        border: Border(bottom: BorderSide(color: SarayaColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: DefaultTextStyle.merge(
              style: Theme.of(context).textTheme.headlineSmall,
              child: title,
            ),
          ),
          ...actions,
        ],
      ),
    );
  }
}

final class _GroupedSideNavigation extends StatelessWidget {
  const _GroupedSideNavigation({
    required this.role,
    required this.destinations,
    required this.selectedPath,
    required this.onNavigate,
  });

  final AppRole role;
  final List<_AppDestination> destinations;
  final String selectedPath;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return ColoredBox(
      color: SarayaColors.deepGreen,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: SarayaColors.mutedGold,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    strings.appName,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: SarayaColors.white,
                      fontSize: 19,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (final section in _NavSection.values)
                    if (destinations.any(
                      (destination) => destination.section == section,
                    )) ...[
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          12,
                          16,
                          12,
                          7,
                        ),
                        child: Text(
                          section.label(strings),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: SarayaColors.white.withValues(
                                  alpha: 0.62,
                                ),
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.7,
                              ),
                        ),
                      ),
                      for (final destination in destinations.where(
                        (destination) => destination.section == section,
                      ))
                        _SideDestinationTile(
                          destination: destination,
                          selected: destination.path == selectedPath,
                          onTap: () => onNavigate(destination.path),
                        ),
                    ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 18,
                    backgroundColor: SarayaColors.green,
                    foregroundColor: SarayaColors.white,
                    child: Icon(Icons.person_outline, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _roleLabel(strings, role),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: SarayaColors.white,
                      ),
                    ),
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

final class _SideDestinationTile extends StatelessWidget {
  const _SideDestinationTile({
    required this.destination,
    required this.selected,
    required this.onTap,
  });

  final _AppDestination destination;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? SarayaColors.deepGreen : SarayaColors.white;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: selected ? SarayaColors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          focusColor: SarayaColors.mutedGold.withValues(alpha: 0.32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  Icon(
                    selected ? destination.selectedIcon : destination.icon,
                    color: foreground,
                    size: 21,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      destination.label(AppLocalizations.of(context)!),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: foreground,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                  if (selected)
                    Container(
                      width: 4,
                      height: 20,
                      decoration: BoxDecoration(
                        color: SarayaColors.mutedGold,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class _CompactNavigationRail extends StatelessWidget {
  const _CompactNavigationRail({
    required this.destinations,
    required this.selectedPath,
    required this.onNavigate,
    super.key,
  });

  final List<_AppDestination> destinations;
  final String selectedPath;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 80,
      child: ColoredBox(
        color: SarayaColors.white,
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 12),
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Icon(
                  Icons.apartment_rounded,
                  color: SarayaColors.deepGreen,
                  size: 30,
                ),
              ),
              for (final destination in destinations)
                Tooltip(
                  message: destination.label(AppLocalizations.of(context)!),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 3,
                    ),
                    child: IconButton.filledTonal(
                      isSelected: destination.path == selectedPath,
                      onPressed: () => onNavigate(destination.path),
                      icon: Icon(destination.icon),
                      selectedIcon: Icon(destination.selectedIcon),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _NavSection { portfolio, operations, finance, governance }

extension on _NavSection {
  String label(AppLocalizations strings) => switch (this) {
    _NavSection.portfolio => strings.sectionPortfolio,
    _NavSection.operations => strings.sectionOperations,
    _NavSection.finance => strings.sectionFinance,
    _NavSection.governance => strings.sectionGovernance,
  };
}

enum _NavLabel {
  overview,
  properties,
  units,
  clients,
  virtualAddresses,
  meetingRooms,
  viewings,
  rentalRequests,
  leases,
  invoices,
  maintenance,
  documents,
  reports,
  team,
  myAccount,
}

extension on _NavLabel {
  String resolve(AppLocalizations strings) => switch (this) {
    _NavLabel.overview => strings.navOverview,
    _NavLabel.properties => strings.navProperties,
    _NavLabel.units => strings.navUnits,
    _NavLabel.clients => strings.navClients,
    _NavLabel.virtualAddresses => strings.navVirtualAddresses,
    _NavLabel.meetingRooms => strings.navMeetingRooms,
    _NavLabel.viewings => strings.navViewings,
    _NavLabel.rentalRequests => strings.navRentalRequests,
    _NavLabel.leases => strings.navLeases,
    _NavLabel.invoices => strings.navInvoices,
    _NavLabel.maintenance => strings.navMaintenance,
    _NavLabel.documents => strings.navDocuments,
    _NavLabel.reports => strings.navReports,
    _NavLabel.team => strings.navTeam,
    _NavLabel.myAccount => strings.navMyAccount,
  };
}

final class _AppDestination {
  const _AppDestination({
    required this.path,
    required this.labelKey,
    required this.icon,
    required this.selectedIcon,
    required this.section,
    required this.capability,
    this.showOnMobile = false,
  });

  final String path;
  final _NavLabel labelKey;
  final IconData icon;
  final IconData selectedIcon;
  final _NavSection section;
  final AppCapability capability;
  final bool showOnMobile;

  String label(AppLocalizations strings) => labelKey.resolve(strings);
}

const _destinations = <_AppDestination>[
  _AppDestination(
    path: '/dashboard',
    labelKey: _NavLabel.overview,
    icon: Icons.space_dashboard_outlined,
    selectedIcon: Icons.space_dashboard_rounded,
    section: _NavSection.portfolio,
    capability: AppCapability.viewDashboard,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/properties',
    labelKey: _NavLabel.properties,
    icon: Icons.apartment_outlined,
    selectedIcon: Icons.apartment_rounded,
    section: _NavSection.portfolio,
    capability: AppCapability.manageProperties,
  ),
  _AppDestination(
    path: '/units',
    labelKey: _NavLabel.units,
    icon: Icons.domain_outlined,
    selectedIcon: Icons.domain_rounded,
    section: _NavSection.portfolio,
    capability: AppCapability.manageUnits,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/clients',
    labelKey: _NavLabel.clients,
    icon: Icons.groups_outlined,
    selectedIcon: Icons.groups_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageClients,
  ),
  _AppDestination(
    path: '/virtual-addresses',
    labelKey: _NavLabel.virtualAddresses,
    icon: Icons.markunread_mailbox_outlined,
    selectedIcon: Icons.markunread_mailbox_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageVirtualAddresses,
  ),
  _AppDestination(
    path: '/meeting-rooms',
    labelKey: _NavLabel.meetingRooms,
    icon: Icons.meeting_room_outlined,
    selectedIcon: Icons.meeting_room_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageMeetingRooms,
  ),
  _AppDestination(
    path: '/viewings',
    labelKey: _NavLabel.viewings,
    icon: Icons.event_available_outlined,
    selectedIcon: Icons.event_available_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageViewings,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/rental-requests',
    labelKey: _NavLabel.rentalRequests,
    icon: Icons.assignment_outlined,
    selectedIcon: Icons.assignment_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageRentalRequests,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/leases',
    labelKey: _NavLabel.leases,
    icon: Icons.description_outlined,
    selectedIcon: Icons.description_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageLeases,
  ),
  _AppDestination(
    path: '/invoices',
    labelKey: _NavLabel.invoices,
    icon: Icons.receipt_long_outlined,
    selectedIcon: Icons.receipt_long_rounded,
    section: _NavSection.finance,
    capability: AppCapability.manageInvoices,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/maintenance',
    labelKey: _NavLabel.maintenance,
    icon: Icons.build_outlined,
    selectedIcon: Icons.build_rounded,
    section: _NavSection.operations,
    capability: AppCapability.manageMaintenance,
    showOnMobile: true,
  ),
  _AppDestination(
    path: '/documents',
    labelKey: _NavLabel.documents,
    icon: Icons.folder_outlined,
    selectedIcon: Icons.folder_rounded,
    section: _NavSection.governance,
    capability: AppCapability.manageDocuments,
  ),
  _AppDestination(
    path: '/reports',
    labelKey: _NavLabel.reports,
    icon: Icons.insights_outlined,
    selectedIcon: Icons.insights_rounded,
    section: _NavSection.finance,
    capability: AppCapability.viewReports,
  ),
  _AppDestination(
    path: '/team',
    labelKey: _NavLabel.team,
    icon: Icons.admin_panel_settings_outlined,
    selectedIcon: Icons.admin_panel_settings_rounded,
    section: _NavSection.governance,
    capability: AppCapability.manageTeam,
  ),
  _AppDestination(
    path: '/account',
    labelKey: _NavLabel.myAccount,
    icon: Icons.person_outline,
    selectedIcon: Icons.person,
    section: _NavSection.governance,
    capability: AppCapability.viewAccount,
    showOnMobile: true,
  ),
];

List<_AppDestination> _mobileDestinations(List<_AppDestination> destinations) {
  final preferred = destinations
      .where((destination) => destination.showOnMobile)
      .take(5)
      .toList(growable: false);
  return preferred.isEmpty
      ? destinations.take(5).toList(growable: false)
      : preferred;
}

bool roleHasCapability(AppRole role, AppCapability capability) =>
    capabilitiesForRole(role).contains(capability);

Set<AppCapability> capabilitiesForRole(AppRole role) => switch (role) {
  AppRole.superAdmin => AppCapability.values.toSet(),
  AppRole.propertyManager =>
    AppCapability.values
        .where((capability) => capability != AppCapability.manageTeam)
        .toSet(),
  AppRole.accountant => {
    AppCapability.viewDashboard,
    AppCapability.manageRentalRequests,
    AppCapability.manageInvoices,
    AppCapability.viewReports,
    AppCapability.viewAccount,
  },
  AppRole.maintenance => {
    AppCapability.viewDashboard,
    AppCapability.manageUnits,
    AppCapability.manageMaintenance,
    AppCapability.manageDocuments,
    AppCapability.viewAccount,
  },
  AppRole.owner => {
    AppCapability.viewDashboard,
    AppCapability.manageProperties,
    AppCapability.manageUnits,
    AppCapability.manageClients,
    AppCapability.manageRentalRequests,
    AppCapability.manageLeases,
    AppCapability.manageInvoices,
    AppCapability.manageDocuments,
    AppCapability.viewReports,
    AppCapability.viewAccount,
  },
  AppRole.tenant => {
    AppCapability.viewDashboard,
    AppCapability.manageLeases,
    AppCapability.manageInvoices,
    AppCapability.manageMaintenance,
    AppCapability.manageDocuments,
    AppCapability.viewAccount,
  },
  AppRole.visitor => {AppCapability.viewAccount},
};

String _roleLabel(AppLocalizations strings, AppRole role) => switch (role) {
  AppRole.superAdmin => strings.roleSuperAdmin,
  AppRole.propertyManager => strings.rolePropertyManager,
  AppRole.accountant => strings.roleAccountant,
  AppRole.maintenance => strings.roleMaintenance,
  AppRole.owner => strings.roleOwner,
  AppRole.tenant => strings.roleTenant,
  AppRole.visitor => strings.roleVisitor,
};
