final class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  final Uri apiBaseUrl;

  factory AppConfig.fromEnvironment() {
    const raw = String.fromEnvironment('SARAYA_API_BASE_URL', defaultValue: '');
    return AppConfig(
      apiBaseUrl: Uri.parse(raw.isEmpty ? Uri.base.origin : raw),
    );
  }
}
