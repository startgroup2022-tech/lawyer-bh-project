import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/formatters/money_formatter.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/domain/meeting_room.dart';

final class MeetingRoomsScreen extends StatefulWidget {
  const MeetingRoomsScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    super.key,
  });

  final MeetingRoomRepository repository;
  final String propertyId;
  final AppRole role;

  @override
  State<MeetingRoomsScreen> createState() => _MeetingRoomsScreenState();
}

final class _MeetingRoomsScreenState extends State<MeetingRoomsScreen> {
  late Future<List<MeetingRoomRecord>> _rooms = _load();
  late Future<List<MeetingRoomBookingRecord>> _bookings = _loadBookings();

  Future<List<MeetingRoomRecord>> _load() =>
      widget.repository.list(widget.propertyId);

  Future<List<MeetingRoomBookingRecord>> _loadBookings() =>
      widget.repository.listBookings(widget.propertyId);

  Future<void> _refresh() async {
    final next = _load();
    final nextBookings = _loadBookings();
    setState(() {
      _rooms = next;
      _bookings = nextBookings;
    });
    await Future.wait([next, nextBookings]);
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageMeetingRooms)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return FutureBuilder<List<MeetingRoomRecord>>(
      future: _rooms,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: OutlinedButton(
              onPressed: _refresh,
              child: Text(strings.actionRetry),
            ),
          );
        }
        return _MeetingRoomContent(
          rooms: snapshot.data ?? const [],
          onRefresh: _refresh,
          onAdd: () => _edit(),
          onEdit: (room) => _edit(room),
          bookings: _bookings,
          onAddBooking: (rooms) => _book(rooms),
          onDecision: _decideBooking,
        );
      },
    );
  }

  Future<void> _edit([MeetingRoomRecord? room]) async {
    final input = await showDialog<MeetingRoomInput>(
      context: context,
      builder: (context) => _RoomDialog(room: room),
    );
    if (input == null) return;
    if (room == null) {
      await widget.repository.create(widget.propertyId, input);
    } else {
      await widget.repository.update(widget.propertyId, room.id, input);
    }
    if (mounted) await _refresh();
  }

  Future<void> _book(List<MeetingRoomRecord> rooms) async {
    final strings = AppLocalizations.of(context)!;
    if (!rooms.any((room) => room.status == 'active')) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(strings.meetingBookingActivateRoom)),
      );
      return;
    }
    final targets = await widget.repository.bookingTargets(widget.propertyId);
    if (!mounted) return;
    if (targets.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.meetingBookingNoUsers)));
      return;
    }
    final input = await showDialog<MeetingRoomBookingInput>(
      context: context,
      builder: (context) => _BookingDialog(rooms: rooms, targets: targets),
    );
    if (input == null) return;
    try {
      await widget.repository.createBooking(widget.propertyId, input);
      if (!mounted) return;
      await _refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.meetingBookingSaved),
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.meetingBookingFailed),
          ),
        );
      }
    }
  }

  Future<void> _decideBooking(
    MeetingRoomBookingRecord booking,
    MeetingRoomBookingDecision decision,
  ) async {
    final strings = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(_decisionLabel(strings, decision)),
        content: Text(booking.purpose),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(strings.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(_decisionLabel(strings, decision)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await widget.repository.decideBooking(
        widget.propertyId,
        booking.id,
        decision,
      );
      if (!mounted) return;
      await _refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.meetingBookingSaved),
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.meetingBookingFailed),
          ),
        );
      }
    }
  }
}

final class _MeetingRoomContent extends StatelessWidget {
  const _MeetingRoomContent({
    required this.rooms,
    required this.onRefresh,
    required this.onAdd,
    required this.onEdit,
    required this.bookings,
    required this.onAddBooking,
    required this.onDecision,
  });

