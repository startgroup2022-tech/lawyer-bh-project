# Country availability implementation and handoff

## Scope

Independent app and website settings, a searchable ISO 3166-1 catalog (249 countries and territories), and one optional background per country. Settings are stored in PostgreSQL; missing settings mean disabled. Only super administrators can manage settings and uploads. The user clarified that country selection belongs ONLY in Flutter: each website will have its own country domain, without a country picker.

Visibility is not service provisioning or payment readiness. The legacy `countries.is_active` trigger provisions tables, so this feature never updates it. Existing orders, webhooks and lawyer sessions are untouched. Current ordering UI remains Bahrain-only because current payment/request flows contain Bahrain-specific assumptions.

## Implementation

- [x] Catalog, independent switches, public `GET /api/countries?channel=app|website`, fail-closed errors.
- [x] Dedicated `country_channel_settings` table and migration 0045, backfilling existing active/provisioned countries without triggering provisioning.
- [x] Super-admin page `/ar/admin/countries` (also English), search, switches, upload and saved/error states.
- [x] Authenticated same-origin image upload using existing Vercel Blob storage, 4 MB limit, PNG/JPEG/WebP header checks. Previous media are retained.
- [x] Flutter fetches app countries, reconciles saved selection, refreshes on resume and before new requests, supports remote backgrounds, and completes splash readiness on empty/error states.
- [x] Remove the unused website selector and its now-obsolete selector tests, along with the homepage's unused country database query. Preserve the current homepage content.
- [x] Admin-managed website URL per country, separate Save URL button, normalization, HTTPS validation and clearing. Migration 0046 adds the nullable `website_url` field without changing activation.
- [ ] Domain-specific website activation is NOT wired yet. The user will enter each URL in admin; deployment/domain routing must then consume that mapping. Do not interpret the stored website switch as an enforced domain gate or a DNS configuration change.
- [x] PostgreSQL migration tested in an isolated temporary cluster; transaction rolled back.
- [ ] Deployment, production migration and real-device/storage smoke tests require separate verification.

## Verification commands

Use Node 22 in `apps/lawyers.bh`:

```sh
pnpm exec vitest run lib/countries app/api/countries/route.test.ts app/api/admin/country-settings/route.test.ts
pnpm exec tsc --noEmit --incremental false
pnpm run build:next-only
```

Do not use the default build for local verification: it also runs migrations. The configured local DATABASE_URL was invalid during this run; verify the deployment environment separately without printing secrets.

Migration integration test: run `psql -f test/countries-migration.sql` ONLY against an empty disposable database. It rolls back its fixture and guards against accidental writes to the legacy countries table.

In `/Users/hma/legalsos_app`:

```sh
flutter test test/core/services/active_countries_service_test.dart test/features/auth/screens test/features/shared/home/screens test/features/lawyer/home/screens/lawyer_home_browse_test.dart
```

## Release order / checks

1. Obtain the country domain mapping and finish website activation integration; review the migration and target database. Do not reintroduce a website country picker.
2. Apply migrations 0045 and 0046 in the intended deployment environment before serving the new endpoint. Do not deploy the app first: old endpoints do not return the new availability contract.
3. Deploy backend/web, confirm existing countries retained, and confirm `BLOB_READ_WRITE_TOKEN` for backgrounds.
4. Verify app-only, website-only, both-off, background upload and failed-save recovery on preview.
5. Build/release Flutter and verify on device: saved disabled country, empty list, offline startup, slow refresh, real background loading, and SOS routing. Countries not ready for services should show availability guidance, never enter a Bahrain payment flow.

The switches govern the country lists, not a universal ban on direct API calls or historical service access. Adding full country-level service authorization or international payment support is separate work.

## Last verified results

- Flutter focused suite: 16 passed, including a slow-response SOS navigation regression.
- Backend/catalog/upload validation and API tests: 11 passed in the previous run. Two obsolete website-selector tests were removed following the user's explicit domain-per-country clarification.
- Production-mode Next build passed with a temporary valid local DATABASE_URL override. The original environment remains unchanged and its database URL is invalid.
- Isolated PostgreSQL migration test passed and rolled back. The temporary server was stopped.
- No deployment or production migration was performed by this task. Device and actual Blob upload verification remain outstanding.
