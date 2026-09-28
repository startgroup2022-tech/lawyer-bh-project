final class SessionTokens {
  const SessionTokens({
    required this.accessToken,
    this.refreshToken,
    this.csrfToken,
  });

  final String accessToken;
  final String? refreshToken;
  final String? csrfToken;

  @override
  bool operator ==(Object other) {
    return other is SessionTokens &&
        other.accessToken == accessToken &&
        other.refreshToken == refreshToken &&
        other.csrfToken == csrfToken;
  }

  @override
  int get hashCode => Object.hash(accessToken, refreshToken, csrfToken);
}
