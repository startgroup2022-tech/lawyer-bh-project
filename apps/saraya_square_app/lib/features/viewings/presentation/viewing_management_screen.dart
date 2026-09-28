import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';
import 'package:saraya_square_app/features/viewings/domain/viewing_models.dart';

final class ViewingManagementScreen extends StatefulWidget {
  const ViewingManagementScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    super.key,
  });

  final ViewingRepository repository;
  final String propertyId;
  final AppRole role;

  @override
  State<ViewingManagementScreen> createState() =>
      _ViewingManagementScreenState();
}

final class _ViewingManagementScreenState
    extends State<ViewingManagementScreen> {
  late Future<List<ViewingAppointment>> _appointments;
  final List<ViewingSlot> _publishedSlots = [];

  bool get _allowed =>
      roleHasCapability(widget.role, AppCapability.manageViewings);

  @override
  void initState() {
    super.initState();
    _appointments = _allowed ? _load() : Future.value(const []);
  }

  Future<List<ViewingAppointment>> _load() async {
    final appointmentsFuture = widget.repository.listAppointments(
      widget.propertyId,
    );
    final slotsFuture = widget.repository.listSlots(widget.propertyId);
    final appointments = await appointmentsFuture;
    final slots = await slotsFuture;
    _publishedSlots
      ..clear()
      ..addAll(slots);
    return appointments;
  }

  Future<void> _reload() async {
    if (!_allowed) return;
    setState(() {
      _appointments = _load();
    });
    await _appointments;
  }

  Future<void> _update(
    ViewingAppointment appointment,
    ViewingAppointmentStatus status,
  ) async {
    try {
      await widget.repository.updateAppointmentStatus(
        widget.propertyId,
        appointment.id,
        status,
      );
      await _reload();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.viewingUpdateFailed),
        ),
      );
    }
  }

  Future<void> _addSlot() async {
    final input = await showDialog<ViewingSlotInput>(
      context: context,
      builder: (context) => const _SlotDialog(),
    );
    if (input == null) return;
    try {
      final slot = await widget.repository.createSlot(widget.propertyId, input);
      if (!mounted) return;
      setState(() => _publishedSlots.add(slot));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.viewingSlotPublished),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.viewingSlotFailed),
        ),
      );
    }
  }

  Future<void> _editSlot(ViewingSlot slot) async {
    final input = await showDialog<ViewingSlotInput>(
      context: context,
      builder: (context) => _SlotDialog(slot: slot),
    );
    if (input == null) return;
    try {
      final updated = await widget.repository.updateSlot(
        widget.propertyId,
        slot.id,
        ViewingSlotUpdate(
          startAt: input.startAt,
          endAt: input.endAt,
          capacity: input.capacity,
          instructionsAr: input.instructionsAr,
          instructionsEn: input.instructionsEn,
        ),
      );
      if (!mounted) return;
      setState(() {
        final index = _publishedSlots.indexWhere((item) => item.id == slot.id);
        if (index >= 0) _publishedSlots[index] = updated;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.viewingSlotFailed),
        ),
      );
    }
  }

  Future<void> _cancelSlot(ViewingSlot slot) async {
    try {
      final updated = await widget.repository.updateSlot(
        widget.propertyId,
        slot.id,
        const ViewingSlotUpdate(status: ViewingSlotStatus.cancelled),
      );
      if (!mounted) return;
      setState(() {
        final index = _publishedSlots.indexWhere((item) => item.id == slot.id);
        if (index >= 0) _publishedSlots[index] = updated;
      });
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.viewingSlotFailed),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!_allowed) {
      return Scaffold(body: Center(child: Text(strings.viewingNoAccess)));
    }
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<List<ViewingAppointment>>(
          future: _appointments,
          builder: (context, snapshot) {
            final appointments = snapshot.data ?? const <ViewingAppointment>[];
            return CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  sliver: SliverToBoxAdapter(
                    child: _Header(
                      appointmentCount: appointments.length,
                      onAdd: _addSlot,
                    ),
                  ),
                ),
                if (_publishedSlots.isNotEmpty)
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 8,
                    ),
                    sliver: SliverToBoxAdapter(
                      child: _PublishedSlots(
                        slots: _publishedSlots,
                        onEdit: _editSlot,
                        onCancel: _cancelSlot,
                      ),
                    ),
                  ),
                if (snapshot.connectionState != ConnectionState.done)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (snapshot.hasError)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text(strings.viewingLoadFailed)),
                  )
                else if (appointments.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text(strings.viewingNoAppointments)),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final group in _grouped(
                            appointments,
                          ).entries) ...[
                            Padding(
                              padding: const EdgeInsetsDirectional.fromSTEB(
                                4,
                                20,
                                4,
                                10,
                              ),
                              child: Text(
                                DateFormat.yMMMMEEEEd(
                                  Localizations.localeOf(
                                    context,
                                  ).toLanguageTag(),
                                ).format(group.key),
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            for (final appointment in group.value)
                              _AppointmentCard(
                                appointment: appointment,
                                onStatus: (status) =>
                                    _update(appointment, status),
                              ),
                          ],
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

final class _Header extends StatelessWidget {
  const _Header({required this.appointmentCount, required this.onAdd});

  final int appointmentCount;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return LayoutBuilder(
      builder: (context, constraints) {
        final copy = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              strings.viewingManagementTitle,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(strings.viewingManagementDescription),
            const SizedBox(height: 8),
            Text('${strings.viewingUpcoming}: $appointmentCount'),
          ],
        );
        final button = FilledButton.icon(
          key: const Key('add-viewing-slot'),
          onPressed: onAdd,
          icon: const Icon(Icons.add_rounded),
          label: Text(strings.viewingAddSlot),
        );
        if (constraints.maxWidth < 620) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [copy, const SizedBox(height: 16), button],
          );
        }
        return Row(
          children: [
            Expanded(child: copy),
            const SizedBox(width: 20),
            button,
          ],
        );
      },
    );
  }
}

