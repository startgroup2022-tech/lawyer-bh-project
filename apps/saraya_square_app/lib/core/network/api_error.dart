import 'dart:convert';

final class ApiError implements Exception {
  const ApiError({
    required this.status,
    required this.code,
    required this.messageAr,
    required this.messageEn,
    this.fieldErrors = const {},
  });

  factory ApiError.fromJson(int status, Map<String, Object?> json) {
    final rawError = json['error'];
    if (rawError is! Map) {
      return ApiError.invalidResponse(status);
    }

    final error = Map<String, Object?>.from(rawError);
    return ApiError(
      status: status,
      code: _stringValue(error['code']) ?? 'API_ERROR',
      messageAr: _stringValue(error['messageAr']) ?? 'تعذر إكمال الطلب',
      messageEn:
          _stringValue(error['messageEn']) ?? 'Unable to complete request',
      fieldErrors: _fieldErrors(error['fieldErrors']),
    );
  }

  factory ApiError.fromResponse(int status, Object? body) {
    Object? decoded = body;
    if (body is String) {
      try {
        decoded = jsonDecode(body);
      } on FormatException {
        return ApiError.invalidResponse(status);
      }
    }

    if (decoded is Map) {
      return ApiError.fromJson(status, Map<String, Object?>.from(decoded));
    }
    return ApiError.invalidResponse(status);
  }

  factory ApiError.invalidResponse(int status) => ApiError(
    status: status,
    code: 'INVALID_RESPONSE',
    messageAr: 'استجابة الخادم غير صالحة',
    messageEn: 'The server returned an invalid response',
  );

  factory ApiError.network() => const ApiError(
    status: 0,
    code: 'NETWORK_ERROR',
    messageAr: 'تعذر الاتصال بالخادم',
    messageEn: 'Unable to connect to the server',
  );

  final int status;
  final String code;
  final String messageAr;
  final String messageEn;
  final Map<String, List<String>> fieldErrors;

  static String? _stringValue(Object? value) {
    return value is String && value.isNotEmpty ? value : null;
  }

  static Map<String, List<String>> _fieldErrors(Object? value) {
    if (value is! Map) {
      return const {};
    }

    final result = <String, List<String>>{};
    for (final entry in value.entries) {
      if (entry.key is! String || entry.value is! List) {
        continue;
      }
      result[entry.key as String] = (entry.value as List)
          .whereType<String>()
          .toList(growable: false);
    }
    return Map.unmodifiable(result);
  }

  @override
  String toString() => 'ApiError($status, $code)';
}
