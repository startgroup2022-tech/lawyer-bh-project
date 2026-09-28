import 'package:flutter/material.dart';
import 'package:saraya_square_app/features/management/domain/management_models.dart';
import 'package:saraya_square_app/features/management/presentation/resource_definition.dart';

final class ResourceTable extends StatelessWidget {
  const ResourceTable({
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
    return Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        key: const Key('management-resource-table'),
        scrollDirection: Axis.horizontal,
        child: DataTable(
          horizontalMargin: 16,
          columnSpacing: 24,
          columns: [
            for (final column in definition.columns)
              DataColumn(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(column.label),
                    const SizedBox(width: 4),
                    const Icon(Icons.swap_vert_rounded, size: 16),
                  ],
                ),
              ),
            if (canEdit || canDeactivate)
              const DataColumn(label: SizedBox.shrink()),
          ],
          rows: [
            for (final item in items)
              DataRow(
                cells: [
                  for (final column in definition.columns)
                    DataCell(Text(column.value(item))),
                  if (canEdit || canDeactivate)
                    DataCell(
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (canEdit)
                            IconButton(
                              key: Key('edit-${item.id}'),
                              onPressed: () => onEdit(item),
                              icon: const Icon(Icons.edit_outlined),
                            ),
                          if (canDeactivate)
                            IconButton(
                              key: Key('deactivate-${item.id}'),
                              onPressed: () => onDeactivate(item),
                              icon: const Icon(Icons.block_outlined),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
