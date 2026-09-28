# Saraya Square Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unmaintainable compiled-only Saraya client with a tested bilingual responsive Flutter source application, repair the existing Phase 1 modules, and publish a truthful web bundle at `/saraya/` without replacing the existing backend or data.

**Architecture:** Create `apps/saraya_square_app` as the maintained Flutter client and keep `apps/lawyers.bh` as the secure Next.js/API boundary. The Flutter app uses feature-first modules over shared localization, routing, session, and networking foundations; backend changes are limited to truthful dashboard projections and user-facing staff projections required by the repaired client.

**Tech Stack:** Flutter 3.41.9, Dart 3.11.5, Material 3, Riverpod, GoRouter, Dio, Flutter Secure Storage, Shared Preferences, Intl, Next.js 16, TypeScript, Drizzle/PostgreSQL, Vitest, Flutter widget/integration tests.

## Global Constraints

- Preserve the existing Saraya authentication, authorization, APIs, database data, and useful compiled assets until the replacement bundle passes acceptance.
- Keep all persisted Saraya records in isolated `saraya_*` tables inside the existing PostgreSQL database.
- Support Arabic RTL and English LTR in every Phase 1 route.
- Use the approved balanced-modern visual direction: deep green, restrained gold, warm neutral surfaces, high-contrast text.
- Never expose database credentials, payment secrets, signing secrets, refresh cookies, or unrestricted storage URLs to Flutter.
- Web refresh authentication uses the existing secure cookie and CSRF contract; native refresh credentials use secure storage.
- Do not show raw UUIDs, raw enums, untranslated system labels, placeholder totals, or fake dashboard data.
- Run Lawyers.bh Node commands with Node 22; the current interactive shell reports Node 16 and must not be used for Next.js verification.
- Before Lawyers.bh commands, run `export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"` and verify `node --version` prints `v22.22.2`.
- Before changing Next.js code, read the applicable guide under `apps/lawyers.bh/node_modules/next/dist/docs/` as required by `apps/lawyers.bh/AGENTS.md`.
- Do not change the existing meeting-room implementation in Phase 1 except to keep the worktree compiling and its existing tests passing.
- Do not commit unless the user explicitly authorizes commits; each task ends with a review checkpoint instead.

---

## File Structure Map

### Flutter application

```text
apps/saraya_square_app/
  pubspec.yaml                         Dependencies, assets, fonts, localization generation
  analysis_options.yaml               Strict Dart analysis
  l10n.yaml                            AR/EN localization generation
  lib/main.dart                        Production entrypoint
  lib/app/bootstrap.dart               Provider container and root startup
  lib/app/saraya_app.dart              MaterialApp.router and locale/theme wiring
  lib/app/router.dart                  Role-aware GoRouter tree
  lib/core/config/app_config.dart      API base URL and build-time configuration
  lib/core/design/                     Approved tokens, theme, responsive primitives
  lib/core/localization/               Generated AR/EN messages and enum labels
  lib/core/network/                    API envelope, Dio client, refresh coordinator
  lib/core/session/                    Tokens, secure/web stores, session controller
  lib/core/widgets/                    Shared loading, empty, error, form, and shell widgets
  lib/features/auth/                   Login and session bootstrap
  lib/features/dashboard/              Truthful operational summary
  lib/features/management/             Properties, units, tenants, owners, staff
  lib/features/invoices/               Invoice list and status presentation
  lib/features/account/                Profile and password screens
  test/                                Unit and widget tests mirroring lib/
  integration_test/phase1_smoke_test.dart
  tool/publish_web.dart                Safe build-to-public/saraya publisher
```

### Lawyers.bh backend

```text
apps/lawyers.bh/lib/saraya/dashboard/service.ts
apps/lawyers.bh/lib/saraya/dashboard/repository.ts
apps/lawyers.bh/lib/saraya/dashboard/service.test.ts
apps/lawyers.bh/lib/saraya/property-management/repository.ts
apps/lawyers.bh/lib/saraya/property-management/service.test.ts
apps/lawyers.bh/lib/saraya/static-bundle.test.ts
apps/lawyers.bh/public/saraya/            Generated Flutter web output
```

## Task 1: Scaffold the Maintained Flutter Application

