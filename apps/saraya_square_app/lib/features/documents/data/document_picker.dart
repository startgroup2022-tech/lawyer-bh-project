import 'package:file_picker/file_picker.dart';
import 'package:saraya_square_app/features/documents/domain/saraya_document.dart';

typedef DocumentFilePicker = Future<PickedDocumentFile?> Function();

Future<PickedDocumentFile?> pickDocumentFile() async {
  final file = await FilePicker.pickFile(
    type: FileType.custom,
    allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png'],
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return PickedDocumentFile(
    name: file.name,
    contentType: _contentType(file.name),
    bytes: bytes,
  );
}

String _contentType(String name) {
  final extension = name.split('.').last.toLowerCase();
  return switch (extension) {
    'pdf' => 'application/pdf',
    'jpg' || 'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    _ => throw const FormatException('Unsupported document type'),
  };
}
