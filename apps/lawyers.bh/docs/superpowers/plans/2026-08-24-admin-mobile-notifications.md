# Admin Mobile Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an authorized admin page that sends immediate bilingual iPhone notifications to members, filtered lawyer groups, or everyone, while registering all reachable client installations.

**Architecture:** Extend the existing mobile installation table with an authoritative client/lawyer role and add an aggregate-only send audit table. Keep audience selection, validation, Firebase batching, and persistence in focused backend modules consumed by permission-protected admin APIs and page UI; update the Flutter coordinator so every notification-enabled iPhone registers its current role.

**Tech Stack:** Next.js 16, React, TypeScript, Drizzle/PostgreSQL, Firebase Admin Messaging, Vitest, Flutter/Dart, Firebase Messaging, Flutter tests.

## Global Constraints

- iPhone/iOS only; reject Android in this version.
- Reachable users are installations that granted permission and supplied an FCM token.
- Audience keys are exactly `clients`, `active_lawyers`, `pending_lawyers`, `all_lawyers`, and `everyone`.
- Active lawyers require `status = 'approved'` and `is_active = true`; pending lawyers require `status = 'pending'`.
- Deduplicate by token and send in batches of at most 500.
- Arabic devices receive Arabic content; English and Turkish devices receive English content.
- Titles are required and at most 100 characters; bodies are required and at most 500 characters.
- Require `manage_notifications`, preview, explicit confirmation, and UUID idempotency.
- Never expose or log device tokens.
- Do not apply migrations, deploy, release the iPhone app, or send a live broadcast without separate approval.

---

## File Structure

- Database: add migration `0042_admin_mobile_notifications.sql`, verification SQL, journal entry, and Drizzle schema fields/tables.
- Authorization: extend admin permission constants, labels, dashboard card, and tests.
- Installation identity: extend `mobile-push-store.ts`; add `/api/mobile/push/client` and route tests.
- Broadcast core: create `lib/admin/mobile-notifications/{validation,store,sender}.ts` with focused tests.
- Admin API/UI: create `/api/admin/mobile-notifications` and `/{locale}/admin/mobile-notifications`.
- Flutter: extend push API/registration/coordinator and their existing tests.

### Task 1: Schema and Admin Permission

**Files:**
- Create: `apps/lawyers.bh/drizzle/0042_admin_mobile_notifications.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0042_admin_mobile_notifications.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Modify: `apps/lawyers.bh/lib/auth/admin-permissions.ts`
- Modify: `apps/lawyers.bh/lib/auth/admin-permissions.test.ts`
- Modify: admin permission labels in `app/[locale]/admin/admin-users/AdminUsersContent.tsx` and `app/[locale]/admin/profile/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/page.tsx`

**Interfaces:**
- Produces `manage_notifications` as an `AdminPermission`.
- Produces schema fields `mobilePushInstallations.audienceRole` and table `adminMobileNotificationSends`.

- [ ] **Step 1: Update failing permission and journal tests**

Add `manage_notifications` to the literal stable permission list in `admin-permissions.test.ts`. Add a journal test asserting `0042_admin_mobile_notifications` appears exactly once and both SQL files exist.

- [ ] **Step 2: Run the two tests and verify RED**

Run: `pnpm --filter lawyers.bh exec vitest run lib/auth/admin-permissions.test.ts test/drizzle-journal.test.ts`

Expected: permission list and missing migration assertions fail.

- [ ] **Step 3: Add migration and schema**

Migration essentials:

```sql
ALTER TABLE public.bahrain_mobile_push_installations
  ADD COLUMN IF NOT EXISTS audience_role text;
UPDATE public.bahrain_mobile_push_installations
SET audience_role = CASE WHEN lawyer_id IS NULL THEN 'client' ELSE 'lawyer' END
WHERE audience_role IS NULL;
ALTER TABLE public.bahrain_mobile_push_installations
  ALTER COLUMN audience_role SET DEFAULT 'client',
  ALTER COLUMN audience_role SET NOT NULL;
ALTER TABLE public.bahrain_mobile_push_installations
  ADD CONSTRAINT bahrain_mobile_push_installations_audience_role_check
  CHECK (audience_role IN ('client', 'lawyer'));
CREATE INDEX IF NOT EXISTS bahrain_mobile_push_installations_audience_role_idx
  ON public.bahrain_mobile_push_installations (audience_role);

CREATE TABLE IF NOT EXISTS public.bahrain_admin_mobile_notification_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.bahrain_admin_users(id),
  audience text NOT NULL CHECK (audience IN ('clients','active_lawyers','pending_lawyers','all_lawyers','everyone')),
  title_ar varchar(100) NOT NULL,
  body_ar varchar(500) NOT NULL,
  title_en varchar(100) NOT NULL,
  body_en varchar(500) NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  state text NOT NULL CHECK (state IN ('sending','completed','failed')),
  targeted_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  pruned_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