**Files:**
- Create: `apps/saraya_square_app/pubspec.yaml`
- Create: `apps/saraya_square_app/analysis_options.yaml`
- Create: `apps/saraya_square_app/l10n.yaml`
- Create: `apps/saraya_square_app/lib/main.dart`
- Create: `apps/saraya_square_app/lib/app/bootstrap.dart`
- Create: `apps/saraya_square_app/lib/app/saraya_app.dart`
- Create: `apps/saraya_square_app/lib/core/config/app_config.dart`
- Create: `apps/saraya_square_app/test/app/bootstrap_test.dart`
- Generate: `apps/saraya_square_app/android/**`, `ios/**`, `web/**`

**Interfaces:**
- Produces: `AppConfig(apiBaseUrl: Uri)`, `bootstrap(AppConfig config)`, and `SarayaApp(config: config)` for all later Flutter tasks.
- Consumes: No application interfaces; this task establishes the client boundary.

- [ ] **Step 1: Generate the platform project**

Run from the repository root:

```bash
flutter create \
  --platforms=android,ios,web \
  --org bh.lawyers \
  --project-name saraya_square_app \
  apps/saraya_square_app
```

Expected: Flutter creates a compilable application with bundle/application identifiers derived from `bh.lawyers.saraya_square_app`.

- [ ] **Step 2: Add only Phase 1 dependencies**

Run:

```bash
cd apps/saraya_square_app
flutter pub add flutter_riverpod go_router dio flutter_secure_storage shared_preferences intl
flutter pub add "dev:integration_test:{sdk: flutter}"
```

Expected: `pubspec.yaml` and `pubspec.lock` resolve on Flutter 3.41.9 / Dart 3.11.5.

- [ ] **Step 3: Write the failing bootstrap test**

Create `test/app/bootstrap_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:saraya_square_app/app/saraya_app.dart';
import 'package:saraya_square_app/core/config/app_config.dart';

void main() {
  testWidgets('boots with Arabic as the initial locale', (tester) async {
    await tester.pumpWidget(
      SarayaApp(config: AppConfig(apiBaseUrl: Uri.parse('https://example.test'))),
    );
    await tester.pumpAndSettle();
    expect(find.text('سرايا سكوير'), findsOneWidget);
  });
}
```

- [ ] **Step 4: Run the test to verify the missing application fails**

Run: `flutter test test/app/bootstrap_test.dart`

Expected: FAIL because `SarayaApp` and `AppConfig` do not exist.

- [ ] **Step 5: Implement the minimal bootstrap and configuration**

Create `lib/core/config/app_config.dart`:

```dart
final class AppConfig {
  const AppConfig({required this.apiBaseUrl});
  final Uri apiBaseUrl;

  factory AppConfig.fromEnvironment() {
    const raw = String.fromEnvironment('SARAYA_API_BASE_URL', defaultValue: '');
    return AppConfig(apiBaseUrl: Uri.parse(raw.isEmpty ? Uri.base.origin : raw));
  }
}
```

Create `lib/main.dart` and `lib/app/bootstrap.dart` so `main()` calls `bootstrap(AppConfig.fromEnvironment())`, and bootstrap runs `ProviderScope(child: SarayaApp(config: config))`.

Create the first `SarayaApp` with Arabic locale and a temporary `Scaffold` containing `سرايا سكوير`. Localization and routing replace the temporary child in Task 4.

- [ ] **Step 6: Enable strict analysis and localization generation**

Set `analysis_options.yaml` to include `package:flutter_lints/flutter.yaml`, enable `strict-casts`, `strict-inference`, and `strict-raw-types`, and configure `l10n.yaml` with:

```yaml
arb-dir: lib/core/localization
template-arb-file: app_ar.arb
output-localization-file: app_localizations.dart
synthetic-package: false
```

- [ ] **Step 7: Verify the scaffold**

Run:

```bash
flutter pub get
flutter analyze
flutter test test/app/bootstrap_test.dart
flutter build web --base-href /saraya/
```

Expected: analysis passes, the test passes, and `build/web/index.html` contains `<base href="/saraya/">`.

- [ ] **Step 8: Review checkpoint**

Inspect `git diff -- apps/saraya_square_app` and confirm no generated secrets, local API URLs, or unrelated repository files are included.

## Task 2: Implement Session Storage and the API Client

