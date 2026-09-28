import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';
import 'package:saraya_square_app/core/network/api_client.dart';
import 'package:saraya_square_app/core/session/native_session_store.dart';
import 'package:saraya_square_app/core/session/session_store.dart';
import 'package:saraya_square_app/core/session/web_session_store.dart';
import 'package:saraya_square_app/features/auth/data/auth_repository.dart';
import 'package:saraya_square_app/features/auth/presentation/auth_controller.dart';
import 'package:saraya_square_app/features/account/data/account_repository.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/documents/data/document_repository.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/leases/data/lease_repository.dart';
import 'package:saraya_square_app/features/management/data/management_repository.dart';
import 'package:saraya_square_app/features/management/data/client_onboarding_repository.dart';
import 'package:saraya_square_app/features/maintenance/data/maintenance_repository.dart';
import 'package:saraya_square_app/features/meeting_rooms/data/meeting_room_repository.dart';
import 'package:saraya_square_app/features/public_home/data/public_home_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/public_rental_repository.dart';
import 'package:saraya_square_app/features/public_rental/data/rental_document_saver.dart';
import 'package:saraya_square_app/features/virtual_addresses/data/virtual_address_repository.dart';
import 'package:saraya_square_app/features/reports/data/report_downloader.dart';
import 'package:saraya_square_app/features/reports/data/report_repository.dart';
import 'package:saraya_square_app/features/rental_requests/data/rental_request_repository.dart';
import 'package:saraya_square_app/features/viewings/data/viewing_repository.dart';

Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  final SessionStore sessionStore = kIsWeb
      ? WebSessionStore(await SharedPreferences.getInstance())
      : const NativeSessionStore(FlutterSecureStorage());
  final dio = Dio(BaseOptions(baseUrl: config.apiBaseUrl.toString()));
  late final AuthController authController;
  final apiClient = SarayaApiClient(
    dio: dio,
    sessionStore: sessionStore,
    isNative: !kIsWeb,
    onUnauthenticated: () => authController.expireSession(),
  );
  authController = AuthController(
    ApiAuthRepository(
      apiClient: apiClient,
      sessionStore: sessionStore,
      isNative: !kIsWeb,
    ),
  );
  runApp(
    ProviderScope(
      child: SarayaApp(
        config: config,
        authController: authController,
        dashboardRepository: ApiDashboardRepository(apiClient),
        managementRepository: ApiManagementRepository(apiClient),
        publicHomeRepository: ApiPublicHomeRepository(apiClient),
        viewingRepository: ApiViewingRepository(apiClient),
        publicRentalRepository: ApiPublicRentalRepository(
          apiClient: apiClient,
          sessionStore: sessionStore,
          isNative: !kIsWeb,
        ),
        rentalDocumentSaver: const FilePickerRentalDocumentSaver(),
        clientOnboardingRepository: ApiClientOnboardingRepository(apiClient),
        invoiceRepository: ApiInvoiceRepository(apiClient),
        accountRepository: ApiAccountRepository(apiClient),
        virtualAddressRepository: ApiVirtualAddressRepository(apiClient),
        meetingRoomRepository: ApiMeetingRoomRepository(apiClient),
        leaseRepository: ApiLeaseRepository(apiClient),
        maintenanceRepository: ApiMaintenanceRepository(apiClient),
        documentRepository: ApiDocumentRepository(apiClient),
        reportRepository: ApiReportRepository(apiClient),
        reportDownloader: const FilePickerReportDownloader(),
        rentalRequestRepository: ApiRentalRequestRepository(apiClient),
        rentalRequestDocumentSaver:
            const FilePickerRentalRequestDocumentSaver(),
      ),
    ),
  );
}
