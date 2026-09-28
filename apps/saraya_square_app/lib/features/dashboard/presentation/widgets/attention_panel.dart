import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';

final class AttentionItem {
  const AttentionItem({
    required this.key,
    required this.icon,
    required this.label,
    required this.value,
    this.isDanger = false,
  });

  final Key key;
  final IconData icon;
  final String label;
  final String value;
  final bool isDanger;
}

final class AttentionPanel extends StatelessWidget {
  const AttentionPanel({required this.title, required this.items, super.key});

  final String title;
  final List<AttentionItem> items;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (var index = 0; index < items.length; index++) ...[
              _AttentionRow(item: items[index]),
              if (index < items.length - 1) const Divider(height: 24),
            ],
          ],
        ),
      ),
    );
  }
}

final class _AttentionRow extends StatelessWidget {
  const _AttentionRow({required this.item});

  final AttentionItem item;

  @override
  Widget build(BuildContext context) {
    final color = item.isDanger ? SarayaColors.danger : SarayaColors.deepGreen;
    return Row(
      key: item.key,
      children: [
        Icon(item.icon, color: color),
        const SizedBox(width: 12),
        Expanded(child: Text(item.label)),
        Text(
          item.value,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(color: color),
        ),
      ],
    );
  }
}