**Files:**
- Create: `apps/saraya_square_app/lib/core/network/api_error.dart`
- Create: `apps/saraya_square_app/lib/core/network/api_client.dart`
- Create: `apps/saraya_square_app/lib/core/network/refresh_coordinator.dart`
- Create: `apps/saraya_square_app/lib/core/session/session_tokens.dart`
- Create: `apps/saraya_square_app/lib/core/session/session_store.dart`
- Create: `apps/saraya_square_app/lib/core/session/native_session_store.dart`
- Create: `apps/saraya_square_app/lib/core/session/web_session_store.dart`
- Create: `apps/saraya_square_app/test/core/network/api_client_test.dart`
- Create: `apps/saraya_square_app/test/core/session/session_store_test.dart`

**Interfaces:**
- Produces: `SessionTokens`, `SessionStore`, `SarayaApiClient`, `ApiError`, and `RefreshCoordinator`.
- `SessionStore.read()` returns `Future<SessionTokens?>`; `write(SessionTokens)` and `clear()` return `Future<void>`.
- `SarayaApiClient.getJson`, `postJson`, `patchJson`, and `delete` return decoded JSON or throw `ApiError`.

- [ ] **Step 1: Write failing session and API tests**

Test these exact behaviors:

```dart
test('parses bilingual API errors and field errors', () {
  final error = ApiError.fromJson(422, {
    'error': {
      'code': 'VALIDATION_ERROR',
      'messageAr': 'تحقق من الحقول المطلوبة',
      'messageEn': 'Check the required fields',
      'fieldErrors': {'email': ['invalid']},
    },
  });
  expect(error.code, 'VALIDATION_ERROR');
  expect(error.fieldErrors['email'], ['invalid']);
});

test('coalesces simultaneous refresh attempts into one request', () async {
  var refreshCalls = 0;
  final coordinator = RefreshCoordinator(() async {
    refreshCalls++;
    return const SessionTokens(accessToken: 'next');
  });
  await Future.wait([coordinator.refresh(), coordinator.refresh()]);
  expect(refreshCalls, 1);
});
```

Also capture a request and assert `Authorization: Bearer <token>` is added, `x-saraya-client: native` is sent only when `dart.library.io` is active, and bodyless `DELETE` does not receive a JSON content type.

- [ ] **Step 2: Run tests and verify failure**

Run: `flutter test test/core/network test/core/session`

Expected: FAIL because the network and session types do not exist.

- [ ] **Step 3: Implement tokens and platform stores**

Use this immutable contract:

```dart
final class SessionTokens {
  const SessionTokens({required this.accessToken, this.refreshToken, this.csrfToken});
  final String accessToken;
  final String? refreshToken;
  final String? csrfToken;
}

abstract interface class SessionStore {
  Future<SessionTokens?> read();
  Future<void> write(SessionTokens value);
  Future<void> clear();
}
```

Native storage persists access and refresh tokens with `FlutterSecureStorage`. Web storage persists only the non-secret CSRF token with `SharedPreferences`; the access token remains in memory and the refresh token remains in the existing HttpOnly cookie.

- [ ] **Step 4: Implement stable error parsing**

`ApiError` must contain `status`, `code`, `messageAr`, `messageEn`, and `Map<String, List<String>> fieldErrors`. Malformed/non-JSON failures map to `NETWORK_ERROR` or `INVALID_RESPONSE` without exposing response HTML or stack traces.

- [ ] **Step 5: Implement Dio requests and single-flight refresh**

Use `/api/saraya/v1/auth/refresh` after `ACCESS_TOKEN_EXPIRED` or a 401. Web sends `x-saraya-csrf` and cookies through same-origin requests; native sends `{ "refreshToken": "..." }` plus `x-saraya-client: native`. Retry the original request once, then clear the session and emit an unauthenticated state.

- [ ] **Step 6: Verify the networking foundation**

Run:

```bash
flutter analyze
flutter test test/core/network test/core/session
```

Expected: all tests pass, including simultaneous refresh and bodyless request coverage.

- [ ] **Step 7: Review checkpoint**

Search the Flutter tree for persisted access tokens on web and for hardcoded credentials:

```bash
rg -n "accessToken|refreshToken|admin@|Gicc@" apps/saraya_square_app/lib
```

Expected: no credentials; web storage code stores only CSRF state.

