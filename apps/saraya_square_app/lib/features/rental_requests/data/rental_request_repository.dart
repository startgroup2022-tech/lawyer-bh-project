import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/rental_requests/domain/rental_request.dart';

abstract interface class RentalRequestRepository {
  Future<RentalRequestPage> list(
    String propertyId, {
    String? cursor,
    int limit = 25,
  });
  Future<void> decide(
    String propertyId,
    String requestId, {
    required bool approve,
    String? reason,
    required String idempotencyKey,
  });
  Future<void> decideOffline(
    String demandId, {
    required bool approve,
    String? failureCode,
    required String idempotencyKey,
  });
  Future<RentalRequestDocument> downloadDocument(
    String propertyId,
    String requestId,
    RentalRequestDocumentKind kind,
  );
}

final class EmptyRentalRequestRepository implements RentalRequestRepository {
  const EmptyRentalRequestRepository();
  @override
  Future<RentalRequestPage> list(
    String propertyId, {
    String? cursor,
    int limit = 25,
  }) async => const RentalRequestPage(items: [], nextCursor: null);
  @override
  Future<void> decide(
    String propertyId,
    String requestId, {
    required bool approve,
    String? reason,
    required String idempotencyKey,
  }) async {}
  @override
  Future<void> decideOffline(
    String demandId, {
    required bool approve,
    String? failureCode,
    required String idempotencyKey,
  }) async {}
  @override
  Future<RentalRequestDocument> downloadDocument(
    String propertyId,
    String requestId,
    RentalRequestDocumentKind kind,
  ) => throw UnimplementedError();
}

abstract interface class RentalRequestDocumentSaver {
  Future<void> save(RentalRequestDocument document);
}

final class FilePickerRentalRequestDocumentSaver
    implements RentalRequestDocumentSaver {
  const FilePickerRentalRequestDocumentSaver();

  @override
  Future<void> save(RentalRequestDocument document) => FilePicker.saveFile(
    dialogTitle: 'Saraya Square',
    fileName: document.fileName,
    bytes: document.bytes,
    mimeType: document.contentType,
  );
}

final class EmptyRentalRequestDocumentSaver
    implements RentalRequestDocumentSaver {
  const EmptyRentalRequestDocumentSaver();
  @override
  Future<void> save(RentalRequestDocument document) async {}
}

final class ApiRentalRequestRepository implements RentalRequestRepository {
  const ApiRentalRequestRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<RentalRequestPage> list(
    String propertyId, {
    String? cursor,
    int limit = 25,
  }) async {
    final response = await _apiClient.getJson(
      Uri(
        path: '/api/saraya/v1/rental-requests',
        queryParameters: {
          'propertyId': propertyId,
          'limit': '$limit',
          'cursor': ?cursor,
        },
      ).toString(),
    );
    final json = _object(response);
    final items = json['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    final nextCursor = json['nextCursor'];
    if (nextCursor != null && nextCursor is! String) {
      throw ApiError.invalidResponse(200);
    }
    return RentalRequestPage(
      items: List.unmodifiable(
        items.map((item) => RentalRequestQueueItem.fromJson(_object(item))),
      ),
      nextCursor: nextCursor as String?,
    );
  }

  @override
  Future<void> decide(
    String propertyId,
    String requestId, {
    required bool approve,
    String? reason,
    required String idempotencyKey,
  }) async {
    final data = <String, Object?>{
      'propertyId': propertyId,
      'decision': approve ? 'approve' : 'reject',
      'idempotencyKey': idempotencyKey,
    };
    if (reason != null) {
      data['reason'] = reason;
    }
    await _apiClient.postJson(
      '/api/saraya/v1/rental-requests/${Uri.encodeComponent(requestId)}/decision',
      data: data,
      headers: {'idempotency-key': idempotencyKey},
    );
  }

  @override
  Future<void> decideOffline(
    String demandId, {
    required bool approve,
    String? failureCode,
    required String idempotencyKey,
  }) async {
    await _apiClient.postJson(
      '/api/saraya/v1/payment-demands/${Uri.encodeComponent(demandId)}/decision',
      data: {
        'decision': approve ? 'approve' : 'reject',
        if (!approve) 'failureCode': failureCode ?? 'REJECTED_BY_REVIEWER',
        'idempotencyKey': idempotencyKey,
      },
      headers: {'idempotency-key': idempotencyKey},
    );
  }

  @override
  Future<RentalRequestDocument> downloadDocument(
    String propertyId,
    String requestId,
    RentalRequestDocumentKind kind,
  ) async {
    final response = await _apiClient.getBytes(
      Uri(
        path:
            '/api/saraya/v1/rental-requests/${Uri.encodeComponent(requestId)}/documents/${kind.apiValue}',
        queryParameters: {'propertyId': propertyId},
      ).toString(),
    );
    if (response.bytes.isEmpty) throw ApiError.invalidResponse(200);
    return RentalRequestDocument(
      bytes: Uint8List.fromList(response.bytes),
      fileName: _fileName(response.contentDisposition) ?? 'rental-document',
      contentType: response.contentType ?? 'application/octet-stream',
    );
  }
}

Map<String, Object?> _object(Object? value) {
  if (value is Map) return Map<String, Object?>.from(value);
  throw ApiError.invalidResponse(200);
}

String? _fileName(String? disposition) {
  final match = disposition == null
      ? null
      : RegExp('filename="([^"]+)"').firstMatch(disposition);
  return match?.group(1);
}