final class _PublishedSlots extends StatelessWidget {
  const _PublishedSlots({
    required this.slots,
    required this.onEdit,
    required this.onCancel,
  });

  final List<ViewingSlot> slots;
  final ValueChanged<ViewingSlot> onEdit;
  final ValueChanged<ViewingSlot> onCancel;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              strings.viewingPublishedSlots,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            for (final slot in slots)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event_available_rounded),
                title: Text(_formatDateTime(context, slot.startAt)),
                subtitle: Text(
                  '${slot.bookedCount}/${slot.capacity} ${strings.viewingBooked} · ${_slotStatusLabel(strings, slot.status)}',
                ),
                trailing: SizedBox(
                  width: 96,
                  child: Row(
                    children: [
                      IconButton(
                        key: Key('edit-viewing-slot-${slot.id}'),
                        onPressed: slot.status == ViewingSlotStatus.cancelled
                            ? null
                            : () => onEdit(slot),
                        tooltip: strings.actionEdit,
                        icon: const Icon(Icons.edit_outlined),
                      ),
                      IconButton(
                        key: Key('cancel-viewing-slot-${slot.id}'),
                        onPressed: slot.status == ViewingSlotStatus.cancelled
                            ? null
                            : () => onCancel(slot),
                        tooltip: strings.actionCancel,
                        icon: const Icon(Icons.event_busy_outlined),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

final class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({required this.appointment, required this.onStatus});

  final ViewingAppointment appointment;
  final ValueChanged<ViewingAppointmentStatus> onStatus;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    appointment.reference,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                _StatusBadge(status: appointment.status),
              ],
            ),
            const SizedBox(height: 10),
            Text(appointment.visitorName),
            Text(appointment.visitorPhone),
            Text(appointment.visitorEmail),
            const SizedBox(height: 8),
            Text(_formatDateTime(context, appointment.startAt)),
            if (appointment.status == ViewingAppointmentStatus.confirmed) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton(
                    key: Key('complete-visit-${appointment.id}'),
                    onPressed: () =>
                        onStatus(ViewingAppointmentStatus.completed),
                    child: Text(strings.viewingComplete),
                  ),
                  OutlinedButton(
                    key: Key('no-show-visit-${appointment.id}'),
                    onPressed: () => onStatus(ViewingAppointmentStatus.noShow),
                    child: Text(strings.viewingNoShow),
                  ),
                  TextButton(
                    key: Key('cancel-visit-${appointment.id}'),
                    onPressed: () =>
                        onStatus(ViewingAppointmentStatus.cancelled),
                    child: Text(strings.actionCancel),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final ViewingAppointmentStatus status;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final label = switch (status) {
      ViewingAppointmentStatus.confirmed => strings.viewingStatusConfirmed,
      ViewingAppointmentStatus.completed => strings.viewingStatusCompleted,
      ViewingAppointmentStatus.noShow => strings.viewingStatusNoShow,
      ViewingAppointmentStatus.cancelled => strings.viewingStatusCancelled,
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: SarayaColors.warmSurface,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(label),
      ),
    );
  }
}

