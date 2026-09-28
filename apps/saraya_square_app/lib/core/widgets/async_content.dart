import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/saraya_colors.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';

enum AsyncContentStatus { loading, empty, permissionDenied, error, data }

final class AsyncContent<T> extends StatelessWidget {
  const AsyncContent.loading({required this.builder, super.key})
    : status = AsyncContentStatus.loading,
      data = null,
      onRetry = null;

  const AsyncContent.empty({required this.builder, super.key})
    : status = AsyncContentStatus.empty,
      data = null,
      onRetry = null;

  const AsyncContent.permissionDenied({required this.builder, super.key})
    : status = AsyncContentStatus.permissionDenied,
      data = null,
      onRetry = null;

  const AsyncContent.error({required this.builder, this.onRetry, super.key})
    : status = AsyncContentStatus.error,
      data = null;

  const AsyncContent.data({
    required T this.data,
    required this.builder,
    super.key,
  }) : status = AsyncContentStatus.data,
       onRetry = null;

  final AsyncContentStatus status;
  final T? data;
  final Widget Function(T data) builder;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return switch (status) {
      AsyncContentStatus.loading => const _LoadingSkeleton(),
      AsyncContentStatus.empty => _StatePanel(
        icon: Icons.inbox_outlined,
        title: strings.emptyTitle,
        description: strings.emptyDescription,
      ),
      AsyncContentStatus.permissionDenied => _StatePanel(
        icon: Icons.lock_outline,
        title: strings.permissionDeniedTitle,
        description: strings.permissionDeniedDescription,
      ),
      AsyncContentStatus.error => _StatePanel(
        icon: Icons.cloud_off_outlined,
        title: strings.errorTitle,
        description: strings.errorDescription,
        action: onRetry == null
            ? null
            : OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(strings.actionRetry),
              ),
      ),
      AsyncContentStatus.data => builder(data as T),
    };
  }
}

final class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: AppLocalizations.of(context)!.loadingLabel,
      child: ExcludeSemantics(
        child: Padding(
          key: const Key('async-loading-skeleton'),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: const [
              _SkeletonLine(widthFactor: 0.36, height: 24),
              SizedBox(height: 20),
              _SkeletonLine(widthFactor: 1, height: 120),
              SizedBox(height: 12),
              _SkeletonLine(widthFactor: 1, height: 72),
            ],
          ),
        ),
      ),
    );
  }
}

final class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.widthFactor, required this.height});

  final double widthFactor;
  final double height;

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      alignment: AlignmentDirectional.centerStart,
      widthFactor: widthFactor,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: SarayaColors.border.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

final class _StatePanel extends StatelessWidget {
  const _StatePanel({
    required this.icon,
    required this.title,
    required this.description,
    this.action,
  });

  final IconData icon;
  final String title;
  final String description;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 36, color: SarayaColors.green),
                const SizedBox(height: 16),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                if (action case final action?) ...[
                  const SizedBox(height: 20),
                  action,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
