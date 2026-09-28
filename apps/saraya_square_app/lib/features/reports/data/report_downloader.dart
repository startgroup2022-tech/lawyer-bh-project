import 'package:file_picker/file_picker.dart';
import 'package:saraya_square_app/features/reports/domain/report_export.dart';

abstract interface class ReportDownloader {
  Future<void> save(ReportFile file);
}

final class FilePickerReportDownloader implements ReportDownloader {
  const FilePickerReportDownloader();
  @override
  Future<void> save(ReportFile file) async {
    await FilePicker.saveFile(
      dialogTitle: 'Saraya Square',
      fileName: file.fileName,
      bytes: file.bytes,
      mimeType: file.contentType,
    );
  }
}

final class EmptyReportDownloader implements ReportDownloader {
  const EmptyReportDownloader();
  @override
  Future<void> save(ReportFile file) async {}
}