final class _SlotDialog extends StatefulWidget {
  const _SlotDialog({this.slot});

  final ViewingSlot? slot;

  @override
  State<_SlotDialog> createState() => _SlotDialogState();
}

final class _SlotDialogState extends State<_SlotDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _start = TextEditingController(
    text: widget.slot == null ? '' : _inputDate(widget.slot!.startAt),
  );
  late final _end = TextEditingController(
    text: widget.slot == null ? '' : _inputDate(widget.slot!.endAt),
  );
  late final _capacity = TextEditingController(
    text: '${widget.slot?.capacity ?? 1}',
  );
  late final _unitId = TextEditingController(text: widget.slot?.unitId ?? '');

  @override
  void dispose() {
    _start.dispose();
    _end.dispose();
    _capacity.dispose();
    _unitId.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final start = DateTime.tryParse(_start.text.trim().replaceFirst(' ', 'T'));
    final end = DateTime.tryParse(_end.text.trim().replaceFirst(' ', 'T'));
    final capacity = int.tryParse(_capacity.text.trim());
    if (start == null ||
        end == null ||
        !end.isAfter(start) ||
        capacity == null ||
        capacity < 1) {
      return;
    }
    Navigator.pop(
      context,
      ViewingSlotInput(
        unitId: _unitId.text.trim().isEmpty ? null : _unitId.text.trim(),
        startAt: start,
        endAt: end,
        capacity: capacity,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(strings.viewingAddSlot),
      content: Form(
        key: _formKey,
        child: SizedBox(
          width: 460,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                key: const Key('slot-start-at'),
                controller: _start,
                decoration: InputDecoration(labelText: strings.viewingStartAt),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('slot-end-at'),
                controller: _end,
                decoration: InputDecoration(labelText: strings.viewingEndAt),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('slot-capacity'),
                controller: _capacity,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.viewingCapacity),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('slot-unit-id'),
                controller: _unitId,
                decoration: InputDecoration(
                  labelText: strings.viewingUnitOptional,
                  helperText: strings.viewingPropertyWideHint,
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(strings.actionCancel),
        ),
        FilledButton(
          key: const Key('save-viewing-slot'),
          onPressed: _save,
          child: Text(strings.actionSave),
        ),
      ],
    );
  }

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? AppLocalizations.of(context)!.fieldRequired
      : null;
}

Map<DateTime, List<ViewingAppointment>> _grouped(
  List<ViewingAppointment> appointments,
) {
  final sorted = [...appointments]
    ..sort((a, b) => a.startAt.compareTo(b.startAt));
  final result = <DateTime, List<ViewingAppointment>>{};
  for (final appointment in sorted) {
    final local = appointment.startAt.toLocal();
    final date = DateTime(local.year, local.month, local.day);
    result.putIfAbsent(date, () => []).add(appointment);
  }
  return result;
}

String _formatDateTime(BuildContext context, DateTime value) =>
    DateFormat.yMMMd(
      Localizations.localeOf(context).toLanguageTag(),
    ).add_jm().format(value.toLocal());

String _inputDate(DateTime value) =>
    DateFormat('yyyy-MM-dd HH:mm').format(value.toLocal());

String _slotStatusLabel(AppLocalizations strings, ViewingSlotStatus status) =>
    switch (status) {
      ViewingSlotStatus.active => strings.viewingSlotStatusActive,
      ViewingSlotStatus.disabled => strings.viewingSlotStatusDisabled,
      ViewingSlotStatus.cancelled => strings.viewingStatusCancelled,
    };
