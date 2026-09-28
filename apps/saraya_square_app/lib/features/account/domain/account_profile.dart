import 'package:saraya_square_app/core/network/api_error.dart';
import 'package:saraya_square_app/core/widgets/app_shell.dart';
import 'package:saraya_square_app/features/auth/domain/auth_state.dart';

final class AccountProfile {
  const AccountProfile({
    required this.id,
    required this.displayNameAr,
    required this.displayNameEn,
    required this.email,
    required this.phone,
    required this.memberships,
  });

  factory AccountProfile.fromJson(Map<String, Object?> json) {
    final rawMemberships = json['memberships'];
    if (rawMemberships is! List) throw ApiError.invalidResponse(200);
    return AccountProfile(
      id: _requiredString(json, 'id'),
      displayNameAr: _requiredString(json, 'displayNameAr'),
      displayNameEn: _requiredString(json, 'displayNameEn'),
      email: _optionalString(json['email']),
      phone: _optionalString(json['phone']),
      memberships: List.unmodifiable(rawMemberships.map(_membership)),
    );
  }

  final String id;
  final String displayNameAr;
  final String displayNameEn;
  final String? email;
  final String? phone;
  final List<AccountMembership> memberships;

  AccountProfile copyWith({
    String? displayNameAr,
    String? displayNameEn,
    String? email,
    String? phone,
  }) => AccountProfile(
    id: id,
    displayNameAr: displayNameAr ?? this.displayNameAr,
    displayNameEn: displayNameEn ?? this.displayNameEn,
    email: email,
    phone: phone,
    memberships: memberships,
  );
}

final class AccountUpdate {
  const AccountUpdate({
    required this.displayNameAr,
    required this.displayNameEn,
    required this.email,
    required this.phone,
    this.currentPassword,
  });

  final String displayNameAr;
  final String displayNameEn;
  final String? email;
  final String? phone;
  final String? currentPassword;

  Map<String, Object?> toJson() => {
    'displayNameAr': displayNameAr,
    'displayNameEn': displayNameEn,
    'email': email,
    'phone': phone,
    if (currentPassword != null) 'currentPassword': currentPassword,
  };
}

AccountMembership _membership(Object? value) {
  if (value is! Map) throw ApiError.invalidResponse(200);
  final json = Map<String, Object?>.from(value);
  return AccountMembership(
    propertyId: _requiredString(json, 'propertyId'),
    propertyNameAr: _requiredString(json, 'propertyNameAr'),
    propertyNameEn: _requiredString(json, 'propertyNameEn'),
    role: switch (_requiredString(json, 'role')) {
      'super_admin' => AppRole.superAdmin,
      'property_manager' => AppRole.propertyManager,
      'accountant' => AppRole.accountant,
      'maintenance' => AppRole.maintenance,
      'owner' => AppRole.owner,
      'tenant' => AppRole.tenant,
      'visitor' => AppRole.visitor,
      _ => throw ApiError.invalidResponse(200),
    },
  );
}

String _requiredString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw ApiError.invalidResponse(200);
}

String? _optionalString(Object? value) =>
    value is String && value.isNotEmpty ? value : null;
