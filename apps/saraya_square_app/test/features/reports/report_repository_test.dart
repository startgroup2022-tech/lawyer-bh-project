import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/reports/domain/report_export.dart';

void main() {
  test('exports authenticated binary report with encoded filters', () async {
    final adapter = _BinaryAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final repository = ApiReportRepository(
      SarayaApiClient(dio: dio, sessionStore: _Store()),
    );
    final file = await repository.export(
      const ReportExportRequest(
        propertyId: 'property-1',
        kind: ReportKind.comprehensive,
        format: ReportFileFormat.pdf,
        locale: 'ar',
        from: '2026-09-01',
        to: '2026-09-30',
      ),
    );
    expect(file.bytes, [37, 80, 68, 70]);
    expect(file.fileName, 'saraya-report.pdf');
    final query = Uri.parse(adapter.request.path).queryParameters;
    expect(query, containsPair('reportType', 'comprehensive'));
    expect(query, containsPair('format', 'pdf'));
    expect(adapter.request.headers['Authorization'], 'Bearer token');
  });
}

final class _Store implements SessionStore {
  @override
  Future<void> clear() async {}
  @override
  Future<SessionTokens?> read() async =>
      const SessionTokens(accessToken: 'token', refreshToken: 'refresh');
  @override
  Future<void> write(SessionTokens value) async {}
}

final class _BinaryAdapter implements HttpClientAdapter {
  late RequestOptions request;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    request = options;
    return ResponseBody.fromBytes(
      [37, 80, 68, 70],
      200,
      headers: {
        Headers.contentTypeHeader: ['application/pdf'],
        'content-disposition': ['attachment; filename="saraya-report.pdf"'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
