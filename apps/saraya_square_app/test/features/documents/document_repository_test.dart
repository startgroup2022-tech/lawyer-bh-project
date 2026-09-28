import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/documents/domain/saraya_document.dart';

void main() {
  test(
    'uploads document name and file as authenticated multipart data',
    () async {
      final adapter = _DocumentAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
        ..httpClientAdapter = adapter;
      final repository = ApiDocumentRepository(
        SarayaApiClient(
          dio: dio,
          sessionStore: _SessionStore(
            const SessionTokens(accessToken: 'access-token'),
          ),
        ),
      );

      final created = await repository.create(
        'property-1',
        DocumentUploadInput(
          title: 'Insurance certificate',
          fileName: 'insurance.pdf',
          contentType: 'application/pdf',
          bytes: Uint8List.fromList([1, 2, 3]),
        ),
      );

      final request = adapter.request!;
      expect(request.path, '/api/saraya/v1/documents?propertyId=property-1');
      expect(request.headers['Authorization'], 'Bearer access-token');
      final form = request.data! as FormData;
      expect(form.fields.single.key, 'title');
      expect(form.fields.single.value, 'Insurance certificate');
      expect(form.files.single.value.filename, 'insurance.pdf');
      expect(created.title, 'Insurance certificate');
    },
  );
}

final class _DocumentAdapter implements HttpClientAdapter {
  RequestOptions? request;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    request = options;
    return ResponseBody.fromString(
      jsonEncode({
        'id': 'document-2',
        'propertyId': 'property-1',
        'category': 'other',
        'title': 'Insurance certificate',
        'originalName': 'insurance.pdf',
        'contentType': 'application/pdf',
        'sizeBytes': 3,
        'status': 'active',
        'createdAt': '2026-09-26T12:00:00.000Z',
      }),
      201,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _SessionStore implements SessionStore {
  _SessionStore(this.value);
  SessionTokens? value;

  @override
  Future<void> clear() async => value = null;

  @override
  Future<SessionTokens?> read() async => value;

  @override
  Future<void> write(SessionTokens value) async => this.value = value;
}
