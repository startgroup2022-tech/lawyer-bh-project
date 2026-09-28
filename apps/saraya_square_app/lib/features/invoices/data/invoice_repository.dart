import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';

abstract interface class InvoiceRepository {
  Future<List<InvoiceRecord>> list(String propertyId);
  Future<List<InvoiceTarget>> targets(String propertyId);
  Future<InvoiceRecord> create(String propertyId, InvoiceCreateInput input);
}

final class ApiInvoiceRepository implements InvoiceRepository {
  const ApiInvoiceRepository(this._apiClient);

  final SarayaApiClient _apiClient;

  @override
  Future<List<InvoiceRecord>> list(String propertyId) async {
    final path = Uri(
      path: '/api/saraya/v1/invoices',
      queryParameters: {'propertyId': propertyId},
    ).toString();
    final response = await _apiClient.getJson(path);
    if (response is! Map) throw ApiError.invalidResponse(200);
    final json = Map<String, Object?>.from(response);
    final items = json['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) {
        if (item is! Map) throw ApiError.invalidResponse(200);
        return InvoiceRecord.fromJson(Map<String, Object?>.from(item));
      }),
    );
  }

  @override
  Future<List<InvoiceTarget>> targets(String propertyId) async {
    final path = Uri(
      path: '/api/saraya/v1/invoices',
      queryParameters: {'propertyId': propertyId, 'targets': 'true'},
    ).toString();
    final response = await _apiClient.getJson(path);
    final json = _jsonObject(response);
    final items = json['items'];
    if (items is! List) throw ApiError.invalidResponse(200);
    return List.unmodifiable(
      items.map((item) => InvoiceTarget.fromJson(_jsonObject(item))),
    );
  }

  @override
  Future<InvoiceRecord> create(
    String propertyId,
    InvoiceCreateInput input,
  ) async {
    final response = await _apiClient.postJson(
      '/api/saraya/v1/invoices',
      data: input.toJson(propertyId),
    );
    return InvoiceRecord.fromJson(_jsonObject(response));
  }
}

Map<String, Object?> _jsonObject(Object? value) {
  if (value is Map) return Map<String, Object?>.from(value);
  throw ApiError.invalidResponse(200);
}