## Task 3: Make Dashboard and Staff Projections Truthful

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/dashboard/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/dashboard/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/dashboard/service.test.ts`
- Modify: `apps/lawyers.bh/lib/saraya/property-management/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/property-management/service.test.ts`

**Interfaces:**
- Produces dashboard JSON fields: `occupiedUnits`, `vacantUnits`, `tenantCount`, `pendingRequests`, `dueAmount`, `paidAmount`, `overdueAmount`, `currencyCode`.
- Produces staff list rows with `id`, `userId`, `displayNameAr`, `displayNameEn`, `email`, `phone`, `role`, `isActive`, and timestamps.
- Preserves all current API routes and authorization behavior.

- [ ] **Step 1: Read the installed Next.js 16 route-handler guide**

Run with Node 22 available in `PATH`:

```bash
sed -n '1,240p' apps/lawyers.bh/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
sed -n '1,240p' apps/lawyers.bh/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
```

Expected: confirm current request/response and async route conventions before editing.

- [ ] **Step 2: Expand the failing dashboard service test**

Change the repository fake to return:

```ts
{
  occupiedUnits: 14,
  vacantUnits: 6,
  tenantCount: 11,
  pendingRequests: 3,
  dueAmount: "12800.000",
  paidAmount: "8450.000",
  overdueAmount: "900.000",
  currencyCode: "BHD",
}
```

Assert `service.load()` returns those values unchanged and still applies owner/property authorization.

- [ ] **Step 3: Add a failing staff projection assertion**

In the property-management test, require staff items to expose display names and contact data while preserving membership `id` as the update/delete identifier. Assert raw password/session fields are absent.

- [ ] **Step 4: Run focused backend tests and verify failure**

Run under Node 22:

```bash
cd apps/lawyers.bh
pnpm vitest run lib/saraya/dashboard/service.test.ts lib/saraya/property-management/service.test.ts
```

Expected: FAIL because dashboard values are still hardcoded and staff rows are unprojected memberships.

- [ ] **Step 5: Implement one database summary query**

Update `DashboardCounts` to include the four financial/request fields. `dashboardRepository.summarize()` must aggregate for the authorized property and optional owner scope:

- Pending requests: `saraya_rental_requests.status = 'pending_owner_review'`.
- Due amount: sum `total_amount - paid_amount` for unpaid invoices.
- Paid amount: sum `paid_amount` for all scoped invoices.
- Overdue amount: sum outstanding balance where `due_date < CURRENT_DATE` and invoice is not paid.
- Return numeric values as three-decimal strings with `COALESCE(..., 0)`.

Remove all four hardcoded values from `createDashboardService`.

- [ ] **Step 6: Join staff memberships to safe user fields**

For `list('staff')` and `get('staff')`, join `saraya_property_memberships` to `saraya_users` and explicitly select only the safe projection named in Interfaces. Apply search to Arabic name, English name, normalized email, and normalized phone while preserving property and role filters.

- [ ] **Step 7: Verify backend correctness**

Run under Node 22:

```bash
cd apps/lawyers.bh
pnpm vitest run lib/saraya/dashboard/service.test.ts lib/saraya/property-management/service.test.ts
pnpm tsc --noEmit
```

Expected: focused tests and TypeScript pass.

- [ ] **Step 8: Review checkpoint**

Call the local authenticated dashboard and staff endpoints and verify monetary totals come from rows in the local database and staff rows show names instead of requiring the UI to display a UUID.

## Task 4: Build Localization, Theme, and Responsive Role Shell

**Files:**
- Create: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Create: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Create: `apps/saraya_square_app/lib/core/localization/status_labels.dart`
- Create: `apps/saraya_square_app/lib/core/design/saraya_colors.dart`
- Create: `apps/saraya_square_app/lib/core/design/saraya_theme.dart`
- Create: `apps/saraya_square_app/lib/core/design/breakpoints.dart`
- Create: `apps/saraya_square_app/lib/core/widgets/app_shell.dart`
- Create: `apps/saraya_square_app/lib/core/widgets/async_content.dart`
- Modify: `apps/saraya_square_app/lib/app/saraya_app.dart`
- Create: `apps/saraya_square_app/test/core/design/saraya_theme_test.dart`
- Create: `apps/saraya_square_app/test/core/widgets/app_shell_test.dart`

**Interfaces:**
- Produces: `SarayaTheme.light`, `SarayaBreakpoints`, `AppShell`, `AsyncContent`, and localized label functions.
- `AppShell` accepts `role`, `selectedPath`, `onNavigate`, `title`, `actions`, and `child`.

- [ ] **Step 1: Write failing RTL/LTR and responsive shell tests**

Test 390px and 1440px surfaces. At 390px, assert a bottom navigation is visible and the desktop side rail is absent. At 1440px, assert grouped side navigation is visible and bottom navigation is absent. Pump Arabic and English locales and assert `Directionality` is RTL and LTR respectively.

- [ ] **Step 2: Run the tests and verify failure**

Run: `flutter test test/core/design test/core/widgets`

Expected: FAIL because the theme, localization, and shell do not exist.

- [ ] **Step 3: Implement approved design tokens**

Define constants rather than screen-local colors:

```dart
static const deepGreen = Color(0xFF0D483C);
static const green = Color(0xFF1D6D5D);
static const mutedGold = Color(0xFFC5A24D);
static const warmSurface = Color(0xFFF6F7F3);
static const danger = Color(0xFF9B493E);
```

Use Material 3, 12–18px card radii, visible focus states, minimum 44px touch targets, and contrast-safe text.

- [ ] **Step 4: Add bilingual copy and enum mappings**

Add every Phase 1 navigation label, action, empty state, error state, role, unit status, invoice status, and field label to both ARB files. `status_labels.dart` maps stable codes such as `vacant`, `occupied`, `super_admin`, and `due` to generated localization values; unknown codes render the localized `unknownStatus`, never the raw code.

- [ ] **Step 5: Implement the adaptive shell**

Use a grouped `NavigationRail`/side panel at widths `>= 1100`, a compact rail for `>= 700`, and bottom navigation below `700`. Filter destinations by role/capability before rendering them.

- [ ] **Step 6: Implement explicit async states**

`AsyncContent<T>` renders one of loading skeleton, localized empty state, permission-denied state, retryable error, or loaded content. It must not collapse all failures into “try again.”

- [ ] **Step 7: Verify theme and shell**

Run:

```bash
flutter gen-l10n
flutter analyze
flutter test test/core/design test/core/widgets
```

Expected: all widths/locales pass without overflow.

- [ ] **Step 8: Review checkpoint**

Capture widget test screenshots for Arabic desktop and mobile and compare them to approved direction C: executive summary first, operational detail second, restrained gold accents only.

## Task 5: Implement Login, Session Bootstrap, and Role Routing

**Files:**
- Create: `apps/saraya_square_app/lib/features/auth/data/auth_repository.dart`
- Create: `apps/saraya_square_app/lib/features/auth/domain/auth_state.dart`
- Create: `apps/saraya_square_app/lib/features/auth/presentation/auth_controller.dart`
- Create: `apps/saraya_square_app/lib/features/auth/presentation/login_screen.dart`
- Create: `apps/saraya_square_app/lib/features/auth/presentation/session_gate.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Create: `apps/saraya_square_app/test/features/auth/auth_controller_test.dart`
- Create: `apps/saraya_square_app/test/features/auth/login_screen_test.dart`
- Create: `apps/saraya_square_app/test/app/router_test.dart`