  final List<MeetingRoomRecord> rooms;
  final Future<void> Function() onRefresh;
  final VoidCallback onAdd;
  final ValueChanged<MeetingRoomRecord> onEdit;
  final Future<List<MeetingRoomBookingRecord>> bookings;
  final ValueChanged<List<MeetingRoomRecord>> onAddBooking;
  final Future<void> Function(
    MeetingRoomBookingRecord,
    MeetingRoomBookingDecision,
  )
  onDecision;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final active = rooms.where((room) => room.status == 'active').length;
    final maintenance = rooms
        .where((room) => room.status == 'maintenance')
        .length;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = SarayaBreakpoints.isCompact(constraints.maxWidth);
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      strings.meetingRoomTitle,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  OutlinedButton.icon(
                    key: const Key('add-meeting-booking'),
                    onPressed: () => onAddBooking(rooms),
                    icon: const Icon(Icons.event_available_outlined),
                    label: Text(strings.meetingBookingAdd),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: onAdd,
                    icon: const Icon(Icons.add),
                    label: Text(strings.meetingRoomAdd),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(strings.meetingRoomDescription),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _SummaryCard(
                    label: strings.meetingRoomTotal,
                    value: rooms.length.toString(),
                    icon: Icons.meeting_room_outlined,
                  ),
                  _SummaryCard(
                    label: strings.meetingRoomActive,
                    value: active.toString(),
                    icon: Icons.event_available_outlined,
                  ),
                  _SummaryCard(
                    label: strings.meetingRoomMaintenance,
                    value: maintenance.toString(),
                    icon: Icons.handyman_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (rooms.isEmpty)
                _EmptyState(strings: strings)
              else
                Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    for (final room in rooms)
                      SizedBox(
                        width: compact ? constraints.maxWidth : 420,
                        child: _RoomCard(
                          room: room,
                          onEdit: () => onEdit(room),
                        ),
                      ),
                  ],
                ),
              const SizedBox(height: 28),
              FutureBuilder<List<MeetingRoomBookingRecord>>(
                future: bookings,
                builder: (context, snapshot) => _BookingsSection(
                  rooms: rooms,
                  bookings: snapshot.data ?? const [],
                  loading: snapshot.connectionState != ConnectionState.done,
                  onDecision: onDecision,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _BookingsSection extends StatelessWidget {
  const _BookingsSection({
    required this.rooms,
    required this.bookings,
    required this.loading,
    required this.onDecision,
  });
  final List<MeetingRoomRecord> rooms;
  final List<MeetingRoomBookingRecord> bookings;
  final bool loading;
  final Future<void> Function(
    MeetingRoomBookingRecord,
    MeetingRoomBookingDecision,
  )
  onDecision;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (loading) return const Center(child: CircularProgressIndicator());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          strings.meetingBookingTitle,
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        if (bookings.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(strings.meetingBookingEmpty),
            ),
          )
        else
          for (final booking in bookings)
            Card(
              child: ListTile(
                leading: const Icon(Icons.event_note_outlined),
                title: Text(
                  '${_roomName(context, rooms, booking.roomId)} • ${booking.purpose}',
                ),
                subtitle: Text(
                  '${_bookingUser(context, booking)}\n${_formatBookingDate(context, booking.startAt)} – ${_formatBookingDate(context, booking.endAt)}\n${strings.meetingBookingAttendees}: ${booking.attendeeCount} • ${formatMoney(booking.currency, booking.amount)}',
                ),
                isThreeLine: true,
                trailing: Wrap(
                  spacing: 6,
                  children: [
                    Chip(label: Text(_bookingStatus(strings, booking.status))),
                    for (final decision in _decisions(booking.status))
                      TextButton(
                        onPressed: () => onDecision(booking, decision),
                        child: Text(_decisionLabel(strings, decision)),
                      ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

final class _BookingDialog extends StatefulWidget {
  const _BookingDialog({required this.rooms, required this.targets});
  final List<MeetingRoomRecord> rooms;
  final List<MeetingRoomBookingTarget> targets;
  @override
  State<_BookingDialog> createState() => _BookingDialogState();
}

final class _BookingDialogState extends State<_BookingDialog> {
  late String _roomId = widget.rooms
      .firstWhere((room) => room.status == 'active')
      .id;
  late String _userId = widget.targets.first.userId;
  late DateTime _start = DateTime.now()
      .add(const Duration(days: 1))
      .copyWith(hour: 9, minute: 0, second: 0, millisecond: 0, microsecond: 0);
  late DateTime _end = _start.add(const Duration(hours: 1));
  final _attendees = TextEditingController(text: '2');
  final _purpose = TextEditingController();

  @override
  void dispose() {
    _attendees.dispose();
    _purpose.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final activeRooms = widget.rooms
        .where((room) => room.status == 'active')
        .toList();
    return AlertDialog(
      title: Text(strings.meetingBookingAdd),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                key: const Key('meeting-booking-user'),
                initialValue: _userId,
                decoration: InputDecoration(
                  labelText: strings.meetingBookingUser,
                ),
                items: widget.targets
                    .map(
                      (target) => DropdownMenuItem(
                        value: target.userId,
                        child: Text(_bookingTargetLabel(context, target)),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _userId = value);
                },
              ),
              DropdownButtonFormField<String>(
                initialValue: _roomId,
                decoration: InputDecoration(
                  labelText: strings.meetingRoomTitle,
                ),
                items: activeRooms
                    .map(
                      (room) => DropdownMenuItem(
                        value: room.id,
                        child: Text(_localizedRoomName(context, room)),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _roomId = value);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(strings.meetingBookingStart),
                subtitle: Text(_formatDateTime(context, _start)),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: () => _pickDateTime(true),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(strings.meetingBookingEnd),
                subtitle: Text(_formatDateTime(context, _end)),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: () => _pickDateTime(false),
              ),
              TextField(
                controller: _attendees,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: strings.meetingBookingAttendees,
                ),
              ),
              TextField(
                key: const Key('meeting-booking-purpose'),
                controller: _purpose,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: strings.meetingBookingPurpose,
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
          key: const Key('save-meeting-booking'),
          onPressed: _submit,
          child: Text(strings.actionSave),
        ),
      ],
    );
  }

  Future<void> _pickDateTime(bool start) async {
    final current = start ? _start : _end;
    final date = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
    );
    if (time == null) return;
    final value = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (start) {
        _start = value;
        if (!_end.isAfter(value)) _end = value.add(const Duration(hours: 1));
      } else {
        _end = value;
      }
    });
  }

  void _submit() {
    final attendees = int.tryParse(_attendees.text);
    if (attendees == null ||
        attendees < 1 ||
        _purpose.text.trim().isEmpty ||
        !_end.isAfter(_start)) {
      return;
    }
    Navigator.pop(
      context,
      MeetingRoomBookingInput(
        roomId: _roomId,
        startAt: _start.toUtc().toIso8601String(),
        endAt: _end.toUtc().toIso8601String(),
        attendeeCount: attendees,
        purpose: _purpose.text.trim(),
        idempotencyKey: 'booking-${DateTime.now().microsecondsSinceEpoch}',
        bookedForUserId: _userId,
      ),
    );
  }
}

String _localizedRoomName(BuildContext context, MeetingRoomRecord room) =>
    Localizations.localeOf(context).languageCode == 'ar'
    ? room.nameAr
    : room.nameEn;
String _roomName(
  BuildContext context,
  List<MeetingRoomRecord> rooms,
  String id,
) {
  final matches = rooms.where((room) => room.id == id);
  return matches.isEmpty ? id : _localizedRoomName(context, matches.first);
}

String _bookingTargetLabel(
  BuildContext context,
  MeetingRoomBookingTarget target,
) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  final name = isArabic ? target.displayNameAr : target.displayNameEn;
  return '$name • ${_bookingRole(AppLocalizations.of(context)!, target.role)}';
}

String _bookingUser(BuildContext context, MeetingRoomBookingRecord booking) {
  final isArabic = Localizations.localeOf(context).languageCode == 'ar';
  final name = isArabic ? booking.bookedByNameAr : booking.bookedByNameEn;
  final displayName = name ?? booking.bookedByUserId;
  final role = booking.bookedByRole;
  return role == null
      ? displayName
      : '$displayName • ${_bookingRole(AppLocalizations.of(context)!, role)}';
}

String _bookingRole(AppLocalizations strings, String role) => switch (role) {
  'tenant' => strings.roleTenant,
  'owner' => strings.roleOwner,
  _ => role,
};

String _formatDateTime(BuildContext context, DateTime value) =>
    '${MaterialLocalizations.of(context).formatMediumDate(value)} ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(value))}';
String _formatBookingDate(BuildContext context, String value) =>
    _formatDateTime(context, DateTime.parse(value).toLocal());
List<MeetingRoomBookingDecision> _decisions(String status) => switch (status) {
  'pending' => const [
    MeetingRoomBookingDecision.confirm,
    MeetingRoomBookingDecision.reject,
  ],
  'confirmed' => const [
    MeetingRoomBookingDecision.complete,
    MeetingRoomBookingDecision.cancel,
  ],
  _ => const [],
};
String _decisionLabel(
  AppLocalizations strings,
  MeetingRoomBookingDecision decision,
) => switch (decision) {
  MeetingRoomBookingDecision.confirm => strings.meetingBookingConfirm,
  MeetingRoomBookingDecision.reject => strings.meetingBookingReject,
  MeetingRoomBookingDecision.cancel => strings.meetingBookingCancel,
  MeetingRoomBookingDecision.complete => strings.meetingBookingComplete,
};
String _bookingStatus(AppLocalizations strings, String status) =>
    switch (status) {
      'pending' => strings.meetingBookingStatusPending,
      'confirmed' => strings.meetingBookingStatusConfirmed,
      'rejected' => strings.meetingBookingStatusRejected,
      'cancelled' => strings.meetingBookingStatusCancelled,
      'completed' => strings.meetingBookingStatusCompleted,
      _ => status,
    };

final class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 190,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label),
                  const SizedBox(height: 6),
                  Text(
                    value,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _RoomCard extends StatelessWidget {
  const _RoomCard({required this.room, required this.onEdit});

  final MeetingRoomRecord room;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final name = isArabic ? room.nameAr : room.nameEn;
    final description = isArabic ? room.descriptionAr : room.descriptionEn;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.primaryContainer,
                  child: Icon(
                    Icons.meeting_room_outlined,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 2),
                      Text(room.code),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: strings.actionEdit,
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                ),
                Chip(label: Text(_statusLabel(strings, room.status))),
              ],
            ),
            if (description != null) ...[
              const SizedBox(height: 12),
              Text(description),
            ],
            const SizedBox(height: 18),
            _DetailRow(
              icon: Icons.groups_outlined,
              label: strings.meetingRoomCapacity,
              value: strings.meetingRoomPeople(room.capacity),
            ),
            _DetailRow(
              icon: Icons.payments_outlined,
              label: strings.meetingRoomRate,
              value: formatMoney('BHD', room.hourlyRate),
            ),
            _DetailRow(
              icon: Icons.schedule_outlined,
              label: strings.meetingRoomHours,
              value:
                  '${_shortTime(room.openingTime)} – ${_shortTime(room.closingTime)}',
              valueTextDirection: TextDirection.ltr,
            ),
            _DetailRow(
              icon: Icons.timelapse_outlined,
              label: strings.meetingRoomMinimum,
              value: strings.meetingRoomMinutes(room.minimumMinutes),
            ),
          ],
        ),
      ),
    );
  }
}

