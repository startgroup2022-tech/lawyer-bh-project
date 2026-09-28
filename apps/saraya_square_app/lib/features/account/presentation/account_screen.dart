import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/localization/status_labels.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/account/domain/account_profile.dart';
import 'package:saraya_square_app/features/account/presentation/account_controller.dart';

final class AccountScreen extends StatefulWidget {
  const AccountScreen({
    required this.repository,
    required this.role,
    super.key,
  });

  final AccountRepository repository;
  final AppRole role;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

final class _AccountScreenState extends State<AccountScreen> {
  late final AccountController _controller = AccountController(
    widget.repository,
  );
  final _profileKey = GlobalKey<FormState>();
  final _passwordKey = GlobalKey<FormState>();
  final _nameAr = TextEditingController();
  final _nameEn = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _identityPassword = TextEditingController();
  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  String? _profileId;
  String? _identityPasswordError;
  String? _confirmationError;

  @override
  void initState() {
    super.initState();
    _controller.load();
  }

  @override
  void dispose() {
    _controller.dispose();
    for (final controller in [
      _nameAr,
      _nameEn,
      _email,
      _phone,
      _identityPassword,
      _currentPassword,
      _newPassword,
      _confirmPassword,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.viewAccount)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => switch (_controller.state) {
        AccountLoading() => const Center(child: CircularProgressIndicator()),
        AccountFailure() => Center(
          child: OutlinedButton(
            onPressed: _controller.load,
            child: Text(strings.actionRetry),
          ),
        ),
        AccountLoaded(:final profile) => _content(profile),
      },
    );
  }

  Widget _content(AccountProfile profile) {
    _populate(profile);
    final strings = AppLocalizations.of(context)!;
    return RefreshIndicator(
      onRefresh: _refresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final cards = [
            Expanded(
              child: _ProfileCard(
                key: const Key('account-profile-card'),
                formKey: _profileKey,
                nameAr: _nameAr,
                nameEn: _nameEn,
                email: _email,
                phone: _phone,
                currentPassword: _identityPassword,
                currentPasswordError: _identityPasswordError,
                profile: profile,
                isSaving: _controller.isSavingProfile,
                onSave: () => _saveProfile(profile),
              ),
            ),
            Expanded(
              child: _SecurityCard(
                key: const Key('account-security-card'),
                formKey: _passwordKey,
                currentPassword: _currentPassword,
                newPassword: _newPassword,
                confirmation: _confirmPassword,
                confirmationError: _confirmationError,
                isSaving: _controller.isChangingPassword,
                onSave: _changePassword,
              ),
            ),
          ];
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                strings.accountTitle,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(strings.accountDescription),
              const SizedBox(height: 20),
              if (constraints.maxWidth >= 900)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [cards[0], const SizedBox(width: 16), cards[1]],
                )
              else
                Column(
                  children: [
                    SizedBox(width: double.infinity, child: cards[0].child),
                    const SizedBox(height: 16),
                    SizedBox(width: double.infinity, child: cards[1].child),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _refresh() async {
    _profileId = null;
    await _controller.load();
  }

  void _populate(AccountProfile profile) {
    if (_profileId == profile.id) return;
    _profileId = profile.id;
    _nameAr.text = profile.displayNameAr;
    _nameEn.text = profile.displayNameEn;
    _email.text = profile.email ?? '';
    _phone.text = profile.phone ?? '';
  }

  Future<void> _saveProfile(AccountProfile profile) async {
    setState(() => _identityPasswordError = null);
    if (_profileKey.currentState?.validate() != true) return;
    final email = _nullable(_email.text);
    final phone = _nullable(_phone.text);
    final identityChanged = email != profile.email || phone != profile.phone;
    if (identityChanged && _identityPassword.text.isEmpty) {
      setState(() {
        _identityPasswordError = AppLocalizations.of(
          context,
        )!.accountCurrentPasswordRequired;
      });
      return;
    }
    final saved = await _controller.update(
      AccountUpdate(
        displayNameAr: _nameAr.text.trim(),
        displayNameEn: _nameEn.text.trim(),
        email: email,
        phone: phone,
        currentPassword: identityChanged ? _identityPassword.text : null,
      ),
    );
    if (!mounted) return;
    if (saved) {
      _identityPassword.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.accountSaved)),
      );
    } else {
      _showFailure();
    }
  }