**Interfaces:**
- Produces: `AuthRepository.login(identity, password)`, `AuthController`, `AuthState`, and authenticated route redirects.
- Consumes: `SarayaApiClient`, `SessionStore`, `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/account`.

- [ ] **Step 1: Write failing authentication tests**

Cover invalid credentials, localized field errors, successful web/native token handling, session restoration, logout, and redirect attempts from a protected route. Assert passwords are never included in state `toString()` or logs.

- [ ] **Step 2: Run authentication tests and verify failure**

Run: `flutter test test/features/auth test/app/router_test.dart`

Expected: FAIL because repository, controller, screen, and routes do not exist.

- [ ] **Step 3: Implement the repository contract**

For web, POST `{identity, password}` without `x-saraya-client`; parse `accessToken` and `csrfToken`. For native, send `x-saraya-client: native`; parse `accessToken` and `refreshToken`. Then GET `/account` to obtain display names and memberships.

- [ ] **Step 4: Implement explicit auth states**

Use sealed states: `AuthChecking`, `Unauthenticated`, `Authenticating`, `Authenticated(account, selectedMembership)`, and `AuthFailure(error)`. Property selection is required only when the account has multiple memberships.

- [ ] **Step 5: Implement login and route guards**

The login screen supports email or international phone identity, password visibility control, keyboard submission, Arabic/English switching, progress disablement, and bilingual error text. Route guards preserve the requested location and redirect back after successful login.

