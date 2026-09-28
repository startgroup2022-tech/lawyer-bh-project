import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';

import 'auth_controller.dart';

final class SessionGate extends StatefulWidget {
  const SessionGate({required this.authController, super.key});

  final AuthController authController;

  @override
  State<SessionGate> createState() => _SessionGateState();
}

final class _SessionGateState extends State<SessionGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.authController.restore();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Semantics(
          label: AppLocalizations.of(context)!.checkingSession,
          child: const CircularProgressIndicator(),
        ),
      ),
    );
  }
}
