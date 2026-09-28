import 'package:flutter/material.dart';
import 'package:saraya_square_app/core/design/breakpoints.dart';
import 'package:saraya_square_app/core/localization/app_localizations.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/documents/data/document_picker.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/documents/domain/saraya_document.dart';

final class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({
    required this.repository,
    required this.propertyId,
    required this.role,
    this.filePicker,
    super.key,
  });
  final DocumentRepository repository;
  final String propertyId;
  final AppRole role;
  final DocumentFilePicker? filePicker;

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

final class _DocumentsScreenState extends State<DocumentsScreen> {
  late Future<List<SarayaDocument>> _documents = widget.repository.list(
    widget.propertyId,
  );
  bool _uploading = false;

  Future<void> _refresh() async {
    final next = widget.repository.list(widget.propertyId);
    setState(() => _documents = next);
    await next;
  }

  Future<void> _edit(SarayaDocument document) async {
    final input = await showDialog<DocumentInput>(
      context: context,
      builder: (context) => _DocumentDialog(document: document),
    );
    if (input == null) return;
    try {
      await widget.repository.update(widget.propertyId, document.id, input);
      if (!mounted) return;
      await _refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.documentUpdated)),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.documentUpdateFailed),
          ),
        );
      }
    }
  }

  Future<void> _add() async {
    final input = await showDialog<DocumentUploadInput>(
      context: context,
      builder: (context) => _DocumentUploadDialog(
        filePicker: widget.filePicker ?? pickDocumentFile,
      ),
    );
    if (input == null || _uploading) return;
    setState(() => _uploading = true);
    try {
      await widget.repository.create(widget.propertyId, input);
      if (!mounted) return;
      await _refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.documentUploaded)),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.documentUploadFailed),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (!roleHasCapability(widget.role, AppCapability.manageDocuments)) {
      return Center(child: Text(strings.permissionDeniedTitle));
    }
    return FutureBuilder<List<SarayaDocument>>(
      future: _documents,
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
        return _DocumentContent(
          documents: snapshot.data ?? const [],
          onRefresh: _refresh,
          onEdit: _edit,
          onAdd: _uploading ? null : _add,
        );
      },
    );
  }
}

final class _DocumentContent extends StatelessWidget {
  const _DocumentContent({
    required this.documents,
    required this.onRefresh,
    required this.onEdit,
    required this.onAdd,
  });
  final List<SarayaDocument> documents;
  final Future<void> Function() onRefresh;
  final ValueChanged<SarayaDocument> onEdit;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    if (documents.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            _DocumentHeader(onAdd: onAdd),
            const SizedBox(height: 6),
            Text(strings.documentDescription),
            const SizedBox(height: 48),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.folder_open_outlined, size: 52),
                  const SizedBox(height: 12),
                  Text(
                    strings.documentEmptyTitle,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  Text(strings.documentEmptyDescription),
                ],
              ),
            ),
          ],
        ),
      );
    }
    final active = documents.where((item) => item.status == 'active').length;
    final expiring = documents.where((item) => item.expiresOn != null).length;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: LayoutBuilder(
        builder: (context, constraints) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            _DocumentHeader(onAdd: onAdd),
            const SizedBox(height: 6),
            Text(strings.documentDescription),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Summary(
                  label: strings.documentTotal,
                  value: '${documents.length}',
                ),
                _Summary(label: strings.documentActive, value: '$active'),
                _Summary(label: strings.documentWithExpiry, value: '$expiring'),
              ],
            ),
            const SizedBox(height: 20),
            if (SarayaBreakpoints.isCompact(constraints.maxWidth))
              ...documents.map(
                (item) =>
                    _DocumentCard(document: item, onEdit: () => onEdit(item)),
              )
            else
              _DocumentTable(documents: documents, onEdit: onEdit),
          ],
        ),
      ),
    );
  }
}