- [ ] **Step 6: Verify authentication**

Run:

```bash
flutter analyze
flutter test test/features/auth test/app/router_test.dart
```

Expected: all authentication and redirect tests pass.

- [ ] **Step 7: Review checkpoint**

Use the local admin account through the local API without storing its password in tests, fixtures, source, screenshots, or the plan output.

## Task 6: Implement the Truthful Dashboard

**Files:**
- Create: `apps/saraya_square_app/lib/features/dashboard/data/dashboard_repository.dart`
- Create: `apps/saraya_square_app/lib/features/dashboard/domain/dashboard_summary.dart`
- Create: `apps/saraya_square_app/lib/features/dashboard/presentation/dashboard_controller.dart`
- Create: `apps/saraya_square_app/lib/features/dashboard/presentation/dashboard_screen.dart`
- Create: `apps/saraya_square_app/lib/features/dashboard/presentation/widgets/summary_card.dart`
- Create: `apps/saraya_square_app/lib/features/dashboard/presentation/widgets/attention_panel.dart`
- Create: `apps/saraya_square_app/test/features/dashboard/dashboard_repository_test.dart`
- Create: `apps/saraya_square_app/test/features/dashboard/dashboard_screen_test.dart`

**Interfaces:**
- Produces: `DashboardSummary` with exact backend fields and `DashboardController.load(propertyId)`.
- Consumes: `/api/saraya/v1/dashboard?propertyId=<uuid>` and authenticated membership selection.

- [ ] **Step 1: Write failing parsing and UI tests**

Parse the exact JSON produced by Task 3. Pump zero, positive, and overdue summaries. Assert BHD uses three decimal places, zero states remain truthful, overdue styling uses the danger token, and no hardcoded non-zero values appear.

- [ ] **Step 2: Run dashboard tests and verify failure**

Run: `flutter test test/features/dashboard`

Expected: FAIL because dashboard classes do not exist.

- [ ] **Step 3: Implement immutable summary parsing**

Reject missing required fields as `INVALID_RESPONSE`. Keep money as decimal strings in the transport model and format only in presentation to avoid binary floating-point changes.

- [ ] **Step 4: Build the direction-C dashboard**

Render greeting/property context, occupancy, due, paid, overdue, pending requests, attention items derived only from non-zero summary values, and role-permitted quick actions. At mobile width, cards wrap into two columns and then one column without horizontal scrolling.

- [ ] **Step 5: Verify dashboard behavior**

Run:

```bash
flutter analyze
flutter test test/features/dashboard
```

Expected: repository and widget tests pass at mobile and desktop sizes.

- [ ] **Step 6: Review checkpoint**

Compare the local API response to the rendered values and confirm the UI does not invent chart history because the Phase 1 endpoint does not provide time-series data.

## Task 7: Repair Property, Unit, Tenant, Owner, and Staff Management

**Files:**
- Create: `apps/saraya_square_app/lib/features/management/domain/management_models.dart`
- Create: `apps/saraya_square_app/lib/features/management/data/management_repository.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/management_controller.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/management_screen.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/resource_definition.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/widgets/resource_table.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/widgets/resource_cards.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/widgets/resource_form_sheet.dart`
- Create: `apps/saraya_square_app/test/features/management/management_repository_test.dart`
- Create: `apps/saraya_square_app/test/features/management/management_screen_test.dart`

**Interfaces:**
- Produces: cursor-paginated list/load/create/update/archive operations for `properties`, `units`, `tenants`, `owners`, and `staff`.
- Consumes: existing collection/item routes under `/api/saraya/v1/{resource}` with `propertyId`, `cursor`, `limit`, `search`, `status`, and `role` query parameters.

- [ ] **Step 1: Write failing repository contract tests**

For each resource, capture list and mutation requests. Assert property scoping is always present except property creation, cursor values are forwarded unchanged, and server `fieldErrors` map to the matching form field.

- [ ] **Step 2: Write failing adaptive presentation tests**

Assert desktop uses a sortable-looking but server-paginated table, mobile uses cards, empty tenants/owners show a useful bilingual empty state, and staff displays `displayNameAr`/`displayNameEn` instead of `userId`.

- [ ] **Step 3: Run management tests and verify failure**

Run: `flutter test test/features/management`