  Future<void> _changePassword() async {
    setState(() => _confirmationError = null);
    if (_passwordKey.currentState?.validate() != true) return;
    if (_newPassword.text != _confirmPassword.text) {
      setState(() {
        _confirmationError = AppLocalizations.of(
          context,
        )!.accountPasswordsMismatch;
      });
      return;
    }
    final changed = await _controller.changePassword(
      currentPassword: _currentPassword.text,
      newPassword: _newPassword.text,
    );
    if (!mounted) return;
    if (changed) {
      _currentPassword.clear();
      _newPassword.clear();
      _confirmPassword.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.accountPasswordChanged),
        ),
      );
    } else {
      _showFailure();
    }
  }

  void _showFailure() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.errorDescription)),
    );
  }
}

final class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.formKey,
    required this.nameAr,
    required this.nameEn,
    required this.email,
    required this.phone,
    required this.currentPassword,
    required this.currentPasswordError,
    required this.profile,
    required this.isSaving,
    required this.onSave,
    super.key,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController nameAr;
  final TextEditingController nameEn;
  final TextEditingController email;
  final TextEditingController phone;
  final TextEditingController currentPassword;
  final String? currentPasswordError;
  final AccountProfile profile;
  final bool isSaving;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                strings.accountProfileTitle,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              _Field(
                key: const Key('account-display-name-ar'),
                controller: nameAr,
                label: strings.managementNameAr,
              ),
              _Field(
                key: const Key('account-display-name-en'),
                controller: nameEn,
                label: strings.managementNameEn,
              ),
              _Field(
                key: const Key('account-email'),
                controller: email,
                label: strings.fieldEmail,
                required: false,
                keyboardType: TextInputType.emailAddress,
              ),
              _Field(
                key: const Key('account-phone'),
                controller: phone,
                label: strings.fieldPhone,
                required: false,
                keyboardType: TextInputType.phone,
              ),
              _Field(
                key: const Key('account-identity-password'),
                controller: currentPassword,
                label: strings.accountCurrentPassword,
                required: false,
                obscure: true,
                errorText: currentPasswordError,
                helperText: strings.accountIdentityPasswordHelp,
              ),
              const SizedBox(height: 8),
              Text(
                strings.accountAccessTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              for (final membership in profile.memberships)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.apartment_outlined),
                  title: Text(
                    isArabic
                        ? membership.propertyNameAr
                        : membership.propertyNameEn,
                  ),
                  subtitle: Text(
                    localizedRoleLabel(
                      strings,
                      membership.role.name.replaceAllMapped(
                        RegExp(r'([A-Z])'),
                        (match) => '_${match.group(1)!.toLowerCase()}',
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const Key('account-save'),
                onPressed: isSaving ? null : onSave,
                icon: const Icon(Icons.save_outlined),
                label: Text(strings.actionSave),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _SecurityCard extends StatelessWidget {
  const _SecurityCard({
    required this.formKey,
    required this.currentPassword,
    required this.newPassword,
    required this.confirmation,
    required this.confirmationError,
    required this.isSaving,
    required this.onSave,
    super.key,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController currentPassword;
  final TextEditingController newPassword;
  final TextEditingController confirmation;
  final String? confirmationError;
  final bool isSaving;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                strings.accountSecurityTitle,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(strings.accountSecurityDescription),
              const SizedBox(height: 16),
              _Field(
                key: const Key('password-current'),
                controller: currentPassword,
                label: strings.accountCurrentPassword,
                obscure: true,
              ),
              _Field(
                key: const Key('password-new'),
                controller: newPassword,
                label: strings.accountNewPassword,
                obscure: true,
              ),
              _Field(
                key: const Key('password-confirm'),
                controller: confirmation,
                label: strings.accountConfirmPassword,
                obscure: true,
                errorText: confirmationError,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const Key('password-save'),
                onPressed: isSaving ? null : onSave,
                icon: const Icon(Icons.lock_reset_outlined),
                label: Text(strings.accountChangePassword),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    this.required = true,
    this.obscure = false,
    this.errorText,
    this.helperText,
    this.keyboardType,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final bool required;
  final bool obscure;
  final String? errorText;
  final String? helperText;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        helperText: helperText,
      ),
      validator: required
          ? (value) => value == null || value.trim().isEmpty
                ? AppLocalizations.of(context)!.managementFieldRequired
                : null
          : null,
    ),
  );
}

String? _nullable(String value) {
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
}
