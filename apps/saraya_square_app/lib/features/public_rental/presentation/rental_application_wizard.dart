import 'dart:async';

import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';

typedef RentalDocumentPicker = Future<RentalDocument?> Function();

final class RentalApplicationWizard extends StatefulWidget {
  const RentalApplicationWizard({
    required this.unitId,
    required this.repository,
    required this.documentPicker,
    required this.onBack,
    required this.onSubmitted,
    this.onSessionVerified,
    super.key,
  });

  final String unitId;
  final PublicRentalRepository repository;
  final RentalDocumentPicker documentPicker;
  final VoidCallback onBack;
  final ValueChanged<String> onSubmitted;
  final Future<void> Function()? onSessionVerified;

  @override
  State<RentalApplicationWizard> createState() =>
      _RentalApplicationWizardState();
}

final class _RentalApplicationWizardState
    extends State<RentalApplicationWizard> {
  final _nameAr = TextEditingController();
  final _nameEn = TextEditingController();
  final _registration = TextEditingController();
  final _identity = TextEditingController();
  final _otp = TextEditingController();
  final _startDate = TextEditingController();
  final _endDate = TextEditingController();
  final _duration = TextEditingController(text: '12');
  late final Future<PublicRentalUnit> _unit = widget.repository.loadUnit(
    widget.unitId,
  );
  int _step = 0;
  bool _acceptedTerms = false;
  bool _busy = false;
  String _applicantType = 'individual';
  OtpChallenge? _challenge;
  RentalDocument? _document;
  String? _documentId;
  String? _message;
  late final String _documentKey = _key('document');
  late final String _submitKey = _key('submit');

  String _key(String action) =>
      'flutter-$action-${DateTime.now().microsecondsSinceEpoch}-${identityHashCode(this)}';

  @override
  void dispose() {
    for (final controller in [
      _nameAr,
      _nameEn,
      _registration,
      _identity,
      _otp,
      _startDate,
      _endDate,
      _duration,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: _step == 0 ? widget.onBack : () => setState(() => _step--),
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
        ),
        title: Text(strings.rentalEntryTitle),
      ),
      body: SafeArea(
        child: FutureBuilder<PublicRentalUnit>(
          future: _unit,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return _LoadError(
                message: strings.rentalLoadFailed,
                onBack: widget.onBack,
              );
            }
            return LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _UnitSummary(unit: snapshot.data!),
                        const SizedBox(height: 16),
                        LinearProgressIndicator(value: (_step + 1) / 5),
                        const SizedBox(height: 16),
                        if (_message case final message?)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: MaterialBanner(
                              content: Text(message),
                              actions: [
                                TextButton(
                                  onPressed: () =>
                                      setState(() => _message = null),
                                  child: Text(strings.actionClose),
                                ),
                              ],
                            ),
                          ),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 180),
                              child: _stepBody(snapshot.data!),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _stepBody(PublicRentalUnit unit) => switch (_step) {
    0 => _terms(),
    1 => _applicant(),
    2 => _documents(),
    3 => _dates(),
    _ => _review(unit),
  };

  Widget _terms() {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const ValueKey('terms'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.rentalTermsTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        Text(strings.rentalTermsBody),
        const SizedBox(height: 16),
        CheckboxListTile(
          key: const Key('rental-terms-accept'),
          contentPadding: EdgeInsets.zero,
          value: _acceptedTerms,
          onChanged: (value) => setState(() => _acceptedTerms = value == true),
          title: Text(strings.rentalTermsAccept),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        const SizedBox(height: 12),
        FilledButton(
          key: const Key('rental-start'),
          onPressed: _acceptedTerms ? () => setState(() => _step = 1) : null,
          child: Text(strings.rentalStart),
        ),
      ],
    );
  }

  Widget _applicant() {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const ValueKey('applicant'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.rentalApplicantTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        SegmentedButton<String>(
          segments: [
            ButtonSegment(
              value: 'individual',
              label: Text(strings.rentalApplicantIndividual),
            ),
            ButtonSegment(
              value: 'company',
              label: Text(strings.rentalApplicantCompany),
            ),
          ],
          selected: {_applicantType},
          onSelectionChanged: _busy
              ? null
              : (value) => setState(() => _applicantType = value.single),
        ),
        const SizedBox(height: 14),
        TextField(
          key: const Key('applicant-name-ar'),
          controller: _nameAr,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(labelText: strings.rentalNameAr),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('applicant-name-en'),
          controller: _nameEn,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(labelText: strings.rentalNameEn),
        ),
        if (_applicantType == 'company') ...[
          const SizedBox(height: 12),
          TextField(
            key: const Key('applicant-registration'),
            controller: _registration,
            decoration: InputDecoration(
              labelText: strings.rentalRegistrationNumber,
            ),
          ),
        ],
        const SizedBox(height: 12),
        TextField(
          key: const Key('otp-identity'),
          controller: _identity,
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(labelText: strings.rentalOtpIdentity),
        ),
        const SizedBox(height: 12),
        if (_challenge == null)
          FilledButton.icon(
            key: const Key('otp-request'),
            onPressed: _busy ? null : _requestOtp,
            icon: const Icon(Icons.mark_email_read_outlined),
            label: Text(strings.rentalOtpRequest),
          )
        else ...[
          TextField(
            key: const Key('otp-code'),
            controller: _otp,
            maxLength: 6,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: strings.rentalOtpCode),
          ),
          FilledButton(
            key: const Key('otp-verify'),
            onPressed: _busy ? null : _verifyOtp,
            child: _busy
                ? const _ButtonSpinner()
                : Text(strings.rentalOtpVerify),
          ),
        ],
      ],
    );
  }

  Widget _documents() {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const ValueKey('documents'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.rentalDocumentTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(strings.rentalDocumentHelp),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          key: const Key('rental-document-pick'),
          onPressed: _busy ? null : _pickDocument,
          icon: const Icon(Icons.upload_file_outlined),
          label: Text(strings.rentalDocumentPick),
        ),
        if (_document case final document?) ...[
          const SizedBox(height: 10),
          Text(strings.rentalDocumentSelected(document.fileName)),
        ],
        const SizedBox(height: 18),
        FilledButton(
          key: const Key('rental-next'),
          onPressed: _busy || _document == null ? null : _uploadAndContinue,
          child: _busy ? const _ButtonSpinner() : Text(strings.rentalNext),
        ),
      ],
    );
  }

  Widget _dates() {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const ValueKey('dates'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.rentalDatesTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('rental-start-date'),
          controller: _startDate,
          keyboardType: TextInputType.datetime,
          decoration: InputDecoration(
            labelText: strings.fieldStartDate,
            hintText: 'YYYY-MM-DD',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('rental-end-date'),
          controller: _endDate,
          keyboardType: TextInputType.datetime,
          decoration: InputDecoration(
            labelText: strings.fieldEndDate,
            hintText: 'YYYY-MM-DD',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          key: const Key('rental-duration'),
          controller: _duration,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: strings.rentalDurationMonths),
        ),
        const SizedBox(height: 18),
        FilledButton(
          key: const Key('rental-next'),
          onPressed: _continueDates,
          child: Text(strings.rentalNext),
        ),
      ],
    );
  }

  Widget _review(PublicRentalUnit unit) {
    final strings = AppLocalizations.of(context)!;
    return Column(
      key: const ValueKey('review'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.rentalReviewTitle,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        _ReviewRow(
          label: strings.fieldName,
          value: '${_nameAr.text} / ${_nameEn.text}',
        ),
        _ReviewRow(label: strings.fieldStartDate, value: _startDate.text),
        _ReviewRow(label: strings.fieldEndDate, value: _endDate.text),
        _ReviewRow(
          label: strings.fieldAmount,
          value: '${unit.rentAmount} ${unit.currency}',
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          key: const Key('rental-submit'),
          onPressed: _busy ? null : () => _submit(unit),
          icon: const Icon(Icons.send_rounded),
          label: _busy ? const _ButtonSpinner() : Text(strings.rentalSubmit),
        ),
      ],
    );
  }

  bool get _datesValid {
    final datePattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');
    final duration = int.tryParse(_duration.text);
    final start = DateTime.tryParse(_startDate.text);
    final end = DateTime.tryParse(_endDate.text);
    return duration != null &&
        duration > 0 &&
        duration <= 120 &&
        datePattern.hasMatch(_startDate.text) &&
        datePattern.hasMatch(_endDate.text) &&
        start != null &&
        end != null &&
        !end.isBefore(start);
  }

  void _continueDates() {
    if (_datesValid) {
      setState(() {
        _message = null;
        _step = 4;
      });
      return;
    }
    setState(() => _message = AppLocalizations.of(context)!.rentalActionFailed);
  }

  Future<void> _requestOtp() async {
    final identity = _identity.text.trim();
    if (_nameAr.text.trim().isEmpty ||
        _nameEn.text.trim().isEmpty ||
        identity.isEmpty ||
        (_applicantType == 'company' && _registration.text.trim().isEmpty)) {
      return _fail();
    }
    await _run(() async {
      final isEmail = identity.contains('@');
      _challenge = await widget.repository.requestOtp(
        OtpRequest(
          channel: isEmail ? 'email' : 'phone',
          identity: identity,
          locale: Localizations.localeOf(context).languageCode == 'ar'
              ? 'ar'
              : 'en',
        ),
      );
    });
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.trim().length != 6) return _fail();
    await _run(() async {
      await widget.repository.verifyOtp(
        OtpVerification(
          challengeId: _challenge!.challengeId,
          code: _otp.text.trim(),
          displayNameAr: _nameAr.text.trim(),
          displayNameEn: _nameEn.text.trim(),
        ),
      );
      await widget.onSessionVerified?.call();
      _step = 2;
    });
  }

  Future<void> _pickDocument() async {
    final value = await widget.documentPicker();
    if (!mounted || value == null) return;
    setState(() => _document = value);
  }

  Future<void> _uploadAndContinue() async {
    await _run(() async {
      _documentId = await widget.repository.uploadIdentity(
        widget.unitId,
        _document!,
        category: _applicantType == 'company'
            ? 'commercial_registration'
            : 'identity',
        idempotencyKey: _documentKey,
      );
      _document = null;
      _step = 3;
    });
  }

  Future<void> _submit(PublicRentalUnit unit) async {
    await _run(() async {
      final result = await widget.repository.submit(
        RentalApplicationInput(
          propertyId: unit.propertyId,
          unitId: unit.id,
          applicantType: _applicantType,
          applicantNameAr: _nameAr.text.trim(),
          applicantNameEn: _nameEn.text.trim(),
          registrationNumber: _applicantType == 'company'
              ? _registration.text.trim()
              : null,
          startDate: _startDate.text.trim(),
          endDate: _endDate.text.trim(),
          durationMonths: int.parse(_duration.text),
          idDocumentId: _documentId!,
          idempotencyKey: _submitKey,
        ),
      );
      widget.onSubmitted(result.id);
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await action();
    } on ApiError catch (error) {
      if (!mounted) return;
      final isArabic = Localizations.localeOf(context).languageCode == 'ar';
      _message = isArabic ? error.messageAr : error.messageEn;
    } on Object {
      if (!mounted) return;
      _message = AppLocalizations.of(context)!.rentalActionFailed;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _fail() => setState(
    () => _message = AppLocalizations.of(context)!.rentalActionFailed,
  );
}

final class _UnitSummary extends StatelessWidget {
  const _UnitSummary({required this.unit});
  final PublicRentalUnit unit;
  @override
  Widget build(BuildContext context) {
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: SarayaColors.deepGreen,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            const Icon(Icons.apartment_rounded, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                isArabic ? unit.displayNameAr : unit.displayNameEn,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(color: Colors.white),
              ),
            ),
            Text(
              '${unit.rentAmount} ${unit.currency}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 150,
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}

final class _ButtonSpinner extends StatelessWidget {
  const _ButtonSpinner();
  @override
  Widget build(BuildContext context) => const SizedBox.square(
    dimension: 18,
    child: CircularProgressIndicator(strokeWidth: 2),
  );
}

final class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onBack});
  final String message;
  final VoidCallback onBack;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: onBack,
            child: Text(AppLocalizations.of(context)!.rentalEntryBackToUnit),
          ),
        ],
      ),
    ),
  );
}
