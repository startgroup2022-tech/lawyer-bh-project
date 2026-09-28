import 'dart:typed_data';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/reports/domain/report_export.dart';

abstract interface class ReportRepository {
  Future<ReportFile> export(ReportExportRequest request);
}

final class ApiReportRepository implements ReportRepository {
  const ApiReportRepository(this._client);
  final SarayaApiClient _client;

  @override
  Future<ReportFile> export(ReportExportRequest request) async {
    final response = await _client.getBytes(
      Uri(
        path: '/api/saraya/v1/reports/export',
        queryParameters: {
          'propertyId': request.propertyId,
          'reportType': request.kind.apiValue,
          'format': request.format.name,
          'locale': request.locale,
          'from': request.from,
          'to': request.to,
          if (request.status != null) 'status': request.status!,
        },
      ).toString(),
    );
    if (response.bytes.isEmpty) throw ApiError.invalidResponse(200);
    final match = RegExp(
      r'filename="?([^";]+)',
    ).firstMatch(response.contentDisposition ?? '');
    final fallback = 'saraya-${request.kind.apiValue}.${request.format.name}';
    return ReportFile(
      bytes: Uint8List.fromList(response.bytes),
      fileName: match?.group(1) ?? fallback,
      contentType:
          response.contentType ??
          (request.format == ReportFileFormat.pdf
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    );
  }
}

final class EmptyReportRepository implements ReportRepository {
  const EmptyReportRepository();
  @override
  Future<ReportFile> export(ReportExportRequest request) =>
      throw StateError('Report repository is not configured');
}