Add journal index 35/version 7 with tag `0042_admin_mobile_notifications`. Mirror the SQL in Drizzle schema types without running it.

- [ ] **Step 4: Add permission and dashboard card**

Append `manage_notifications` to `ADMIN_PERMISSION_KEYS`; defaults grant it to normal admins through the existing default logic but not reviewers. Add bilingual label `إرسال إشعارات التطبيق / Send app notifications` and a dashboard card linking to `/admin/mobile-notifications`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the permission and journal tests again; expected all pass. Run `git diff --check` and commit only Task 1 files with `feat: add mobile notification schema and permission`.

### Task 2: Installation Roles and Client Registration API

**Files:**
- Modify: `apps/lawyers.bh/lib/sos/mobile-push-store.ts`
- Modify: `apps/lawyers.bh/lib/sos/mobile-push-store.test.ts`
- Create: `apps/lawyers.bh/app/api/mobile/push/client/route.ts`
- Create: `apps/lawyers.bh/app/api/mobile/push/client/route.test.ts`
- Create: `apps/lawyers.bh/lib/sos/client-push-rate-limit.ts`

**Interfaces:**
- `MobilePushInstallation` gains `audienceRole: 'client' | 'lawyer'`.
- Store gains `registerClientInstallation(input)`.
- `PUT /api/mobile/push/client` accepts `{token, platform:'ios', locale}` and returns 204.

- [ ] **Step 1: Write failing store role-transition tests**

Cover these literal behaviors:

```ts
await store.registerClientInstallation(clientInput);
expect(saved).toMatchObject({ audienceRole: "client", lawyerId: null });
await store.registerLawyerInstallation({ ...clientInput, lawyerId: "lawyer-1" });
expect(saved).toMatchObject({ audienceRole: "lawyer", lawyerId: "lawyer-1" });
await store.registerClientInstallation(clientInput);
expect(saved).toMatchObject({ audienceRole: "lawyer", lawyerId: "lawyer-1" });
await store.unregisterLawyerInstallation(token, "lawyer-1");
expect(saved).toMatchObject({ audienceRole: "client", lawyerId: null });
```

- [ ] **Step 2: Write failing client route tests**

Verify iOS/ar-en-tr acceptance, Android/malformed token rejection, rate-limit 429, and that response bodies never contain the token.

- [ ] **Step 3: Run tests and verify RED**

Run: `pnpm --filter lawyers.bh exec vitest run lib/sos/mobile-push-store.test.ts app/api/mobile/push/client/route.test.ts`

- [ ] **Step 4: Implement safe role upserts**

For public client registration, use `ON CONFLICT (fcm_token) DO UPDATE` to update platform/locale/last_seen only, preserving an existing lawyer role and lawyer ID. Authenticated lawyer registration sets `audience_role='lawyer'`; authenticated logout sets role `client` and clears lawyer ID.

Implement a bounded in-memory per-IP limiter (for example 20 registrations per 10 minutes, maximum 10,000 tracked keys with expired-entry pruning). Treat it as abuse reduction, not authentication.

- [ ] **Step 5: Verify and commit**

Run focused tests, lint the changed files, and commit Task 2 files with `feat: register client push installations`.

### Task 3: Audience Selection and Firebase Broadcast Sender

**Files:**
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/types.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/validation.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/validation.test.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/store.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/store.test.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/sender.ts`
- Create: `apps/lawyers.bh/lib/admin/mobile-notifications/sender.test.ts`

**Interfaces:**
- `NotificationAudience` is the five-key union.
- `parseMobileNotificationInput(value)` returns normalized safe content or a typed validation failure.
- Store exposes `countAudience`, `tokensForAudience`, `startSend`, `completeSend`, `failSend`, `recentSends`, and `pruneTokens`.
- Sender exposes `sendAdminMobileNotification(input, deps)`.

- [ ] **Step 1: Write validation tests**

Verify allowed audiences, `confirmed === true`, UUID idempotency, required trimmed bilingual fields, and 100/500 limits.

- [ ] **Step 2: Write audience store tests**

Use an injected SQL boundary and assert generated predicates for clients, approved+active lawyers, pending lawyers, all lawyers, and everyone. Assert `SELECT DISTINCT fcm_token, locale` and no token is returned by history methods.

- [ ] **Step 3: Write sender RED tests**

Create 501 fixtures to prove two batches, Arabic/English locale partitioning, permanent invalid-token pruning, totals, and idempotency reuse. Expected payload data is:

```ts
data: { type: "admin_broadcast", notificationId: "notification-1" }
```

- [ ] **Step 4: Implement modules minimally**

Partition tokens by localized title/body, then chunk each locale group in arrays of 500. Use Firebase `sendEachForMulticast`; count successes/failures and collect only tokens whose error codes are permanently invalid. Persist aggregate results and never return tokens.

- [ ] **Step 5: Verify and commit**

Run the three focused test files and commit Task 3 files with `feat: add targeted mobile notification delivery`.

### Task 4: Permission-Protected Admin APIs

**Files:**
- Create: `apps/lawyers.bh/app/api/admin/mobile-notifications/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/mobile-notifications/route.test.ts`

**Interfaces:**
- `GET ?audience=<key>` returns `{audience,count,history}`.
- `POST` returns `{id,state,audience,targeted,successful,failed,pruned}`.

- [ ] **Step 1: Write route RED tests**

Verify unauthenticated/unauthorized 403, invalid input 400, missing confirmation 400, preview count, no token leakage, successful aggregate response, and repeated idempotency returning the existing result without a second Firebase call.

- [ ] **Step 2: Implement GET and POST**

Both handlers call `requireAdminPermission('manage_notifications')`. POST passes `admin.id` from the authenticated session, never a request-supplied admin ID.

- [ ] **Step 3: Verify and commit**

Run route and core tests, lint, then commit with `feat: add admin notification APIs`.

### Task 5: Admin Notification Page

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/mobile-notifications/page.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/mobile-notifications/Content.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/mobile-notifications/Content.test.tsx`

