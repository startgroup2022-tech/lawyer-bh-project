import 'package:dio/dio.dart';

import '../session/session_store.dart';
import '../session/session_tokens.dart';
import 'api_error.dart';
import 'client_platform.dart';
import 'refresh_coordinator.dart';

typedef UnauthenticatedCallback = void Function();

final class SarayaApiClient {
  SarayaApiClient({
    required Dio dio,
    required SessionStore sessionStore,
    UnauthenticatedCallback? onUnauthenticated,
    bool? isNative,
  }) : _dio = dio,
       _sessionStore = sessionStore,
       _onUnauthenticated = onUnauthenticated,
       _isNative = isNative ?? isNativeClient {
    _refreshCoordinator = RefreshCoordinator(_refreshSession);
  }

  final Dio _dio;
  final SessionStore _sessionStore;
  final UnauthenticatedCallback? _onUnauthenticated;
  final bool _isNative;
  late final RefreshCoordinator _refreshCoordinator;

  Future<Object?> getJson(String path) => _request('GET', path);

  Future<BinaryResponse> getBytes(String path, {bool canRefresh = true}) async {
    final tokens = await _sessionStore.read();
    try {
      final response = await _dio.request<List<int>>(
        path,
        options: Options(
          method: 'GET',
          headers: _headers(tokens),
          responseType: ResponseType.bytes,
          validateStatus: (_) => true,
        ),
      );
      final status = response.statusCode ?? 0;
      if (status >= 200 && status < 300 && response.data != null) {
        return BinaryResponse(
          bytes: response.data!,
          contentType: response.headers.value(Headers.contentTypeHeader),
          contentDisposition: response.headers.value('content-disposition'),
        );
      }
      if (canRefresh && status == 401 && _hasRefreshSession(tokens)) {
        await _refreshCoordinator.refresh();
        return getBytes(path, canRefresh: false);
      }
      throw ApiError.fromResponse(status, response.data);
    } on DioException catch (error) {
      throw ApiError.fromResponse(
        error.response?.statusCode ?? 0,
        error.response?.data,
      );
    }
  }

  Future<Object?> postJson(
    String path, {
    Object? data,
    Map<String, Object?>? headers,
  }) => _request('POST', path, data: data, extraHeaders: headers);

  Future<Object?> postMultipart(
    String path,
    FormData data, {
    Map<String, Object?>? headers,
  }) => _request(
    'POST',
    path,
    data: data,
    contentType: Headers.multipartFormDataContentType,
    extraHeaders: headers,
  );

  Future<Object?> patchJson(String path, {Object? data}) =>
      _request('PATCH', path, data: data);

  Future<Object?> delete(String path) => _request('DELETE', path);

  Future<Object?> _request(
    String method,
    String path, {
    Object? data,
    bool canRefresh = true,
    String? contentType,
    Map<String, Object?>? extraHeaders,
  }) async {
    final tokens = await _sessionStore.read();
    try {
      final response = await _dio.request<Object?>(
        path,
        data: data,
        options: Options(
          method: method,
          headers: {..._headers(tokens), ...?extraHeaders},
          contentType:
              contentType ?? (data == null ? null : Headers.jsonContentType),
          validateStatus: (_) => true,
        ),
      );
      final status = response.statusCode ?? 0;
      if (status >= 200 && status < 300) {
        return response.data;
      }

      final error = ApiError.fromResponse(status, response.data);
      if (canRefresh && status == 401 && _hasRefreshSession(tokens)) {
        try {
          await _refreshCoordinator.refresh();
          return _request(
            method,
            path,
            data: data is FormData ? data.clone() : data,
            canRefresh: false,
            contentType: contentType,
            extraHeaders: extraHeaders,
          );
        } on ApiError {
          await _endSession();
          rethrow;
        }
      }
      if (!canRefresh && status == 401) {
        await _endSession();
      }
      throw error;
    } on DioException catch (error) {
      if (error.response != null) {
        throw ApiError.fromResponse(
          error.response?.statusCode ?? 0,
          error.response?.data,
        );
      }
      throw ApiError.network();
    }
  }

  Future<SessionTokens> _refreshSession() async {
    final current = await _sessionStore.read();
    final response = await _dio.request<Object?>(
      '/api/saraya/v1/auth/refresh',
      data: _isNative ? {'refreshToken': current?.refreshToken} : null,
      options: Options(
        method: 'POST',
        headers: _refreshHeaders(current),
        contentType: _isNative ? Headers.jsonContentType : null,
        validateStatus: (_) => true,
      ),
    );
    final status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw ApiError.fromResponse(status, response.data);
    }

    final payload = _jsonObject(response.data);
    final accessToken = payload['accessToken'];
    if (accessToken is! String || accessToken.isEmpty) {
      throw ApiError.invalidResponse(status);
    }
    final next = SessionTokens(
      accessToken: accessToken,
      refreshToken:
          _optionalString(payload['refreshToken']) ?? current?.refreshToken,
      csrfToken: _optionalString(payload['csrfToken']) ?? current?.csrfToken,
    );
    await _sessionStore.write(next);
    return next;
  }

  Map<String, Object?> _headers(SessionTokens? tokens) {
    final headers = <String, Object?>{};
    if (tokens != null && tokens.accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer ${tokens.accessToken}';
    }
    if (_isNative) {
      headers['x-saraya-client'] = 'native';
    } else if (tokens?.csrfToken case final csrfToken?) {
      headers['x-saraya-csrf'] = csrfToken;
    }
    return headers;
  }

  Map<String, Object?> _refreshHeaders(SessionTokens? tokens) {
    final headers = <String, Object?>{};
    if (_isNative) {
      headers['x-saraya-client'] = 'native';
    } else if (tokens?.csrfToken case final csrfToken?) {
      headers['x-saraya-csrf'] = csrfToken;
    }
    return headers;
  }

  bool _hasRefreshSession(SessionTokens? tokens) {
    final refreshCredential = _isNative
        ? tokens?.refreshToken
        : tokens?.csrfToken;
    return refreshCredential != null && refreshCredential.isNotEmpty;
  }

  Future<void> _endSession() async {
    await _sessionStore.clear();
    _onUnauthenticated?.call();
  }

  static Map<String, Object?> _jsonObject(Object? value) {
    if (value is Map) {
      final map = Map<String, Object?>.from(value);
      final data = map['data'];
      if (data is Map) {
        return Map<String, Object?>.from(data);
      }
      return map;
    }
    return const {};
  }

  static String? _optionalString(Object? value) {
    return value is String && value.isNotEmpty ? value : null;
  }
}

final class BinaryResponse {
  const BinaryResponse({
    required this.bytes,
    this.contentType,
    this.contentDisposition,
  });
  final List<int> bytes;
  final String? contentType;
  final String? contentDisposition;
}
