import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/session_tokens.dart';
import 'package:saraya_square_app/features/public_rental/domain/public_rental.dart';

abstract interface class PublicRentalRepository {
  Future<PublicRentalUnit> loadUnit(String unitId);
  Future<OtpChallenge> requestOtp(OtpRequest input);
  Future<void> verifyOtp(OtpVerification input);
  Future<String> uploadIdentity(
    String unitId,
    RentalDocument input, {
    required String category,
    required String idempotencyKey,
  });
  Future<RentalApplication> submit(RentalApplicationInput input);
  Future<RentalApplication> status(String requestId);
  Future<PaymentSession> createOnlinePayment(
    String requestId, {
    required String idempotencyKey,
  });
  Future<void> submitOfflineProof(
    String demandId,
    RentalDocument proof,
    String reference, {
    required String idempotencyKey,
  });
  Future<void> sign(String leaseId, LeaseSignatureInput input);
  Future<RentalLeaseDocument> downloadLeaseDocument(
    String leaseId, {
    bool finalVersion = false,
  });
}

class EmptyPublicRentalRepository implements PublicRentalRepository {
  const EmptyPublicRentalRepository();
  Never _unavailable() => throw UnsupportedError('Rental journey unavailable');
  @override
  Future<PublicRentalUnit> loadUnit(String unitId) async => _unavailable();
  @override
  Future<OtpChallenge> requestOtp(OtpRequest input) async => _unavailable();
  @override
  Future<void> verifyOtp(OtpVerification input) async => _unavailable();
  @override
  Future<String> uploadIdentity(
    String unitId,
    RentalDocument input, {
    required String category,
    required String idempotencyKey,
  }) async => _unavailable();
  @override
  Future<RentalApplication> submit(RentalApplicationInput input) async =>
      _unavailable();
  @override
  Future<RentalApplication> status(String requestId) async => _unavailable();
  @override
  Future<PaymentSession> createOnlinePayment(
    String requestId, {
    required String idempotencyKey,
  }) async => _unavailable();
  @override
  Future<void> submitOfflineProof(
    String demandId,
    RentalDocument proof,
    String reference, {
    required String idempotencyKey,
  }) async => _unavailable();
  @override
  Future<void> sign(String leaseId, LeaseSignatureInput input) async =>
      _unavailable();
  @override
  Future<RentalLeaseDocument> downloadLeaseDocument(
    String leaseId, {
    bool finalVersion = false,
  }) async => _unavailable();
}

final class ApiPublicRentalRepository implements PublicRentalRepository {
  const ApiPublicRentalRepository({
    required SarayaApiClient apiClient,
    required SessionStore sessionStore,
    required bool isNative,
  }) : _apiClient = apiClient,
       _sessionStore = sessionStore,
       _isNative = isNative;

  final SarayaApiClient _apiClient;
  final SessionStore _sessionStore;
  final bool _isNative;

  @override
  Future<PublicRentalUnit> loadUnit(String unitId) async =>
      PublicRentalUnit.fromJson(
        _map(
          await _apiClient.getJson(
            '/api/saraya/v1/public/units/${Uri.encodeComponent(unitId)}',
          ),
        ),
      );

  @override
  Future<OtpChallenge> requestOtp(OtpRequest input) async =>
      OtpChallenge.fromJson(
        _map(
          await _apiClient.postJson(
            '/api/saraya/v1/public/onboarding/challenge',
            data: {
              'channel': input.channel,
              'identity': input.identity,
              'locale': input.locale,
            },
          ),
        ),
      );

  @override
  Future<void> verifyOtp(OtpVerification input) async {
    final payload = _map(
      await _apiClient.postJson(
        '/api/saraya/v1/public/onboarding/verify',
        data: {
          'challengeId': input.challengeId,
          'code': input.code,
          'displayNameAr': input.displayNameAr,
          'displayNameEn': input.displayNameEn,
        },
      ),
    );
    final accessToken = _string(payload, 'accessToken');
    await _sessionStore.write(
      SessionTokens(
        accessToken: accessToken,
        refreshToken: _isNative ? _optional(payload, 'refreshToken') : null,
        csrfToken: _isNative ? null : _string(payload, 'csrfToken'),
      ),
    );
  }