final class _DocumentHeader extends StatelessWidget {
  const _DocumentHeader({required this.onAdd});

  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Row(
      children: [
        Expanded(
          child: Text(
            strings.documentTitle,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ),
        FilledButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.upload_file_outlined),
          label: Text(strings.documentAdd),
        ),
      ],
    );
  }
}

final class _DocumentUploadDialog extends StatefulWidget {
  const _DocumentUploadDialog({required this.filePicker});

  final DocumentFilePicker filePicker;

  @override
  State<_DocumentUploadDialog> createState() => _DocumentUploadDialogState();
}

final class _DocumentUploadDialogState extends State<_DocumentUploadDialog> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  PickedDocumentFile? _file;
  String? _fileError;
  bool _picking = false;

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    if (_picking) return;
    setState(() {
      _picking = true;
      _fileError = null;
    });
    try {
      final file = await widget.filePicker();
      if (!mounted || file == null) return;
      setState(() => _file = file);
    } catch (_) {
      if (mounted) {
        setState(() {
          _fileError = AppLocalizations.of(context)!.documentUploadFailed;
        });
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  void _submit() {
    final strings = AppLocalizations.of(context)!;
    final file = _file;
    setState(() {
      _fileError = file == null
          ? strings.documentFileRequired
          : file.bytes.length > 4 * 1024 * 1024
          ? strings.documentFileTooLarge
          : null;
    });
    if (_formKey.currentState?.validate() != true || _fileError != null) return;
    Navigator.pop(
      context,
      DocumentUploadInput(
        title: _title.text.trim(),
        fileName: file!.name,
        contentType: file.contentType,
        bytes: file.bytes,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(strings.documentAdd),
      content: SizedBox(
        width: 480,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                key: const Key('document-upload-name'),
                controller: _title,
                decoration: InputDecoration(labelText: strings.documentName),
                validator: (value) => value == null || value.trim().isEmpty
                    ? strings.managementFieldRequired
                    : null,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                key: const Key('document-upload-file'),
                onPressed: _picking ? null : _pick,
                icon: const Icon(Icons.attach_file),
                label: Text(strings.documentChooseFile),
              ),
              const SizedBox(height: 8),
              Text(_file?.name ?? strings.documentNoFileSelected),
              Text(
                _fileError ?? strings.documentAllowedFiles,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _fileError == null
                      ? Theme.of(context).colorScheme.onSurfaceVariant
                      : Theme.of(context).colorScheme.error,
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
          key: const Key('document-upload-submit'),
          onPressed: _submit,
          child: Text(strings.documentUpload),
        ),
      ],
    );
  }
}

final class _Summary extends StatelessWidget {
  const _Summary({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 190,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
          ],
        ),
      ),
    ),
  );
}

final class _DocumentTable extends StatelessWidget {
  const _DocumentTable({required this.documents, required this.onEdit});
  final List<SarayaDocument> documents;
  final ValueChanged<SarayaDocument> onEdit;
  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: [
            DataColumn(label: Text(strings.documentName)),
            DataColumn(label: Text(strings.documentCategory)),
            DataColumn(label: Text(strings.fieldUnit)),
            DataColumn(label: Text(strings.fieldTenant)),
            DataColumn(label: Text(strings.documentFileSize)),
            DataColumn(label: Text(strings.fieldStatus)),
            DataColumn(label: Text(strings.documentUploadedBy)),
            DataColumn(label: Text(strings.leaseActions)),
          ],
          rows: documents
              .map(
                (item) => DataRow(
                  cells: [
                    DataCell(Text(item.title)),
                    DataCell(Text(_category(strings, item.category))),
                    DataCell(
                      Text(item.unitNumber ?? strings.managementNotProvided),
                    ),
                    DataCell(Text(_tenant(context, item))),
                    DataCell(Text(_size(item.sizeBytes))),
                    DataCell(
                      Text(
                        item.status == 'active'
                            ? strings.documentStatusActive
                            : strings.documentStatusArchived,
                      ),
                    ),
                    DataCell(Text(_uploader(context, item))),
                    DataCell(
                      IconButton(
                        tooltip: strings.actionEdit,
                        onPressed: () => onEdit(item),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                    ),
                  ],
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

final class _DocumentCard extends StatelessWidget {
  const _DocumentCard({required this.document, required this.onEdit});
  final SarayaDocument document;
  final VoidCallback onEdit;
  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    return Card(
      child: ListTile(
        leading: const Icon(Icons.description_outlined),
        title: Text(document.title),
        subtitle: Text(
          '${_category(strings, document.category)} • ${document.unitNumber ?? strings.managementNotProvided} • ${_size(document.sizeBytes)}',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              document.status == 'active'
                  ? strings.documentStatusActive
                  : strings.documentStatusArchived,
            ),
            IconButton(
              tooltip: strings.actionEdit,
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined),
            ),
          ],
        ),
      ),
    );
  }
}