Expected: FAIL because management models and screens do not exist.

- [ ] **Step 4: Implement resource definitions**

Define each resource’s visible columns, searchable fields, filters, create/edit fields, permitted actions, and localized labels in `resource_definition.dart`. Unit status uses localized chips; floors and missing values use localized display text rather than raw `G`/`null` output.

- [ ] **Step 5: Implement repository and controller**

Use a separate immutable model per resource, not `Map<String, dynamic>` in presentation code. The controller maintains query, filter, loaded pages, next cursor, submission state, and last safe data while refreshing.

- [ ] **Step 6: Implement forms and destructive-action safeguards**

Forms show server field errors inline. Archive/deactivate actions require a localized confirmation naming the record. Owner archive remains unavailable because the current API explicitly returns `OWNER_ARCHIVE_UNSUPPORTED`; the UI explains this instead of offering a broken action.

- [ ] **Step 7: Verify management flows**

Run:

```bash
flutter analyze
flutter test test/features/management
```

Expected: repository and presentation tests pass for all five current modules.

- [ ] **Step 8: Review checkpoint**

Exercise list, search, filter, add, edit, and supported deactivate actions against the local database. Confirm no test fixture is written into the shared production database.

## Task 8: Repair Invoices and Account Management

**Files:**
- Create: `apps/saraya_square_app/lib/features/invoices/domain/invoice.dart`
- Create: `apps/saraya_square_app/lib/features/invoices/data/invoice_repository.dart`
- Create: `apps/saraya_square_app/lib/features/invoices/presentation/invoice_list_screen.dart`
- Create: `apps/saraya_square_app/lib/features/account/domain/account_profile.dart`
- Create: `apps/saraya_square_app/lib/features/account/data/account_repository.dart`
- Create: `apps/saraya_square_app/lib/features/account/presentation/account_screen.dart`
- Create: `apps/saraya_square_app/lib/features/account/presentation/change_password_sheet.dart`
- Create: `apps/saraya_square_app/test/features/invoices/invoice_list_screen_test.dart`
- Create: `apps/saraya_square_app/test/features/account/account_screen_test.dart`

**Interfaces:**
- Produces: invoice list by current role/property and account profile/password operations.
- Consumes: `/api/saraya/v1/invoices`, `/api/saraya/v1/account`, and `/api/saraya/v1/account/change-password`.

- [ ] **Step 1: Write failing invoice and account tests**

Cover invoice empty/list/status/amount presentation, payment-link visibility only when present, profile identity-change current-password requirement, password confirmation mismatch, successful 204 password change, and session preservation for the current session.

- [ ] **Step 2: Run tests and verify failure**

Run: `flutter test test/features/invoices test/features/account`

Expected: FAIL because the feature modules do not exist.

- [ ] **Step 3: Implement invoices without unsupported actions**

Render invoice number, unit, issue/due dates, total, paid, outstanding, localized status, and payment action only when the backend provides `paymentUrl`. Do not label a payment as completed based on link opening.

- [ ] **Step 4: Implement account profile and password flows**

Use the backend’s exact bilingual profile fields. When email or phone changes, require current password before submission. Password confirmation is client-side; the API receives only `currentPassword` and `newPassword`.

- [ ] **Step 5: Verify invoices and account**

Run:

```bash
flutter analyze
flutter test test/features/invoices test/features/account
```

Expected: all tests pass and no raw invoice/account status values are visible.

- [ ] **Step 6: Review checkpoint**

Test an empty invoice account and the local administrator account. Confirm empty data looks intentional and profile updates do not expose password values in logs.

## Task 9: Publish the Web Bundle and Run Phase 1 Acceptance

**Files:**
- Create: `apps/saraya_square_app/tool/publish_web.dart`
- Create: `apps/saraya_square_app/integration_test/phase1_smoke_test.dart`
- Modify: `apps/lawyers.bh/lib/saraya/static-bundle.test.ts`
- Replace generated output: `apps/lawyers.bh/public/saraya/**`
- Create: `apps/saraya_square_app/README.md`

**Interfaces:**
- Produces: reproducible Flutter web output under `apps/lawyers.bh/public/saraya/` and a Phase 1 smoke suite.
- Consumes: all Flutter Phase 1 features and the existing Next.js static hosting path.

- [ ] **Step 1: Write a failing static-bundle test**

Extend `static-bundle.test.ts` to assert:

