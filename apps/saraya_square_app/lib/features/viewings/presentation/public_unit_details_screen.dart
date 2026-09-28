import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/features/public_home/domain/public_unit_details.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';

final class PublicUnitDetailsScreen extends StatelessWidget {
  const PublicUnitDetailsScreen({
    required this.details,
    required this.repository,
    required this.onBack,
    required this.onRentNow,
    super.key,
  });

  final PublicUnitDetails details;
  final ViewingRepository repository;
  final VoidCallback onBack;
  final VoidCallback onRentNow;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final title = isArabic ? details.displayNameAr : details.displayNameEn;
    final description = isArabic
        ? details.descriptionAr
        : details.descriptionEn;
    final property = isArabic ? details.propertyNameAr : details.propertyNameEn;
    final actions = _UnitActions(
      details: details,
      repository: repository,
      onRentNow: onRentNow,
    );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
        ),
        title: Text(strings.unitDetailsTitle),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final expanded = SarayaBreakpoints.isExpanded(constraints.maxWidth);
            final content = _DetailsContent(
              details: details,
              title: title,
              description: description,
              property: property,
            );
            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(24, 24, 24, expanded ? 32 : 140),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1120),
                  child: expanded
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(flex: 3, child: content),
                            const SizedBox(width: 28),
                            SizedBox(width: 340, child: actions),
                          ],
                        )
                      : content,
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: LayoutBuilder(
        builder: (context, constraints) =>
            SarayaBreakpoints.isExpanded(MediaQuery.sizeOf(context).width)
            ? const SizedBox.shrink()
            : SafeArea(minimum: const EdgeInsets.all(16), child: actions),
      ),
    );
  }
}

final class _DetailsContent extends StatelessWidget {
  const _DetailsContent({
    required this.details,
    required this.title,
    required this.description,
    required this.property,
  });

  final PublicUnitDetails details;
  final String title;
  final String description;
  final String property;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 300,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFE8EFEA), Color(0xFFD4E0D8)],
            ),
          ),
          child: Icon(
            details.unitType == 'shop'
                ? Icons.storefront_rounded
                : Icons.business_center_rounded,
            color: SarayaColors.deepGreen,
            size: 96,
          ),
        ),
        const SizedBox(height: 28),
        Text(property, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12),
        Text(description, style: Theme.of(context).textTheme.bodyLarge),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _Fact(
              icon: Icons.tag_rounded,
              label: '${strings.unitNumber}: ${details.unitNumber}',
            ),
            if (details.areaSquareMeters case final area?)
              _Fact(
                icon: Icons.square_foot_rounded,
                label: '${strings.publicHomeArea} $area m²',
              ),
            if (details.floor case final floor?)
              _Fact(
                icon: Icons.layers_rounded,
                label: '${strings.publicHomeFloor} $floor',
              ),
          ],
        ),
        if (details.marketRent case final rent?) ...[
          const SizedBox(height: 28),
          Text(
            strings.unitMonthlyRent,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 5),
          Text(
            '${formatMoney('BHD', rent)} / ${strings.publicHomeMonthly}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: SarayaColors.deepGreen,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ],
    );
  }
}

final class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: SarayaColors.white,
      border: Border.all(color: SarayaColors.border),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: SarayaColors.deepGreen),
        const SizedBox(width: 8),
        Text(label),
      ],
    ),
  );
}

final class _UnitActions extends StatelessWidget {
  const _UnitActions({
    required this.details,
    required this.repository,
    required this.onRentNow,
  });

  final PublicUnitDetails details;
  final ViewingRepository repository;
  final VoidCallback onRentNow;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                key: const Key('book-visit'),
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (context) => _VisitBookingDialog(
                    details: details,
                    repository: repository,
                  ),
                ),
                icon: const Icon(Icons.calendar_month_outlined),
                label: Text(strings.viewingBookVisit),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                key: const Key('rent-now'),
                onPressed: onRentNow,
                icon: const Icon(Icons.key_rounded),
                label: Text(strings.unitRentNow),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _VisitBookingDialog extends StatefulWidget {
  const _VisitBookingDialog({required this.details, required this.repository});

  final PublicUnitDetails details;
  final ViewingRepository repository;

  @override
  State<_VisitBookingDialog> createState() => _VisitBookingDialogState();
}

