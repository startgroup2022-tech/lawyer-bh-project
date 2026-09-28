import 'package:dio/dio.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/documents/domain/saraya_document.dart';

abstract interface class DocumentRepository {
  Future<List<SarayaDocument>> list(String propertyId);
  Future<SarayaDocument> create(String propertyId, DocumentUploadInput input);
  Future<SarayaDocument> update(
    String propertyId,
    String id,
    DocumentInput input,
  );
}

final class EmptyDocumentRepository implements DocumentRepository {
  const EmptyDocumentRepository();
  @override
  Future<List<SarayaDocument>> list(String propertyId) async => const [];
  @override
  Future<SarayaDocument> create(String propertyId, DocumentUploadInput input) =>
      throw UnsupportedError('Document uploads are unavailable.');
  @override
  Future<SarayaDocument> update(
    String propertyId,
    String id,
    DocumentInput input,
  ) => throw UnsupportedError('Document editing is unavailable.');
}

final class ApiDocumentRepository implements DocumentRepository {
  const ApiDocumentRepository(this._apiClient);
  final SarayaApiClient _apiClient;

  @override
  Future<List<SarayaDocument>> list(String propertyId) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/documents',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response is! Map || response['items'] is! List) {
      throw ApiError.invalidResponse(200);
    }
    return List.unmodifiable(
      (response['items'] as List).map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return SarayaDocument.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<SarayaDocument> create(
    String propertyId,
    DocumentUploadInput input,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.postMultipart(
      '/api/saraya/v1/documents?$query',
      FormData.fromMap({
        'title': input.title,
        'file': MultipartFile.fromBytes(
          input.bytes,
          filename: input.fileName,
          contentType: DioMediaType.parse(input.contentType),
        ),
      }),
    );
    if (response is! Map) throw ApiError.invalidResponse(201);
    return SarayaDocument.fromJson(Map<String, Object?>.from(response));
  }

  @override
  Future<SarayaDocument> update(
    String propertyId,
    String id,
    DocumentInput input,
  ) async {
    final query = Uri(queryParameters: {'propertyId': propertyId}).query;
    final response = await _apiClient.patchJson(
      '/api/saraya/v1/documents/${Uri.encodeComponent(id)}?$query',
      data: input.toJson(),
    );
    if (response is! Map) throw ApiError.invalidResponse(200);
    return SarayaDocument.fromJson(Map<String, Object?>.from(response));
  }
}
