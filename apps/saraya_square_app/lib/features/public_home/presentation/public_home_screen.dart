import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_home/domain/public_home_inventory.dart';

final class PublicHomeScreen extends StatefulWidget {
  const PublicHomeScreen({
    required this.repository,
    required this.onLogin,
    required this.onLocaleChanged,
    this.onOpenUnit = _ignoreUnit,
    super.key,
  });

  final PublicHomeRepository repository;
  final VoidCallback onLogin;
  final ValueChanged<Locale> onLocaleChanged;
  final ValueChanged<String> onOpenUnit;

  @override
  State<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

final class _PublicHomeScreenState extends State<PublicHomeScreen> {
  late Future<PublicHomeInventory> _inventory = widget.repository.load();

  void _reload() {
    setState(() => _inventory = widget.repository.load());
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return Scaffold(
      body: SelectionArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              _PublicHeader(
                onLogin: widget.onLogin,
                onLocaleChanged: widget.onLocaleChanged,
                isArabic: isArabic,
              ),
              _Hero(strings: strings, onLogin: widget.onLogin),
              FutureBuilder<PublicHomeInventory>(
                future: _inventory,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 72),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (snapshot.hasError || !snapshot.hasData) {
                    return _LoadFailure(strings: strings, onRetry: _reload);
                  }
                  return _Inventory(
                    inventory: snapshot.data!,
                    strings: strings,
                    isArabic: isArabic,
                    onOpenUnit: widget.onOpenUnit,
                  );
                },
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
                child: Center(
                  child: Text(
                    strings.publicHomeFooter,
                    style: Theme.of(context).textTheme.bodySmall,
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

final class _PublicHeader extends StatelessWidget {
  const _PublicHeader({
    required this.onLogin,
    required this.onLocaleChanged,
    required this.isArabic,
  });

  final VoidCallback onLogin;
  final ValueChanged<Locale> onLocaleChanged;
  final bool isArabic;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return DecoratedBox(
      decoration: const BoxDecoration(color: SarayaColors.white),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 720;
              final localeButton = TextButton(
                onPressed: () =>
                    onLocaleChanged(Locale(isArabic ? 'en' : 'ar')),
                child: Text(isArabic ? 'EN' : 'عربي'),
              );
              final loginButton = FilledButton.icon(
                key: const Key('public-login'),
                style: FilledButton.styleFrom(
                  backgroundColor: SarayaColors.deepGreen,
                  foregroundColor: SarayaColors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 14,
                  ),
                ),
                onPressed: onLogin,
                icon: const Icon(Icons.login_rounded),
                label: Text(strings.publicHomeLogin),
              );

              if (isCompact) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        const Expanded(child: _SarayaBrand(compact: true)),
                        localeButton,
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: loginButton),
                  ],
                );
              }

