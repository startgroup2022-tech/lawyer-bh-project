import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/domain/client_onboarding.dart';

Future<bool?> showTenantOnboardingSheet({
  required BuildContext context,
  required ClientOnboardingRepository repository,
}) => showModalBottomSheet<bool>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (context) => _TenantOnboardingSheet(repository: repository),
);

final class _TenantOnboardingSheet extends StatefulWidget {
  const _TenantOnboardingSheet({required this.repository});
  final ClientOnboardingRepository repository;
  @override
  State<_TenantOnboardingSheet> createState() => _TenantOnboardingSheetState();
}

final class _TenantOnboardingSheetState extends State<_TenantOnboardingSheet> {
  final _nameAr = TextEditingController();
  final _nameEn = TextEditingController();
  final _registration = TextEditingController();
  final _tax = TextEditingController();
  final _unitTerms = <String, _UnitTerms>{};
  final _addressTerms = <String, _AddressTerms>{};
  late Future<ClientOnboardingOptions> _properties = widget.repository
      .options();
  ClientOnboardingOptions _assets = const ClientOnboardingOptions(
    properties: [],
  );
  String? _propertyId;
  bool _loadingAssets = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameAr.dispose();
    _nameEn.dispose();
    _registration.dispose();
    _tax.dispose();
    for (final terms in _unitTerms.values) {
      terms.dispose();
    }
    for (final terms in _addressTerms.values) {
      terms.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              _Header(title: strings.managementAddTenant),
              const SizedBox(height: 18),
              TextField(
                key: const Key('tenant-name-ar'),
                controller: _nameAr,
                decoration: InputDecoration(
                  labelText: strings.managementNameAr,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('tenant-name-en'),
                controller: _nameEn,
                decoration: InputDecoration(
                  labelText: strings.managementNameEn,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _registration,
                decoration: InputDecoration(
                  labelText: strings.managementRegistrationNumber,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _tax,
                decoration: InputDecoration(
                  labelText: strings.managementTaxNumber,
                ),
              ),
              const SizedBox(height: 12),
              FutureBuilder<ClientOnboardingOptions>(
                future: _properties,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return OutlinedButton(
                      onPressed: () => setState(
                        () => _properties = widget.repository.options(),
                      ),
                      child: Text(strings.actionRetry),
                    );
                  }
                  return DropdownButtonFormField<String>(
                    key: const Key('tenant-onboarding-property'),
                    initialValue: _propertyId,
                    decoration: InputDecoration(
                      labelText: strings.onboardingProperty,
                    ),
                    items: [
                      for (final property in snapshot.data!.properties)
                        DropdownMenuItem(
                          value: property.id,
                          child: Text(
                            isArabic ? property.nameAr : property.nameEn,
                          ),
                        ),
                    ],
                    onChanged: _loadAssets,
                  );
                },
              ),
              const SizedBox(height: 16),
              if (_loadingAssets)
                const Center(child: CircularProgressIndicator())
              else if (_propertyId != null) ...[
                Text(
                  strings.onboardingAvailableUnits,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (_assets.units.isEmpty)
                  Text(strings.onboardingNoUnits)
                else
                  for (final unit in _assets.units)
                    _unitTile(context, unit, isArabic),
                const SizedBox(height: 16),
                Text(
                  strings.onboardingAvailableVirtualAddresses,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (_assets.virtualAddresses.isEmpty)
                  Text(strings.onboardingNoVirtualAddresses)
                else
                  for (final address in _assets.virtualAddresses)
                    _addressTile(context, address),
              ],
              if (_error case final error?) ...[
                const SizedBox(height: 12),
                Text(
                  error,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 18),
              FilledButton(
                key: const Key('save-tenant-onboarding'),
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(strings.actionSave),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _unitTile(BuildContext context, OnboardingUnit unit, bool isArabic) {
    final strings = AppLocalizations.of(context)!;
    final selected = _unitTerms[unit.id];
    final name = isArabic ? unit.displayNameAr : unit.displayNameEn;
    return Card(
      child: Column(
        children: [
          CheckboxListTile(
            key: Key('tenant-unit-${unit.id}'),
            value: selected != null,
            title: Text(name ?? unit.unitNumber),
            subtitle: Text(
              '${unit.unitNumber} • ${unit.marketRent ?? '—'} BHD',
            ),
            onChanged: (value) => setState(() {
              if (value == true) {
                _unitTerms[unit.id] = _UnitTerms(unit.marketRent);
              } else {
                _unitTerms.remove(unit.id)?.dispose();
              }
            }),
          ),
          if (selected != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _TermField(
                    key: Key('unit-rent-${unit.id}'),
                    controller: selected.rent,
                    label: strings.leaseRent,
                  ),
                  _TermField(
                    controller: selected.deposit,
                    label: strings.leaseDeposit,
                  ),
                  _TermField(
                    controller: selected.start,
                    label: strings.fieldStartDate,
                  ),
                  _TermField(
                    controller: selected.end,
                    label: strings.fieldEndDate,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _addressTile(BuildContext context, OnboardingVirtualAddress address) {
    final strings = AppLocalizations.of(context)!;
    final selected = _addressTerms[address.id];
    return Card(
      child: Column(
        children: [
          CheckboxListTile(
            key: Key('tenant-address-${address.id}'),
            value: selected != null,
            title: Text(address.code),
            subtitle: Text(
              '${strings.onboardingSlot} ${address.slotNumber} • ${address.monthlyFee ?? '—'} BHD',
            ),
            onChanged: (value) => setState(() {
              if (value == true) {
                _addressTerms[address.id] = _AddressTerms(address.monthlyFee);
              } else {
                _addressTerms.remove(address.id)?.dispose();
              }
            }),
          ),
          if (selected != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _TermField(
                    controller: selected.fee,
                    label: strings.virtualAddressMonthlyFee,
                  ),
                  _TermField(
                    controller: selected.start,
                    label: strings.fieldStartDate,
                  ),
                  _TermField(
                    controller: selected.end,
                    label: strings.fieldEndDate,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _loadAssets(String? propertyId) async {
    for (final terms in _unitTerms.values) {
      terms.dispose();
    }
    for (final terms in _addressTerms.values) {
      terms.dispose();
    }
    setState(() {
      _propertyId = propertyId;
      _unitTerms.clear();
      _addressTerms.clear();
      _assets = const ClientOnboardingOptions(properties: []);
      _loadingAssets = propertyId != null;
      _error = null;
    });
    if (propertyId == null) return;
    try {
      final assets = await widget.repository.options(propertyId: propertyId);
      if (mounted && _propertyId == propertyId) {
        setState(() => _assets = assets);
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = AppLocalizations.of(context)!.onboardingLoadFailed,
        );
      }
    } finally {
      if (mounted && _propertyId == propertyId) {
        setState(() => _loadingAssets = false);
      }
    }
  }

  Future<void> _save() async {
    final strings = AppLocalizations.of(context)!;
    if (_nameAr.text.trim().isEmpty ||
        _nameEn.text.trim().isEmpty ||
        _propertyId == null) {
      setState(() => _error = strings.managementFieldRequired);
      return;
    }
    if (_unitTerms.isEmpty && _addressTerms.isEmpty) {
      setState(() => _error = strings.onboardingSelectAsset);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.repository.createTenant(
        TenantOnboardingInput(
          propertyId: _propertyId!,
          nameAr: _nameAr.text.trim(),
          nameEn: _nameEn.text.trim(),
          registrationNumber: _empty(_registration.text),
          taxNumber: _empty(_tax.text),
          units: [
            for (final entry in _unitTerms.entries)
              TenantUnitSelection(
                unitId: entry.key,
                startDate: entry.value.start.text,
                endDate: entry.value.end.text,
                rentAmount: entry.value.rent.text,
                depositAmount: entry.value.deposit.text,
                frequency: 'monthly',
                dueDay: 1,
                graceDays: 0,
              ),
          ],
          virtualAddresses: [
            for (final entry in _addressTerms.entries)
              TenantVirtualAddressSelection(
                virtualAddressId: entry.key,
                businessNameAr: _nameAr.text.trim(),
                businessNameEn: _nameEn.text.trim(),
                monthlyFee: entry.value.fee.text,
                startDate: entry.value.start.text,
                endDate: entry.value.end.text,
              ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) setState(() => _error = strings.onboardingSaveFailed);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

final class _Header extends StatelessWidget {
  const _Header({required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(title, style: Theme.of(context).textTheme.headlineSmall),
      ),
      IconButton(
        onPressed: () => Navigator.pop(context, false),
        icon: const Icon(Icons.close),
      ),
    ],
  );
}

final class _TermField extends StatelessWidget {
  const _TermField({required this.controller, required this.label, super.key});
  final TextEditingController controller;
  final String label;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 165,
    child: TextField(
      controller: controller,
      decoration: InputDecoration(labelText: label),
    ),
  );
}

final class _UnitTerms {
  _UnitTerms(String? marketRent)
    : rent = TextEditingController(text: marketRent ?? '1.000'),
      deposit = TextEditingController(text: '0.000'),
      start = TextEditingController(
        text: _date(DateTime.now().add(const Duration(days: 1))),
      ),
      end = TextEditingController(
        text: _date(DateTime.now().add(const Duration(days: 366))),
      );
  final TextEditingController rent;
  final TextEditingController deposit;
  final TextEditingController start;
  final TextEditingController end;
  void dispose() {
    rent.dispose();
    deposit.dispose();
    start.dispose();
    end.dispose();
  }
}

final class _AddressTerms {
  _AddressTerms(String? monthlyFee)
    : fee = TextEditingController(text: monthlyFee ?? '0.000'),
      start = TextEditingController(
        text: _date(DateTime.now().add(const Duration(days: 1))),
      ),
      end = TextEditingController(
        text: _date(DateTime.now().add(const Duration(days: 366))),
      );
  final TextEditingController fee;
  final TextEditingController start;
  final TextEditingController end;
  void dispose() {
    fee.dispose();
    start.dispose();
    end.dispose();
  }
}

String _date(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
String? _empty(String value) => value.trim().isEmpty ? null : value.trim();
