import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/network/refresh_coordinator.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';

void main() {
  test('parses bilingual API errors and field errors', () {
    final error = ApiError.fromJson(422, {
      'error': {
        'code': 'VALIDATION_ERROR',
        'messageAr': 'تحقق من الحقول المطلوبة',
        'messageEn': 'Check the required fields',
        'fieldErrors': {
          'email': ['invalid'],
        },
      },
    });

    expect(error.status, 422);
    expect(error.code, 'VALIDATION_ERROR');
    expect(error.messageAr, 'تحقق من الحقول المطلوبة');
    expect(error.messageEn, 'Check the required fields');
    expect(error.fieldErrors['email'], ['invalid']);
  });

  test('coalesces simultaneous refresh attempts into one request', () async {
    var refreshCalls = 0;
    final coordinator = RefreshCoordinator(() async {
      refreshCalls++;
      await Future<void>.delayed(Duration.zero);
      return const SessionTokens(accessToken: 'next');
    });

    final results = await Future.wait([
      coordinator.refresh(),
      coordinator.refresh(),
    ]);

    expect(refreshCalls, 1);
    expect(results, everyElement(const SessionTokens(accessToken: 'next')));
  });

  test('adds the bearer token and native client header', () async {
    final adapter = _RecordingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final store = _MemorySessionStore(
      const SessionTokens(accessToken: 'access-token'),
    );
    final client = SarayaApiClient(dio: dio, sessionStore: store);

    await client.getJson('/api/saraya/v1/dashboard');

    expect(
      adapter.requests.single.headers['Authorization'],
      'Bearer access-token',
    );
    expect(adapter.requests.single.headers['x-saraya-client'], 'native');
  });

  test('omits native client header and sends CSRF on web', () async {
    final adapter = _RecordingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final store = _MemorySessionStore(
      const SessionTokens(accessToken: '', csrfToken: 'csrf-token'),
    );
    final client = SarayaApiClient(
      dio: dio,
      sessionStore: store,
      isNative: false,
    );

    await client.getJson('/api/saraya/v1/dashboard');

    expect(adapter.requests.single.headers['x-saraya-client'], isNull);
    expect(adapter.requests.single.headers['x-saraya-csrf'], 'csrf-token');
    expect(adapter.requests.single.headers['Authorization'], isNull);
  });

  test('does not add JSON content type to a bodyless DELETE', () async {
    final adapter = _RecordingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final client = SarayaApiClient(
      dio: dio,
      sessionStore: _MemorySessionStore(null),
    );

    await client.delete('/api/saraya/v1/session');

    final request = adapter.requests.single;
    expect(request.method, 'DELETE');
    expect(request.data, isNull);
    expect(
      request.headers.keys.map((key) => key.toLowerCase()),
      isNot(contains(Headers.contentTypeHeader)),
    );
  });

  test(
    'sends authenticated multipart form data without forcing JSON',
    () async {
      final adapter = _RecordingAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
        ..httpClientAdapter = adapter;
      final client = SarayaApiClient(
        dio: dio,
        sessionStore: _MemorySessionStore(
          const SessionTokens(accessToken: 'access-token'),
        ),
      );
      final form = FormData.fromMap({
        'title': 'Signed lease',
        'file': MultipartFile.fromBytes(
          [1, 2, 3],
          filename: 'lease.pdf',
          contentType: DioMediaType.parse('application/pdf'),
        ),
      });

      await client.postMultipart('/api/saraya/v1/documents', form);

      final request = adapter.requests.single;
      expect(request.data, same(form));
      expect(request.headers['Authorization'], 'Bearer access-token');
      expect(request.contentType, startsWith('multipart/form-data'));
      expect(request.contentType, isNot(Headers.jsonContentType));
    },
  );

  test('refreshes once and retries an expired authenticated request', () async {
    final adapter = _ScriptedAdapter([
      _JsonResponse(401, {
        'error': {'code': 'ACCESS_TOKEN_EXPIRED'},
      }),
      _JsonResponse(200, {
        'accessToken': 'next-access',
        'csrfToken': 'next-csrf',
      }),
      _JsonResponse(200, {'ok': true}),
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final store = _MemorySessionStore(
      const SessionTokens(
        accessToken: 'expired-access',
        refreshToken: 'refresh-token',
        csrfToken: 'csrf-token',
      ),
    );
    final client = SarayaApiClient(dio: dio, sessionStore: store);

    final response = await client.getJson('/api/saraya/v1/dashboard');

    expect(response, {'ok': true});
    expect(adapter.requests, hasLength(3));
    expect(adapter.requests[1].path, '/api/saraya/v1/auth/refresh');
    expect(adapter.requests[1].data, {'refreshToken': 'refresh-token'});
    expect(adapter.requests[2].headers['Authorization'], 'Bearer next-access');
    expect(store.value?.accessToken, 'next-access');
  });

  test('returns the original 401 when no refreshable session exists', () async {
    final adapter = _ScriptedAdapter([
      _JsonResponse(401, {
        'error': {
          'code': 'INVALID_CREDENTIALS',
          'messageAr': 'بيانات الدخول غير صحيحة',
          'messageEn': 'Invalid credentials',
        },
      }),
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final client = SarayaApiClient(
      dio: dio,
      sessionStore: _MemorySessionStore(null),
    );

    await expectLater(
      client.postJson(
        '/api/saraya/v1/auth/login',
        data: {'email': 'user@example.com', 'password': 'wrong'},
      ),
      throwsA(
        isA<ApiError>()
            .having((error) => error.status, 'status', 401)
            .having((error) => error.code, 'code', 'INVALID_CREDENTIALS'),
      ),
    );

    expect(adapter.requests, hasLength(1));
    expect(adapter.requests.single.path, '/api/saraya/v1/auth/login');
  });

  test('web reload session refreshes through CSRF and retries', () async {
    final adapter = _ScriptedAdapter([
      _JsonResponse(401, {
        'error': {'code': 'ACCESS_TOKEN_EXPIRED'},
      }),
      _JsonResponse(200, {
        'accessToken': 'web-access',
        'csrfToken': 'next-csrf',
      }),
      _JsonResponse(200, {'ok': true}),
    ]);
    final dio = Dio(BaseOptions(baseUrl: 'https://sq.example'))
      ..httpClientAdapter = adapter;
    final store = _MemorySessionStore(
      const SessionTokens(accessToken: '', csrfToken: 'persisted-csrf'),
    );
    final client = SarayaApiClient(
      dio: dio,
      sessionStore: store,
      isNative: false,
    );

    final response = await client.getJson('/api/saraya/v1/dashboard');

    expect(response, {'ok': true});
    expect(adapter.requests, hasLength(3));
    expect(adapter.requests[1].path, '/api/saraya/v1/auth/refresh');
    expect(adapter.requests[1].data, isNull);
    expect(adapter.requests[1].headers['x-saraya-csrf'], 'persisted-csrf');
    expect(adapter.requests[2].headers['Authorization'], 'Bearer web-access');
  });

  test('maps malformed error responses without exposing response contents', () {
    final error = ApiError.fromResponse(
      502,
      '<html>gateway stack trace</html>',
    );

    expect(error.code, 'INVALID_RESPONSE');
    expect(error.messageAr, isNot(contains('gateway')));
    expect(error.messageEn, isNot(contains('stack trace')));
  });
}

final class _MemorySessionStore implements SessionStore {
  _MemorySessionStore(this.value);

  SessionTokens? value;

  @override
  Future<void> clear() async => value = null;

  @override
  Future<SessionTokens?> read() async => value;

  @override
  Future<void> write(SessionTokens value) async => this.value = value;
}

final class _RecordingAdapter implements HttpClientAdapter {
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return ResponseBody.fromString(
      jsonEncode({'ok': true}),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _ScriptedAdapter implements HttpClientAdapter {
  _ScriptedAdapter(this.responses);

  final List<_JsonResponse> responses;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final response = responses.removeAt(0);
    return ResponseBody.fromString(
      jsonEncode(response.body),
      response.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

final class _JsonResponse {
  const _JsonResponse(this.status, this.body);

  final int status;
  final Object body;
}
