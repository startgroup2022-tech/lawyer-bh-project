import 'package:flutter/material.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/resource_definition.dart';

final class ResourceCards extends StatelessWidget {
  const ResourceCards({
    required this.definition,
    required this.items,
    required this.canEdit,
    required this.canDeactivate,
    required this.onEdit,
    required this.onDeactivate,
    super.key,
  });

  final ResourceDefinition definition;
  final List<ManagementRecord> items;
  final bool canEdit;
  final bool canDeactivate;
  final ValueChanged<ManagementRecord> onEdit;
  final ValueChanged<ManagementRecord> onDeactivate;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('management-resource-cards'),
      children: [
        for (final item in items)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final column in definition.columns)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 112,
                            child: Text(
                              column.label,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              column.value(item),
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (canEdit || canDeactivate)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (canEdit)
                          IconButton.filledTonal(
                            key: Key('edit-${item.id}'),
                            onPressed: () => onEdit(item),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                        if (canDeactivate) ...[
                          const SizedBox(width: 8),
                          IconButton.filledTonal(
                            key: Key('deactivate-${item.id}'),
                            onPressed: () => onDeactivate(item),
                            icon: const Icon(Icons.block_outlined),
                          ),
                        ],
                      ],
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
