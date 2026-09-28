import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';

void main() {
  testWidgets('boots with Arabic as the initial locale', (tester) async {
    await tester.pumpWidget(
      SarayaApp(
        config: AppConfig(apiBaseUrl: Uri.parse('https://example.test')),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('سرايا سكوير'), findsOneWidget);
  });
}