  @override
  Future<String> uploadIdentity(
    String unitId,
    RentalDocument input, {
    required String category,
    required String idempotencyKey,
  }) async {
    final response = _map(
      await _apiClient.postMultipart(
        '/api/saraya/v1/public/units/${Uri.encodeComponent(unitId)}/documents',
        FormData.fromMap({
          'title': input.fileName,
          'category': category,
          'file': MultipartFile.fromBytes(
            input.bytes,
            filename: input.fileName,
            contentType: DioMediaType.parse(input.contentType),
          ),
        }),
        headers: {'idempotency-key': idempotencyKey},
      ),
    );
    return _string(response, 'id');
  }

  @override
  Future<RentalApplication> submit(RentalApplicationInput input) async =>
      RentalApplication.fromJson(
        _map(
          await _apiClient.postJson(
            '/api/saraya/v1/rental-requests',
            data: {
              'propertyId': input.propertyId,
              'unitId': input.unitId,
              'applicantType': input.applicantType,
              'applicantNameAr': input.applicantNameAr,
              'applicantNameEn': input.applicantNameEn,
              'registrationNumber': ?input.registrationNumber,
              'startDate': input.startDate,
              'endDate': input.endDate,
              'durationMonths': input.durationMonths,
              'idDocumentId': input.idDocumentId,
              'idempotencyKey': input.idempotencyKey,
            },
          ),
        ),
      );

  @override
  Future<RentalApplication> status(String requestId) async =>
      RentalApplication.fromJson(
        _map(
          await _apiClient.getJson(
            '/api/saraya/v1/rental-requests/${Uri.encodeComponent(requestId)}',
          ),
        ),
      );

  @override
  Future<PaymentSession> createOnlinePayment(
    String requestId, {
    required String idempotencyKey,
  }) async => PaymentSession.fromJson(
    _map(
      await _apiClient.postJson(
        '/api/saraya/v1/rental-requests/${Uri.encodeComponent(requestId)}/payment-session',
        data: {
          'idempotencyKey': idempotencyKey,
          if (_isNative) 'returnMode': 'native',
        },
        headers: {'idempotency-key': idempotencyKey},
      ),
    ),
  );

  @override
  Future<void> submitOfflineProof(
    String demandId,
    RentalDocument proof,
    String reference, {
    required String idempotencyKey,
  }) async {
    await _apiClient.postMultipart(
      '/api/saraya/v1/payment-demands/${Uri.encodeComponent(demandId)}/offline-proof',
      FormData.fromMap({
        'reference': reference,
        'file': MultipartFile.fromBytes(
          proof.bytes,
          filename: proof.fileName,
          contentType: DioMediaType.parse(proof.contentType),
        ),
      }),
      headers: {'idempotency-key': idempotencyKey},
    );
  }

  @override
  Future<void> sign(String leaseId, LeaseSignatureInput input) async {
    final response = _map(
      await _apiClient.postJson(
        '/api/saraya/v1/leases/${Uri.encodeComponent(leaseId)}/signature',
        data: {'acceptedName': input.acceptedName, 'checksum': input.checksum},
      ),
    );
    final status = _string(response, 'status');
    if (status != 'pending' && status != 'active') {
      throw ApiError.invalidResponse(200);
    }
  }

  @override
  Future<RentalLeaseDocument> downloadLeaseDocument(
    String leaseId, {
    bool finalVersion = false,
  }) async {
    final path = Uri(
      path: '/api/saraya/v1/leases/${Uri.encodeComponent(leaseId)}/document',
      queryParameters: finalVersion ? const {'version': 'final'} : null,
    ).toString();
    final response = await _apiClient.getBytes(path);
    if (response.bytes.isEmpty) throw ApiError.invalidResponse(200);
    final name =
        RegExp(
          r'filename="([^"\r\n]+)"',
        ).firstMatch(response.contentDisposition ?? '')?.group(1) ??
        (finalVersion ? 'saraya-lease-final.pdf' : 'saraya-lease-draft.pdf');
    return RentalLeaseDocument(
      bytes: Uint8List.fromList(response.bytes),
      fileName: name,
      contentType: response.contentType ?? 'application/pdf',
    );
  }

  static Map<String, Object?> _map(Object? value) {
    if (value is! Map) throw ApiError.invalidResponse(200);
    return Map<String, Object?>.from(value);
  }

  static String _string(Map<String, Object?> value, String key) {
    final result = value[key];
    if (result is! String || result.isEmpty) {
      throw ApiError.invalidResponse(200);
    }
    return result;
  }

  static String? _optional(Map<String, Object?> value, String key) {
    final result = value[key];
    return result is String && result.isNotEmpty ? result : null;
  }
}
