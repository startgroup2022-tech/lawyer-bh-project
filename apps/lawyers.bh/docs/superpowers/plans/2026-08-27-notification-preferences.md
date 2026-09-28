# Notification Preferences Implementation Plan

**Goal:** Persist device notification categories and enforce delivery choices.
**Architecture:** PostgreSQL device preferences/token bindings; capability-authenticated preferences API; common outbound filter; Flutter repository and switch controls.
**Tech Stack:** Next 16, postgres-js/Drizzle migrations, Flutter secure storage, existing Firebase Messaging.

## Constraints
- Preserve request/lawyer authorization, inbox history and unrelated work.
- No production migration/deployment or Firebase configuration changes.
- Defaults on; master preserves individual choices; failed saves do not appear successful.

### Server
- [x] Write failing validation and isolated database tests: independent devices, token binding conflict, master/category filters, token rotation, defaults and strict booleans.
- [x] Add `lib/notification-preferences/{validation,store,http}.ts`, `drizzle/0050_mobile_notification_preferences.sql`, schema/journal and `app/api/mobile/notification-preferences/route.ts`.
- [x] Exercise category filtering against the actual isolated database; only permitted tokens are returned.
- [x] Add sender tests proving disabled tokens never reach Firebase for request/call/admin payloads; wire common filtering into existing senders.

### Flutter
- [x] Write failing repository tests for server save failures and secure identity reuse.
- [x] Add preference model, device key storage and repository under client notifications/data; bind FCM token before existing registration operations.
- [x] Write failing widget tests for four switches, master toggle preserving category choices, failed save and lifecycle reload.
- [x] Update the profile settings page with category cards and retain OS permission status/settings link. Native incoming alert checks persisted preference cache for already-in-flight pushes.

### Verify
- [x] Run focused backend and Flutter tests/analyzer; real isolated PostgreSQL integration tests.
- [x] Run production build without migrations and incremental iOS simulator build; inspect disk space first.
- [x] Review diff and stop the isolated database. Report local results separately from production/device push delivery.

## Local verification — 2026-08-27

- Backend: 27 tests passed in 8 files (preferences, request/call sender, admin sender, inbox), including the actual new SQL migration inside a disposable schema.
- Backend scoped ESLint: passed. Next.js production build (`build:next-only`, harmless local DB URL override): passed; no production migrations executed.
- Flutter: 30 focused tests passed (preferences repository/UI, inbox, profile navigation, token registration, native call alert guard); includes narrow 320px RTL, large text, light/dark themes.
- Flutter scoped analyzer: no issues. iOS simulator debug build: passed (`build/ios/iphonesimulator/Runner.app`). No physical-device APNs/FCM delivery claim.
- Scoped diff whitespace checks: passed. User's unrelated changes preserved.

## Release sequence (not executed)

1. Apply migration `0050_mobile_notification_preferences.sql` and deploy the matching backend before distributing this app version. The normal backend build includes migrations; the local verification explicitly bypassed them.
2. Deploy the app update. New registration intentionally stops if preference binding fails, avoiding sending alerts before preferences are attached.
3. On a physical device, verify each category with real push delivery, token rotation, app background/foreground and OS notification permission off/on.

Settings are device-specific. Muting does not erase inbox history, disable an open chat, or add new chat-message push delivery where none exists. Legacy unbound devices keep prior behavior until they run the updated app and bind their token.
