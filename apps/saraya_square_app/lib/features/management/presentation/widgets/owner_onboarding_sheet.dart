import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/management/domain/client_onboarding.dart';

Future<bool?> showOwnerOnboardingSheet({
  required BuildContext context,
  required ClientOnboardingRepository repository,
}) => showModalBottomSheet<bool>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (context) => _OwnerOnboardingSheet(repository: repository),
);

final class _OwnerOnboardingSheet extends StatefulWidget {
  const _OwnerOnboardingSheet({required this.repository});
  final ClientOnboardingRepository repository;
  @override
  State<_OwnerOnboardingSheet> createState() => _OwnerOnboardingSheetState();
}

final class _OwnerOnboardingSheetState extends State<_OwnerOnboardingSheet> {
  final _nameAr = TextEditingController();
  final _nameEn = TextEditingController();
  final _registration = TextEditingController();
  final _selected = <String>{};
  late final _options = widget.repository.options();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _nameAr.dispose();
    _nameEn.dispose();
    _registration.dispose();
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
        constraints: const BoxConstraints(maxWidth: 680),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              _OwnerHeader(title: strings.managementAddOwner),
              const SizedBox(height: 18),
              TextField(
                key: const Key('owner-name-ar'),
                controller: _nameAr,
                decoration: InputDecoration(
                  labelText: strings.managementNameAr,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('owner-name-en'),
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
              const SizedBox(height: 16),
              Text(
                strings.onboardingOwnerProperties,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              FutureBuilder<ClientOnboardingOptions>(
                future: _options,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Text(strings.onboardingLoadFailed);
                  }
                  return Column(
                    children: [
                      for (final property in snapshot.data!.properties)
                        CheckboxListTile(
                          key: Key('owner-property-${property.id}'),
                          value: _selected.contains(property.id),
                          title: Text(
                            isArabic ? property.nameAr : property.nameEn,
                          ),
                          subtitle: Text(property.code),
                          onChanged: (value) => setState(
                            () => value == true
                                ? _selected.add(property.id)
                                : _selected.remove(property.id),
                          ),
                        ),
                    ],
                  );
                },
              ),
              if (_error case final error?)
                Text(
                  error,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              const SizedBox(height: 18),
              FilledButton(
                key: const Key('save-owner-onboarding'),
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

  Future<void> _save() async {
    final strings = AppLocalizations.of(context)!;
    if (_nameAr.text.trim().isEmpty ||
        _nameEn.text.trim().isEmpty ||
        _selected.isEmpty) {
      setState(
        () => _error = _selected.isEmpty
            ? strings.onboardingSelectProperty
            : strings.managementFieldRequired,
      );
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.repository.createOwner(
        OwnerOnboardingInput(
          propertyIds: _selected.toList(),
          nameAr: _nameAr.text.trim(),
          nameEn: _nameEn.text.trim(),
          registrationNumber: _registration.text.trim().isEmpty
              ? null
              : _registration.text.trim(),
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

final class _OwnerHeader extends StatelessWidget {
  const _OwnerHeader({required this.title});
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