final class _DocumentDialog extends StatefulWidget {
  const _DocumentDialog({required this.document});
  final SarayaDocument document;
  @override
  State<_DocumentDialog> createState() => _DocumentDialogState();
}

final class _DocumentDialogState extends State<_DocumentDialog> {
  late final _title = TextEditingController(text: widget.document.title);
  late final _expiresOn = TextEditingController(
    text: widget.document.expiresOn,
  );
  late String _category = widget.document.category;
  late String _status = widget.document.status;

  @override
  void dispose() {
    _title.dispose();
    _expiresOn.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context)!;
    const categories = [
      'lease',
      'identity',
      'commercial_registration',
      'handover',
      'invoice',
      'receipt',
      'maintenance',
      'utility',
      'other',
    ];
    return AlertDialog(
      title: Text(strings.documentEdit),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _title,
              decoration: InputDecoration(labelText: strings.documentName),
            ),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: InputDecoration(labelText: strings.documentCategory),
              items: categories
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(_categoryLabel(strings, value)),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _category = value);
              },
            ),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: InputDecoration(labelText: strings.fieldStatus),
              items: [
                DropdownMenuItem(
                  value: 'active',
                  child: Text(strings.documentStatusActive),
                ),
                DropdownMenuItem(
                  value: 'archived',
                  child: Text(strings.documentStatusArchived),
                ),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _status = value);
              },
            ),
            TextField(
              controller: _expiresOn,
              decoration: InputDecoration(labelText: strings.documentExpiresOn),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(strings.actionCancel),
        ),
        FilledButton(
          onPressed: () {
            if (_title.text.trim().isEmpty) return;
            Navigator.pop(
              context,
              DocumentInput(
                title: _title.text.trim(),
                category: _category,
                status: _status,
                expiresOn: _expiresOn.text.trim().isEmpty
                    ? null
                    : _expiresOn.text.trim(),
              ),
            );
          },
          child: Text(strings.actionSave),
        ),
      ],
    );
  }
}

String _tenant(BuildContext context, SarayaDocument document) {
  final ar = Localizations.localeOf(context).languageCode == 'ar';
  return (ar ? document.tenantNameAr : document.tenantNameEn) ??
      AppLocalizations.of(context)!.managementNotProvided;
}

String _uploader(BuildContext context, SarayaDocument document) {
  final ar = Localizations.localeOf(context).languageCode == 'ar';
  return (ar ? document.uploadedByNameAr : document.uploadedByNameEn) ??
      AppLocalizations.of(context)!.managementNotProvided;
}

String _size(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).round()} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

String _category(AppLocalizations strings, String value) => switch (value) {
  'lease' => strings.documentCategoryLease,
  'identity' => strings.documentCategoryIdentity,
  'commercial_registration' => strings.documentCategoryCommercialRegistration,
  'handover' => strings.documentCategoryHandover,
  'invoice' => strings.documentCategoryInvoice,
  'receipt' => strings.documentCategoryReceipt,
  'maintenance' => strings.documentCategoryMaintenance,
  'utility' => strings.documentCategoryUtility,
  _ => strings.documentCategoryOther,
};

String _categoryLabel(AppLocalizations strings, String value) =>
    _category(strings, value);
