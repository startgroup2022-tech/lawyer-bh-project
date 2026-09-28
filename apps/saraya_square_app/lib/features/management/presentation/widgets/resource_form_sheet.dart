import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/localization/status_labels.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/management_controller.dart';
import 'package:saraya_square_app/features/management/presentation/resource_definition.dart';

Future<bool?> showResourceFormSheet({
  required BuildContext context,
  required ManagementController controller,
  required ManagementResource resource,
  required ResourceDefinition definition,
  ManagementRecord? existing,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => ResourceFormSheet(
      controller: controller,
      resource: resource,
      definition: definition,
      existing: existing,
    ),
  );
}

final class ResourceFormSheet extends StatefulWidget {
  const ResourceFormSheet({
    required this.controller,
    required this.resource,
    required this.definition,
    this.existing,
    super.key,
  });

  final ManagementController controller;
  final ManagementResource resource;
  final ResourceDefinition definition;
  final ManagementRecord? existing;

  @override
  State<ResourceFormSheet> createState() => _ResourceFormSheetState();
}

final class _ResourceFormSheetState extends State<ResourceFormSheet> {
  final Map<String, TextEditingController> _textControllers = {};
  final Map<String, Object?> _values = {};

  @override
  void initState() {
    super.initState();
    _values.addAll(managementValues(widget.existing));
    for (final field in widget.definition.fields) {
      if (field.type == ManagementFieldType.text) {
        _textControllers[field.key] = TextEditingController(
          text: (_values[field.key] as String?) ?? '',
        );
      }
    }
    _values.putIfAbsent('isActive', () => true);
    _values.putIfAbsent('status', () => 'vacant');
    _values.putIfAbsent('role', () => 'property_manager');
    _values.putIfAbsent('rentalApprovalMode', () => 'owner_review');
  }

  @override
  void dispose() {
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) => Padding(
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
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.existing == null
                            ? strings.managementCreateRecord
                            : strings.managementEditRecord,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context, false),
                      icon: const Icon(Icons.close),
                      tooltip: strings.actionClose,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                for (final field in widget.definition.fields)
                  if (!(field.createOnly && widget.existing != null)) ...[
                    _field(context, field),
                    const SizedBox(height: 14),
                  ],
                const SizedBox(height: 6),
                FilledButton(
                  key: const Key('management-save'),
                  onPressed: widget.controller.isSubmitting ? null : _save,
                  child: widget.controller.isSubmitting
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
      ),
    );
  }

  Widget _field(BuildContext context, ManagementFormFieldDefinition field) {
    final strings = AppLocalizations.of(context)!;
    final fieldError = widget.controller.fieldErrors[field.key]?.firstOrNull;
    final errorText = switch (fieldError) {
      'REQUIRED' => strings.managementFieldRequired,
      null => null,
      _ => strings.managementFieldInvalid,
    };
    if (field.type == ManagementFieldType.boolean) {
      return SwitchListTile(
        key: Key('field-${field.key}'),
        contentPadding: EdgeInsets.zero,
        title: Text(field.label),
        value: (_values[field.key] as bool?) ?? true,
        onChanged: (value) => setState(() => _values[field.key] = value),
      );
    }
    if (field.type == ManagementFieldType.unitStatus) {
      return DropdownButtonFormField<String>(
        key: Key('field-${field.key}'),
        isExpanded: true,
        initialValue: (_values[field.key] as String?) ?? 'vacant',
        decoration: InputDecoration(
          labelText: field.label,
          errorText: errorText,
        ),
        items: [
          for (final value in const [
            'vacant',
            'occupied',
            'reserved',
            'maintenance',
            'inactive',
          ])
            DropdownMenuItem(
              value: value,
              child: Text(localizedManagementUnitStatus(strings, value)),
            ),
        ],
        onChanged: (value) => _values[field.key] = value,
      );
    }
    if (field.type == ManagementFieldType.role) {
      return DropdownButtonFormField<String>(
        key: Key('field-${field.key}'),
        isExpanded: true,
        initialValue: (_values[field.key] as String?) ?? 'property_manager',
        decoration: InputDecoration(
          labelText: field.label,
          errorText: errorText,
        ),
        items: [
          for (final value in const [
            'property_manager',
            'accountant',
            'maintenance',
            'owner',
            'tenant',
          ])
            DropdownMenuItem(
              value: value,
              child: Text(localizedRoleLabel(strings, value)),
            ),
        ],
        onChanged: (value) => _values[field.key] = value,
      );
    }
    if (field.type == ManagementFieldType.propertyRentalApproval ||
        field.type == ManagementFieldType.unitRentalApproval) {
      final inherit = field.type == ManagementFieldType.unitRentalApproval;
      return DropdownButtonFormField<String>(
        key: Key('field-${field.key}'),
        isExpanded: true,
        initialValue: inherit
            ? (_values[field.key] as String?) ?? 'inherit'
            : (_values[field.key] as String?) ?? 'owner_review',
        decoration: InputDecoration(
          labelText: field.label,
          errorText: errorText,
        ),
        items: [
          if (inherit)
            DropdownMenuItem(
              value: 'inherit',
              child: Text(strings.rentalApprovalInherit),
            ),
          DropdownMenuItem(
            value: 'instant',
            child: Text(strings.rentalApprovalInstant),
          ),
          DropdownMenuItem(
            value: 'owner_review',
            child: Text(strings.rentalApprovalOwnerReview),
          ),
        ],
        onChanged: (value) =>
            _values[field.key] = value == 'inherit' ? null : value,
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: Key('field-${field.key}'),
          controller: _textControllers[field.key],
          decoration: InputDecoration(
            labelText: field.label,
            helperText: field.helper,
            error: errorText == null
                ? null
                : Text(errorText, key: Key('field-${field.key}-error')),
            errorMaxLines: 2,
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    for (final entry in _textControllers.entries) {
      _values[entry.key] = entry.value.text.trim();
    }
    final success = await widget.controller.save(
      managementInputFromValues(widget.resource, _values),
      existing: widget.existing,
    );
    if (success && mounted) Navigator.pop(context, true);
  }
}
