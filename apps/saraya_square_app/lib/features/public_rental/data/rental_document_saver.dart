import 'package:file_picker/file_picker.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';

abstract interface class RentalDocumentSaver {
  Future<void> save(RentalLeaseDocument document);
}

final class FilePickerRentalDocumentSaver implements RentalDocumentSaver {
  const FilePickerRentalDocumentSaver();
  @override
  Future<void> save(RentalLeaseDocument document) => FilePicker.saveFile(
    dialogTitle: 'Saraya Square',
    fileName: document.fileName,
    bytes: document.bytes,
    mimeType: document.contentType,
  );
}

final class EmptyRentalDocumentSaver implements RentalDocumentSaver {
  const EmptyRentalDocumentSaver();
  @override
  Future<void> save(RentalLeaseDocument document) async {}
}