**Interfaces:**
- Server page requires `manage_notifications` and loads no tokens.
- Client component consumes only aggregate preview/history API data.

- [ ] **Step 1: Write UI RED tests**

Test five audience options, four required fields, counters, preview count, bilingual cards, confirmation modal, exact irreversible warning, disabled in-flight button, stable UUID across retries, successful counts, and displayed API errors.

- [ ] **Step 2: Implement bilingual page**

Use the established red/blue admin visual language, responsive cards, accessible labels, and `dir`-appropriate previews. Generate `crypto.randomUUID()` once when opening confirmation and retain it for retries until the content/audience changes.

- [ ] **Step 3: Verify and commit**

Run the component and API tests, lint the page, and commit with `feat: add admin mobile notification page`.

### Task 6: iPhone Client Installation and Foreground Presentation

**Files:**
- Modify: `/Users/hma/legalsos_app/lib/services/mobile_push_api_service.dart`
- Modify: `/Users/hma/legalsos_app/lib/services/mobile_push_registration_service.dart`
- Modify: `/Users/hma/legalsos_app/lib/services/mobile_push_coordinator.dart`
- Modify: `/Users/hma/legalsos_app/test/services/mobile_push_api_service_test.dart`
- Modify: `/Users/hma/legalsos_app/test/services/mobile_push_registration_service_test.dart`

**Interfaces:**
- `MobilePushApi.registerClientInstallation({fcmToken, locale})` calls `/mobile/push/client`.
- Registration service registers current role on startup and token refresh.
- Coordinator enables iOS foreground presentation.

- [ ] **Step 1: Write Flutter RED tests**

Add API test expecting unauthenticated `PUT /mobile/push/client` with token/platform/locale. Add service tests proving client startup registration, lawyer-role refresh without calling the public client-installation endpoint when logged in, client-role refresh when logged out, and logout returning the token to client registration after authenticated unbind. Existing request-specific subscriptions remain independent and continue to refresh in either role.

- [ ] **Step 2: Implement role-aware registration**

When no lawyer token exists, call `registerClientInstallation` before request-specific subscriptions. When lawyer token exists, register only the lawyer role plus existing request subscriptions. Catch client registration errors so startup continues.

- [ ] **Step 3: Enable foreground iOS presentation**

During coordinator initialization call:

```dart
await messaging.setForegroundNotificationPresentationOptions(
  alert: true,
  badge: true,
  sound: true,
);
```

This uses Firebase Messaging's native iOS foreground presentation and requires no new package.

- [ ] **Step 4: Verify Flutter**

Run focused service tests, `flutter analyze`, then the full Flutter test suite. Record simulator/device delivery as a separate evidence level.

- [ ] **Step 5: Commit Flutter changes separately**

In `/Users/hma/legalsos_app`, inspect its independent working tree and commit only the five push files with `feat: register client devices for admin notifications`.

### Task 7: Integrated Verification and Handoff

**Files:** all files from Tasks 1-6.

- [ ] **Step 1: Backend verification**

Run focused tests, `tsc --noEmit --incremental false`, lint changed files, and the full `pnpm --filter lawyers.bh test` suite.

- [ ] **Step 2: Flutter verification**

Run `flutter analyze` and the full Flutter tests using the configured Flutter SDK.

- [ ] **Step 3: Safety review**

Inspect both working trees. Confirm no migration was applied, no deployment/release occurred, no live Firebase send occurred, no tokens appear in API responses/logging/tests, and no unrelated changes were committed.

- [ ] **Step 4: Controlled next step**

Report the backend and Flutter commits, exact verification counts, and the remaining production sequence: verify database target, approve migration, deploy backend, distribute iPhone build, then send one controlled test notification to verified devices.