final class _RoomDialog extends StatefulWidget {
  const _RoomDialog({this.room});
  final MeetingRoomRecord? room;
  @override
  State<_RoomDialog> createState() => _RoomDialogState();
}

final class _RoomDialogState extends State<_RoomDialog> {
  late final _code = TextEditingController(text: widget.room?.code);
  late final _nameAr = TextEditingController(text: widget.room?.nameAr);
  late final _nameEn = TextEditingController(text: widget.room?.nameEn);
  late final _capacity = TextEditingController(
    text: widget.room?.capacity.toString() ?? '8',
  );
  late final _rate = TextEditingController(
    text: widget.room?.hourlyRate ?? '0.000',
  );
  late final _opening = TextEditingController(
    text: widget.room?.openingTime ?? '08:00:00',
  );
  late final _closing = TextEditingController(
    text: widget.room?.closingTime ?? '22:00:00',
  );
  late String _status = widget.room?.status ?? 'active';

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(
        widget.room == null ? strings.meetingRoomAdd : strings.meetingRoomEdit,
      ),
      content: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _code,
                decoration: InputDecoration(labelText: strings.meetingRoomCode),
              ),
              TextField(
                controller: _nameAr,
                decoration: InputDecoration(
                  labelText: strings.managementNameAr,
                ),
              ),
              TextField(
                controller: _nameEn,
                decoration: InputDecoration(
                  labelText: strings.managementNameEn,
                ),
              ),
              TextField(
                controller: _capacity,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: strings.meetingRoomCapacity,
                ),
              ),
              TextField(
                controller: _rate,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: strings.meetingRoomRate),
              ),
              TextField(
                controller: _opening,
                decoration: InputDecoration(
                  labelText: strings.meetingRoomOpeningTime,
                ),
              ),
              TextField(
                controller: _closing,
                decoration: InputDecoration(
                  labelText: strings.meetingRoomClosingTime,
                ),
              ),
              DropdownButtonFormField<String>(
                initialValue: _status,
                decoration: InputDecoration(labelText: strings.fieldStatus),
                items: const ['active', 'maintenance', 'inactive']
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(_statusLabel(strings, value)),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _status = value!),
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
          onPressed: () {
            final capacity = int.tryParse(_capacity.text);
            if (_code.text.trim().isEmpty ||
                _nameAr.text.trim().isEmpty ||
                _nameEn.text.trim().isEmpty ||
                capacity == null ||
                capacity < 1) {
              return;
            }
            Navigator.pop(
              context,
              MeetingRoomInput(
                code: _code.text.trim(),
                nameAr: _nameAr.text.trim(),
                nameEn: _nameEn.text.trim(),
                capacity: capacity,
                hourlyRate: _rate.text.trim(),
                openingTime: _opening.text.trim(),
                closingTime: _closing.text.trim(),
                minimumMinutes: widget.room?.minimumMinutes ?? 60,
                bookingIncrementMinutes:
                    widget.room?.bookingIncrementMinutes ?? 30,
                status: _status,
              ),
            );
          },
          child: Text(strings.actionSave),
        ),
      ],
    );
  }
}

final class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueTextDirection,
  });

  final IconData icon;
  final String label;
  final String value;
  final TextDirection? valueTextDirection;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
        Text(
          value,
          textDirection: valueTextDirection,
          style: Theme.of(context).textTheme.titleSmall,
        ),
      ],
    ),
  );
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.strings});

  final AppLocalizations strings;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.meeting_room_outlined, size: 48),
            const SizedBox(height: 12),
            Text(
              strings.meetingRoomEmptyTitle,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            Text(strings.meetingRoomEmptyDescription),
          ],
        ),
      ),
    ),
  );
}

String _shortTime(String value) =>
    value.length >= 5 ? value.substring(0, 5) : value;

String _statusLabel(AppLocalizations strings, String status) =>
    switch (status) {
      'active' => strings.meetingRoomStatusActive,
      'maintenance' => strings.meetingRoomStatusMaintenance,
      'inactive' => strings.meetingRoomStatusInactive,
      _ => strings.managementNotProvided,
    };
