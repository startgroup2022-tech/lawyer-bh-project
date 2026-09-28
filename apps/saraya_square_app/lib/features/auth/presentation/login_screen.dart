import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';

import '../domain/auth_state.dart';
import 'auth_controller.dart';

final class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.authController,
    required this.onLocaleChanged,
    super.key,
  });

  final AuthController authController;
  final ValueChanged<Locale> onLocaleChanged;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

final class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identityController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    widget.authController.addListener(_onAuthChanged);
  }

  @override
  void didUpdateWidget(LoginScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.authController != widget.authController) {
      oldWidget.authController.removeListener(_onAuthChanged);
      widget.authController.addListener(_onAuthChanged);
    }
  }

  @override
  void dispose() {
    widget.authController.removeListener(_onAuthChanged);
    _identityController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onAuthChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final password = _passwordController.text;
    await widget.authController.login(_identityController.text, password);
    _passwordController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final state = widget.authController.state;
    final isLoading = state is Authenticating;

    return Scaffold(
      backgroundColor: SarayaColors.warmSurface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Align(
                          alignment: AlignmentDirectional.centerEnd,
                          child: TextButton(
                            key: const Key('login-locale-switch'),
                            onPressed: () => widget.onLocaleChanged(
                              locale.languageCode == 'ar'
                                  ? const Locale('en')
                                  : const Locale('ar'),
                            ),
                            child: Text(
                              locale.languageCode == 'ar'
                                  ? strings.switchToEnglish
                                  : strings.switchToArabic,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.apartment_rounded,
                          color: SarayaColors.deepGreen,
                          size: 48,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          strings.loginTitle,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          strings.loginSubtitle,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 28),
                        TextFormField(
                          key: const Key('login-identity'),
                          controller: _identityController,
                          enabled: !isLoading,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [
                            AutofillHints.username,
                            AutofillHints.email,
                            AutofillHints.telephoneNumber,
                          ],
                          decoration: InputDecoration(
                            labelText: strings.loginIdentityLabel,
                            hintText: strings.loginIdentityHint,
                            prefixIcon: const Icon(Icons.person_outline),
                          ),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                              ? strings.loginIdentityRequired
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          key: const Key('login-password'),
                          controller: _passwordController,
                          enabled: !isLoading,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          autofillHints: const [AutofillHints.password],
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: strings.loginPasswordLabel,
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              key: const Key('login-password-visibility'),
                              onPressed: isLoading
                                  ? null
                                  : () => setState(
                                      () =>
                                          _obscurePassword = !_obscurePassword,
                                    ),
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                          validator: (value) => value == null || value.isEmpty
                              ? strings.loginPasswordRequired
                              : null,
                        ),
                        if (state case AuthFailure(:final error)) ...[
                          const SizedBox(height: 14),
                          Semantics(
                            liveRegion: true,
                            child: Text(
                              locale.languageCode == 'ar'
                                  ? error.messageAr
                                  : error.messageEn,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                        ],
                        if (state case Authenticated(
                          needsMembershipSelection: true,
                          :final account,
                        )) ...[
                          const SizedBox(height: 20),
                          Text(
                            strings.selectPropertyTitle,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          for (final membership in account.memberships)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: OutlinedButton(
                                onPressed: () => widget.authController
                                    .selectMembership(membership.propertyId),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        locale.languageCode == 'ar'
                                            ? membership.propertyNameAr
                                            : membership.propertyNameEn,
                                      ),
                                    ),
                                    Text(_roleLabel(strings, membership.role)),
                                  ],
                                ),
                              ),
                            ),
                        ] else ...[
                          const SizedBox(height: 22),
                          FilledButton(
                            key: const Key('login-submit'),
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox.square(
                                    dimension: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(strings.loginAction),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _roleLabel(AppLocalizations strings, AppRole role) => switch (role) {
  AppRole.superAdmin => strings.roleSuperAdmin,
  AppRole.propertyManager => strings.rolePropertyManager,
  AppRole.accountant => strings.roleAccountant,
  AppRole.maintenance => strings.roleMaintenance,
  AppRole.owner => strings.roleOwner,
  AppRole.tenant => strings.roleTenant,
  AppRole.visitor => strings.roleVisitor,
};