```ts
expect(html).toContain('<base href="/saraya/">');
expect(html).toContain('saraya-square-phase1');
expect(JSON.parse(readFileSync('public/saraya/version.json', 'utf8')))
  .toMatchObject({ app_name: 'saraya_square_app' });
```

Add the build marker to the generated web index through the publisher, not by editing generated output manually after each build.

- [ ] **Step 2: Write the failing integration smoke flow**

`phase1_smoke_test.dart` uses injected fake repositories and covers:

1. Login.
2. Dashboard load.
3. Open units and view localized status.
4. Open staff and view display name.
5. Open invoices empty/list state.
6. Open account and save an unchanged profile.
7. Logout returns to login.

- [ ] **Step 3: Run smoke/static tests and verify failure**

Run:

```bash
cd apps/saraya_square_app && flutter test integration_test/phase1_smoke_test.dart
cd ../lawyers.bh && pnpm vitest run lib/saraya/static-bundle.test.ts
```

Expected: FAIL because publishing metadata and the complete route tree are not present.

- [ ] **Step 4: Implement a safe publisher**

`tool/publish_web.dart` must:

1. Require `build/web/index.html` to exist and contain `/saraya/` base href.
2. Copy the existing `apps/lawyers.bh/public/saraya` to a temporary sibling backup.
3. Copy the new build into a temporary destination.
4. Add the stable build marker and preserve valid `version.json`.
5. Atomically replace the public directory only after validation.
6. Restore the prior directory if replacement fails.

- [ ] **Step 5: Document exact local commands**

In `README.md`, document:

```bash
flutter pub get
flutter gen-l10n
flutter analyze
flutter test
flutter build web --release --base-href /saraya/ \
  --dart-define=SARAYA_API_BASE_URL=http://127.0.0.1:3000
dart run tool/publish_web.dart
```

Also document that production builds omit the API define so requests use the current origin.

- [ ] **Step 6: Run focused Flutter acceptance**

Run:

```bash
cd apps/saraya_square_app
flutter analyze
flutter test
flutter test integration_test/phase1_smoke_test.dart
flutter build web --release --base-href /saraya/
dart run tool/publish_web.dart
```

Expected: analysis, unit/widget tests, integration smoke test, and release web build pass.

- [ ] **Step 7: Run focused backend and bundle acceptance with Node 22**

Run:

```bash
cd apps/lawyers.bh
pnpm vitest run \
  lib/saraya/dashboard/service.test.ts \
  lib/saraya/property-management/service.test.ts \
  lib/saraya/static-bundle.test.ts
pnpm tsc --noEmit
```

Expected: tests and TypeScript pass.

- [ ] **Step 8: Run the broader Saraya regression suite**

Run:

```bash
cd apps/lawyers.bh
pnpm vitest run lib/saraya
```

Expected: all Saraya tests, including the existing meeting-room slice, pass.

- [ ] **Step 9: Verify the local hosted web flow**

Start Lawyers.bh under Node 22 with the configured local Saraya environment, then verify:

```text
http://127.0.0.1:3000/saraya/index.html#/login
http://127.0.0.1:3000/saraya/index.html#/dashboard
http://127.0.0.1:3000/saraya/index.html#/properties
http://127.0.0.1:3000/saraya/index.html#/invoices
http://127.0.0.1:3000/saraya/index.html#/account
```

Acceptance: login works, refresh survives reload, dashboard matches API values, desktop/mobile layouts do not overflow, AR/EN direction changes correctly, and browser console contains no application errors.

- [ ] **Step 10: Final review checkpoint**

Report evidence separately for Flutter tests, backend tests, TypeScript, database-backed API checks, local browser checks, Git status, deployment, and live production. Do not claim deployment or production verification unless each was actually performed.

## Plan Completion Criteria

Phase 1 is complete only when:

- Editable Flutter source exists and builds web/iOS/Android shells.
- Current authentication, dashboard, property management, invoices, and account paths work from maintained source.
- Dashboard and staff values are truthful server projections.
- Arabic RTL and English LTR pass responsive tests.
- The new `/saraya/` bundle is reproducibly generated and served locally.
- Focused and broad Saraya test suites pass.
- No credentials, raw UUID presentation, raw enum presentation, placeholder totals, or fake data remain in Phase 1 screens.
- No claim is made about Phase 2 modules, production deployment, device signing, or store publication.