              return Row(
                children: [
                  const Expanded(child: _SarayaBrand()),
                  localeButton,
                  const SizedBox(width: 8),
                  loginButton,
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

final class _SarayaBrand extends StatelessWidget {
  const _SarayaBrand({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final markSize = compact ? 46.0 : 52.0;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: markSize,
          height: markSize,
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: SarayaColors.deepGreen,
            borderRadius: BorderRadius.circular(compact ? 14 : 16),
            boxShadow: [
              BoxShadow(
                color: SarayaColors.deepGreen.withValues(alpha: 0.16),
                blurRadius: 14,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Image.asset(
            'assets/branding/saraya-gateway.png',
            key: const Key('public-brand-logo'),
            color: SarayaColors.mutedGold,
            fit: BoxFit.contain,
            semanticLabel: 'Saraya Square',
          ),
        ),
        const SizedBox(width: 12),
        const Flexible(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'SARAYA SQUARE',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: SarayaColors.deepGreen,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              Text(
                'سرايا سكوير',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: SarayaColors.mutedInk, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

final class _Hero extends StatelessWidget {
  const _Hero({required this.strings, required this.onLogin});

  final AppLocalizations strings;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 390),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 64),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF073C32), Color(0xFF176553)],
        ),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1040),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 720;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: SarayaColors.mutedGold.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: SarayaColors.mutedGold.withValues(alpha: 0.55),
                      ),
                    ),
                    child: Text(
                      strings.publicHomeHeroEyebrow,
                      style: const TextStyle(
                        color: Color(0xFFF1D88C),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    strings.publicHomeHeroTitle,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: isCompact ? 34 : 40,
                      height: 1.18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 18),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 650),
                    child: Text(
                      strings.publicHomeHeroDescription,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.82),
                        fontSize: 17,
                        height: 1.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: SarayaColors.mutedGold,
                          foregroundColor: SarayaColors.ink,
                        ),
                        onPressed: () {},
                        icon: const Icon(Icons.arrow_downward_rounded),
                        label: Text(strings.publicHomeBrowse),
                      ),
                      if (isCompact)
                        OutlinedButton.icon(
                          key: const Key('public-hero-login'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: SarayaColors.white,
                            side: BorderSide(
                              color: SarayaColors.white.withValues(alpha: 0.7),
                            ),
                          ),
                          onPressed: onLogin,
                          icon: const Icon(Icons.login_rounded),
                          label: Text(strings.publicHomeLogin),
                        ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

final class _Inventory extends StatelessWidget {
  const _Inventory({
    required this.inventory,
    required this.strings,
    required this.isArabic,
    required this.onOpenUnit,
  });

  final PublicHomeInventory inventory;
  final AppLocalizations strings;
  final bool isArabic;
  final ValueChanged<String> onOpenUnit;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1120),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 52),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionTitle(
                title: strings.publicHomeUnitsTitle,
                description: strings.publicHomeUnitsDescription,
              ),
              const SizedBox(height: 24),
              if (inventory.units.isEmpty)
                _EmptyMessage(message: strings.publicHomeEmpty)
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final cardWidth = constraints.maxWidth >= 980
                        ? (constraints.maxWidth - 40) / 3
                        : constraints.maxWidth >= 650
                        ? (constraints.maxWidth - 20) / 2
                        : constraints.maxWidth;
                    return Wrap(
                      spacing: 20,
                      runSpacing: 20,
                      children: [
                        for (final unit in inventory.units)
                          SizedBox(
                            width: cardWidth,
                            child: _UnitCard(
                              unit: unit,
                              strings: strings,
                              isArabic: isArabic,
                              onOpen: () => onOpenUnit(unit.id),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              const SizedBox(height: 56),
              _VirtualAddressCard(
                summary: inventory.virtualAddresses,
                strings: strings,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontSize: 28,
            color: SarayaColors.deepGreen,
          ),
        ),
        const SizedBox(height: 8),
        Text(description, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

final class _UnitCard extends StatelessWidget {
  const _UnitCard({
    required this.unit,
    required this.strings,
    required this.isArabic,
    required this.onOpen,
  });

  final PublicUnitListing unit;
  final AppLocalizations strings;
  final bool isArabic;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final title = isArabic ? unit.displayNameAr : unit.displayNameEn;
    final description = isArabic ? unit.descriptionAr : unit.descriptionEn;
    final isShop = unit.unitType == 'shop';
    return Card(
      key: Key('public-unit-${unit.id}'),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: SarayaColors.border),
      ),
      child: InkWell(
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 148,
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFE8EFEA), Color(0xFFD8E2DA)],
                ),
              ),
              child: Icon(
                isShop
                    ? Icons.storefront_rounded
                    : Icons.business_center_rounded,
                size: 58,
                color: SarayaColors.deepGreen,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      _StatusPill(label: strings.publicHomeAvailable),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 16,
                    runSpacing: 10,
                    children: [
                      if (unit.areaSquareMeters case final area?)
                        _Detail(
                          icon: Icons.square_foot_rounded,
                          text: '${strings.publicHomeArea} $area m²',
                        ),
                      if (unit.floor case final floor?)
                        _Detail(
                          icon: Icons.layers_rounded,
                          text: '${strings.publicHomeFloor} $floor',
                        ),
                    ],
                  ),
                  if (unit.marketRent case final rent?) ...[
                    const SizedBox(height: 18),
                    Text(
                      '${formatMoney('BHD', rent)} / ${strings.publicHomeMonthly}',
                      style: const TextStyle(
                        color: SarayaColors.deepGreen,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _ignoreUnit(String unitId) {}

final class _VirtualAddressCard extends StatelessWidget {
  const _VirtualAddressCard({required this.summary, required this.strings});

  final PublicVirtualAddressSummary summary;
  final AppLocalizations strings;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: SarayaColors.deepGreen,
        borderRadius: BorderRadius.circular(24),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 620;
          final copy = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                strings.publicHomeVirtualTitle,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                strings.publicHomeVirtualDescription,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.78),
                  height: 1.6,
                ),
              ),
            ],
          );
          final metrics = Wrap(
            spacing: 24,
            runSpacing: 18,
            children: [
              _Metric(
                value: summary.available,
                label: strings.publicHomeAvailable,
              ),
              _Metric(value: summary.total, label: strings.publicHomeTotal),
            ],
          );
          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [copy, const SizedBox(height: 28), metrics],
            );
          }
          return Row(
            children: [
              Expanded(child: copy),
              const SizedBox(width: 36),
              metrics,
            ],
          );
        },
      ),
    );
  }
}

final class _Metric extends StatelessWidget {
  const _Metric({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$value',
          style: const TextStyle(
            color: Color(0xFFF1D88C),
            fontSize: 32,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(label, style: const TextStyle(color: Colors.white70)),
      ],
    );
  }
}

final class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFE5F3EA),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: SarayaColors.deepGreen,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

final class _Detail extends StatelessWidget {
  const _Detail({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 17, color: SarayaColors.mutedInk),
        const SizedBox(width: 6),
        Text(text, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

final class _EmptyMessage extends StatelessWidget {
  const _EmptyMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: SarayaColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: SarayaColors.border),
      ),
      child: Text(message),
    );
  }
}

final class _LoadFailure extends StatelessWidget {
  const _LoadFailure({required this.strings, required this.onRetry});

  final AppLocalizations strings;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 56),
      child: Center(
        child: Column(
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              color: SarayaColors.mutedInk,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(strings.publicHomeLoadFailed),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              child: Text(strings.publicHomeRetry),
            ),
          ],
        ),
      ),
    );
  }
}