final class _VisitBookingDialogState extends State<_VisitBookingDialog> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  late final Future<List<PublicViewingSlot>> _slots = widget.repository
      .listPublicSlots(widget.details.id);
  PublicViewingSlot? _selected;
  ViewingAppointmentConfirmation? _confirmation;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final slot = _selected;
    if (!_formKey.currentState!.validate() || slot == null || _submitting) {
      if (slot == null) {
        setState(
          () => _error = AppLocalizations.of(context)!.viewingSelectSlot,
        );
      }
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final confirmation = await widget.repository.bookPublicAppointment(
        PublicViewingAppointmentInput(
          propertyId: widget.details.propertyId,
          unitId: widget.details.id,
          slotId: slot.id,
          visitorName: _name.text,
          visitorPhone: _phone.text,
          visitorEmail: _email.text,
          locale: Localizations.localeOf(context).languageCode == 'ar'
              ? 'ar'
              : 'en',
        ),
      );
      if (mounted) setState(() => _confirmation = confirmation);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = AppLocalizations.of(context)!.viewingBookingFailed,
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final confirmation = _confirmation;
    return AlertDialog(
      key: const Key('visit-booking-form'),
      title: Text(
        confirmation == null
            ? strings.viewingBookVisit
            : strings.viewingBookingConfirmed,
      ),
      content: SizedBox(
        width: 520,
        child: confirmation != null
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    size: 58,
                    color: SarayaColors.green,
                  ),
                  const SizedBox(height: 16),
                  SelectableText(
                    confirmation.reference,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _formatRange(
                      confirmation.startAt,
                      confirmation.endAt,
                      locale,
                    ),
                  ),
                ],
              )
            : FutureBuilder<List<PublicViewingSlot>>(
                future: _slots,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Text(strings.viewingSlotsLoadFailed);
                  }
                  final slots = snapshot.data ?? const [];
                  return Form(
                    key: _formKey,
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(strings.viewingAvailableTimes),
                          const SizedBox(height: 10),
                          if (slots.isEmpty)
                            Text(strings.viewingNoSlots)
                          else
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final slot in slots)
                                  ChoiceChip(
                                    key: Key('viewing-slot-${slot.id}'),
                                    selected: _selected?.id == slot.id,
                                    onSelected: (_) => setState(() {
                                      _selected = slot;
                                      _error = null;
                                    }),
                                    label: Text(
                                      '${_formatRange(slot.startAt, slot.endAt, locale)} · ${slot.remainingCapacity} ${strings.viewingPlacesLeft}',
                                    ),
                                  ),
                              ],
                            ),
                          const SizedBox(height: 18),
                          TextFormField(
                            key: const Key('visitor-name'),
                            controller: _name,
                            decoration: InputDecoration(
                              labelText: strings.viewingVisitorName,
                            ),
                            validator: _requiredValidator(strings),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            key: const Key('visitor-phone'),
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            decoration: InputDecoration(
                              labelText: strings.viewingVisitorPhone,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return strings.fieldRequired;
                              }
                              if (!_isInternationalPhone(value)) {
                                return strings.viewingPhoneInvalid;
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            key: const Key('visitor-email'),
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: InputDecoration(
                              labelText: strings.viewingVisitorEmail,
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return strings.fieldRequired;
                              }
                              if (!value.contains('@')) {
                                return strings.viewingEmailInvalid;
                              }
                              return null;
                            },
                          ),
                          if (_error case final error?) ...[
                            const SizedBox(height: 12),
                            Text(
                              error,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
      actions: [
        if (confirmation == null) ...[
          TextButton(
            onPressed: _submitting ? null : () => Navigator.pop(context),
            child: Text(strings.actionCancel),
          ),
          FilledButton(
            key: const Key('confirm-visit'),
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(strings.viewingConfirmVisit),
          ),
        ] else
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: Text(strings.actionClose),
          ),
      ],
    );
  }
}

FormFieldValidator<String> _requiredValidator(AppLocalizations strings) =>
    (value) =>
        value == null || value.trim().isEmpty ? strings.fieldRequired : null;

bool _isInternationalPhone(String value) {
  final trimmed = value.trim();
  final normalized =
      '${trimmed.startsWith('+') ? '+' : ''}'
      '${trimmed.replaceAll(RegExp(r'\D'), '')}';
  return RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(normalized);
}

String _formatRange(DateTime start, DateTime end, String locale) {
  final localStart = start.toLocal();
  final localEnd = end.toLocal();
  return '${DateFormat.yMMMd(locale).add_jm().format(localStart)} – ${DateFormat.jm(locale).format(localEnd)}';
}
