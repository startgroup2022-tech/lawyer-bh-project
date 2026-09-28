# LegalSOS Staged Lawyer Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clear LegalSOS navbar registration entry that lets a lawyer begin with only name, email, and the shared personal/license number, then keeps the account locked until the full profile is submitted and an administrator approves it.

**Architecture:** Store minimal registrations in a dedicated global onboarding table with hashed, expiring verification and session tokens. LegalSOS uses same-origin proxy routes and an HTTP-only onboarding cookie; lawyers.bh remains authoritative for validation, email delivery, pending lawyer creation, and administrative activation. The existing detailed registration UI is reused in an onboarding mode, but no public completion endpoint can set `approved` or `is_active = true`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Drizzle/PostgreSQL, Postmark, existing private upload services, pnpm with Node 22.

## Global Constraints

- Preserve all unrelated dirty-worktree changes; do not reset, stage, commit, push, deploy, or publish.
- Use Node `/Users/hma/.nvm/versions/node/v22.22.2/bin` for pnpm commands.
- The quick form contains exactly full name, email, and one personal/license identifier; country is derived from the selected LegalSOS country.
- The quick name fills the current interface-language name; the second-language name is collected during full profile completion when required.
- The raw verification token and onboarding session token are never stored; persist SHA-256 hashes only.
- A staged or submitted lawyer cannot access the provider dashboard, accept requests, or appear in the public directory.
- Full profile submission creates `profile_completed = true`, `status = pending`, and `is_active = false`.
- Only the existing administrator approval route may set `status = approved` and `is_active = true`.
- Existing LegalSOS mobile registration, existing full web registration, and client portal behavior remain compatible.
- Do not send a real email or create a real lawyer account during local verification; mock delivery and use development-only visual preview states.
- Report unit tests, database/migration verification, typecheck/lint/build, local visual preview, Git state, and deployment state separately.

---

### Task 1: Add the Staged-Onboarding Data Model and Security Primitives

**Files:**
- Create: `apps/lawyers.bh/drizzle/0121_legalsos_lawyer_onboarding.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0121_legalsos_lawyer_onboarding.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding.test.ts`

**Interfaces:**
- Produces:

```ts
export type LawyerOnboardingStatus =
  | "email_pending"
  | "profile_incomplete"
  | "submitted"
  | "expired"
  | "cancelled";

export function normalizeProfessionalIdentifier(value: string): string;
export function createOpaqueToken(): string;
export function hashOpaqueToken(token: string): string;
export function safeEqualTokenHash(token: string, expectedHash: string): boolean;

export type LawyerOnboardingPublicState = {
  id: string;
  countryCode: string;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: "ar" | "en" | "tr";
  status: LawyerOnboardingStatus;
  linkedLawyerId: string | null;
};
```

- Persists one active onboarding per `(country_code, normalized_email)` and `(country_code, professional_identifier)`.
- Persists hashed rate-limit buckets in `legalsos_lawyer_onboarding_rate_limits`; no raw IP address, email, identifier, or token is stored in the limiter table.

- [ ] **Step 1: Write failing token and normalization tests**

Add tests proving whitespace/case normalization, Arabic-digit conversion for the identifier, 32-byte URL-safe token generation, deterministic SHA-256 hashing, and timing-safe comparison:

```ts
expect(normalizeProfessionalIdentifier(" ١٢-٣٤ ٥ ")).toBe("12-345");
const token = createOpaqueToken();
expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(safeEqualTokenHash(token, hashOpaqueToken(token))).toBe(true);
expect(safeEqualTokenHash(`${token}x`, hashOpaqueToken(token))).toBe(false);
```

- [ ] **Step 2: Run the focused test and confirm red**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh vitest run lib/registration/lawyer-onboarding.test.ts
```

Expected: FAIL because `lawyer-onboarding.ts` does not exist.

- [ ] **Step 3: Add the migration and Drizzle schema**

Create `legalsos_lawyer_onboarding` with UUID primary key, country/name/email/identifier fields, status text with a check constraint, verification/session token hashes and expiries, verified/submitted timestamps, linked lawyer UUID, locale/request metadata, and timestamps. Add `legalsos_lawyer_onboarding_rate_limits` with a hashed bucket primary key, window start, count, and updated timestamp. Add partial unique indexes limited to `email_pending` and `profile_incomplete` so expired/cancelled history does not block a new attempt:

```sql
CREATE UNIQUE INDEX legalsos_lawyer_onboarding_email_active_uidx
ON legalsos_lawyer_onboarding (country_code, normalized_email)
WHERE status IN ('email_pending', 'profile_incomplete');

CREATE UNIQUE INDEX legalsos_lawyer_onboarding_identifier_active_uidx
ON legalsos_lawyer_onboarding (country_code, professional_identifier)
WHERE status IN ('email_pending', 'profile_incomplete');
```

Add indexes for verification hash, session hash, status, and `linked_lawyer_id`. The verification SQL must assert both tables, the status check, partial unique indexes, and token indexes exist.

- [ ] **Step 4: Implement the pure security helpers and repository contracts**

Use `randomBytes(32).toString("base64url")`, `createHash("sha256")`, and `timingSafeEqual`. Keep SQL methods behind explicit functions in the same module:

```ts
export async function beginLawyerOnboarding(input: {
  countryCode: string;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: "ar" | "en" | "tr";
  verificationTokenHash: string;
  verificationExpiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ id: string; deliveryEmail: string }>;

export async function verifyLawyerOnboarding(input: {
  verificationToken: string;
  sessionTokenHash: string;
  sessionExpiresAt: Date;
}): Promise<LawyerOnboardingPublicState | null>;

export async function readLawyerOnboardingSession(
  sessionToken: string,
): Promise<LawyerOnboardingPublicState | null>;
```

Use an upsert/rotation path for the same incomplete identity and return a generic conflict result when the email and identifier point to different active records.

- [ ] **Step 5: Run focused tests and migration contract verification**

Run the pure tests, existing migration-contract test command used by `apps/lawyers.bh`, and the new verify SQL against the configured test database when available. Expected: pure tests PASS; database evidence is reported as PASS or explicitly unverified, never silently skipped.

### Task 2: Start Registration, Rate-Limit It, and Send the Verification Link

**Files:**
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding-rate-limit.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding-rate-limit.test.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding-email.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-onboarding-email.test.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/start/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/start/route.test.ts`

**Interfaces:**
- Consumes JSON:

```ts
type StartOnboardingInput = {
  countryCode: string;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: "ar" | "en" | "tr";
};
```

- Produces the same non-enumerating response for new, repeated, and already-known identities:

```json
{"ok":true,"nextStep":"check_email"}
```

- [ ] **Step 1: Write failing rate-limit and route tests**

Assert a 15-minute window with at most five start attempts per hashed IP bucket and five per hashed normalized-email bucket. Assert the route rejects invalid countries, blank/overlong names, malformed email, and blank/overlong identifier, while successful and duplicate-safe responses have the same status/body.

- [ ] **Step 2: Run focused tests and confirm red**

Run both new test files. Expected: FAIL because the modules and route do not exist.

- [ ] **Step 3: Implement the onboarding email builder**

Build localized Arabic/English/Turkish subject, text, and escaped HTML. Use:

```ts
const verificationUrl = new URL(`/${locale}/lawyer/register`, legalSosWebsiteUrl);
verificationUrl.searchParams.set("token", rawVerificationToken);
```

Require `LEGAL_SOS_WEBSITE_URL`, `POSTMARK_SERVER_TOKEN`, and the existing approved sender configuration. Never log the raw token or full link.

- [ ] **Step 4: Implement start registration**

Validate the country through `ensureCountryProvisionedForRegistration`, normalize the identity, run both rate-limit checks, rotate/create the staged record with a 30-minute verification expiry, and send the verification email. Return the generic accepted response even when an approved/pending account already exists; do not disclose account state.

- [ ] **Step 5: Run focused tests**

Expected: all route, email, and limiter tests PASS with email delivery mocked and with assertions that logs contain no token or identifier.

### Task 3: Verify Email and Establish a Resumable Locked Session

**Files:**
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/verify/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/verify/route.test.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/status/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/status/route.test.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/resend/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/resend/route.test.ts`
- Modify: `apps/lawyers.bh/lib/registration/lawyer-onboarding.ts`

**Interfaces:**
- `POST /verify` consumes `{ token }` and returns `{ ok, onboardingAccessToken, state }` once.
- `GET /status` consumes `Authorization: Bearer <onboardingAccessToken>` and returns the safe onboarding state.
- `POST /resend` consumes `{ email, countryCode, locale }` and always returns `{ ok: true }` unless rate-limited.

- [ ] **Step 1: Write failing transition and replay tests**

Assert:

```ts
expect(await verify(validToken)).toMatchObject({ status: "profile_incomplete" });
expect(await verify(validToken)).toBeNull(); // token is single-use
expect(await readSession(sessionToken)).toMatchObject({ status: "profile_incomplete" });
expect(await readSession(expiredSessionToken)).toBeNull();
```

Also assert expired/unknown tokens return stable `LINK_INVALID_OR_EXPIRED`, resend does not enumerate, a verified `profile_incomplete` record can receive a new one-use resume link, and submitted records return `pending_approval` without issuing a new profile-edit session.

- [ ] **Step 2: Run focused tests and confirm red**

Expected: FAIL because verification/status/resend routes do not exist.

- [ ] **Step 3: Implement atomic verification**

In one conditional update, require a matching verification hash, an eligible status of `email_pending` or `profile_incomplete`, and a future expiry. Transition `email_pending` to `profile_incomplete`, preserve `profile_incomplete` for resume links, set `verified_at` when absent, rotate the session hash with a seven-day expiry, and clear the verification hash/expiry. Return the raw session token only in the successful backend response.

- [ ] **Step 4: Implement status and resend**

Status returns only safe fields and maps linked lawyer state to `profile_incomplete`, `pending_approval`, `approved`, or `rejected`. Resend rotates the verification token for eligible `email_pending` and `profile_incomplete` records, allowing secure session recovery, and sends the generic response for all identities.

- [ ] **Step 5: Run focused tests**

Expected: all transition, expiry, replay, authorization-header, and non-enumeration tests PASS.

### Task 4: Submit the Full Profile as Pending Without Activating It

**Files:**
- Modify: `apps/lawyers.bh/app/api/join/route.ts`
- Create: `apps/lawyers.bh/lib/registration/staged-lawyer-submission.ts`
- Create: `apps/lawyers.bh/lib/registration/staged-lawyer-submission.test.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/submit/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/onboarding/submit/route.test.ts`
- Modify: `apps/lawyers.bh/lib/registration/lawyer-onboarding.ts`
- Test: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.test.ts`
- Test: `apps/lawyers.bh/lib/provider/provider-access.test.ts`

**Interfaces:**
- Produces:

```ts
export type LockedOnboardingIdentity = {
  onboardingId: string;
  countryCode: string;
  locale: "ar" | "en" | "tr";
  fullName: string;
  email: string;
  professionalIdentifier: string;
};

export async function submitStagedLawyerApplication(input: {
  request: Request;
  identity: LockedOnboardingIdentity;
}): Promise<NextResponse>;
```

- [ ] **Step 1: Write failing identity-lock and activation tests**

Submit multipart data that attempts to replace email, country, identifier, and current-language name. Assert the persisted application uses the verified identity, creates exactly one lawyer, and returns:

```ts
expect(result).toMatchObject({
  status: "pending",
  profileCompleted: true,
  isActive: false,
  nextStep: "pending_approval",
});
```

Assert a repeated submission reconciles to the already-linked lawyer rather than inserting another row. Assert no call path writes `approved`, `is_active = true`, `reviewed_at`, or default commission rates.

- [ ] **Step 2: Run focused tests and confirm red**

Run the staged-submission and route tests. Expected: FAIL because the service and route do not exist.

- [ ] **Step 3: Extract the pending-application boundary from the existing join route**

Reuse existing field validation, agreement binding, private document uploads, password hashing, duplicate checks, notification delivery, and country table routing. Add an optional locked identity at the service boundary; never trust matching fields from the browser when it is present.

Keep the final insert values exactly:

```ts
status: "pending",
isActive: false,
profileCompleted: true,
completedProfileAt: new Date(),
reviewedAt: null,
reviewedBy: null,
```

Do not use `app/api/provider/complete-profile/route.ts` because that invitation path currently approves and activates its target.

- [ ] **Step 4: Link onboarding to the pending lawyer idempotently**

After a successful insert, conditionally update the onboarding row from `profile_incomplete` to `submitted`, set `linked_lawyer_id` and `submitted_at`, and clear its session hash. If the link update is retried, find the matching pending lawyer by locked country/email/identifier and reconcile the same ID.

- [ ] **Step 5: Verify the approval boundary**

Extend focused tests proving provider access returns `pending_approval` after submission and only `app/api/admin/provider-applications/[id]/approve/route.ts` changes the row to approved/active after a membership number is supplied.

- [ ] **Step 6: Run focused backend tests**

Run staged submission, join route, provider access, and admin approval tests. Expected: all PASS and no existing mobile/full-registration regression.

### Task 5: Add Safe Same-Origin LegalSOS Proxy Routes and Cookie Handling

**Files:**
- Create: `apps/legal-sos-website/lib/lawyer-onboarding-session.ts`
- Create: `apps/legal-sos-website/test/lawyer-onboarding-session.test.ts`
- Create: `apps/legal-sos-website/app/api/lawyer/onboarding/start/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer/onboarding/verify/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer/onboarding/status/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer/onboarding/resend/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer/onboarding/submit/route.ts`
- Create: `apps/legal-sos-website/test/lawyer-onboarding-proxy.test.ts`

**Interfaces:**
- Uses HTTP-only cookie `legalsos_lawyer_onboarding` locally and `__Host-legalsos_lawyer_onboarding` over HTTPS.
- The verify proxy removes `onboardingAccessToken` from JSON and stores it only in the cookie.
- Status and submit proxies read the cookie and forward it as a backend bearer token.

- [ ] **Step 1: Write failing proxy and cookie tests**

Assert HTTPS/localhost backend allowlisting, `Cache-Control: no-store`, no forwarding of browser-supplied authorization, secure cookie flags, token removal from response JSON, same-origin checks for write routes, and cookie clearing after successful submission or invalid/expired session.

- [ ] **Step 2: Run focused tests and confirm red**

Expected: FAIL because the proxy modules do not exist.

- [ ] **Step 3: Implement origin and cookie helpers**

Use:

```ts
export function assertSameOrigin(request: Request): void;
export function onboardingCookieName(request: Request): string;
export function setOnboardingCookie(response: NextResponse, request: Request, token: string): void;
export function clearOnboardingCookie(response: NextResponse, request: Request): void;
```

Set `httpOnly: true`, `sameSite: "strict"`, `secure` on HTTPS, `path: "/"`, and `maxAge: 7 * 24 * 60 * 60`.

- [ ] **Step 4: Implement the five proxy routes**

Start/resend forward JSON. Verify forwards the raw email token once and converts the backend access token to the cookie. Status and submit require the cookie; submit preserves multipart boundaries by forwarding `FormData` without a manual content-type header.

- [ ] **Step 5: Run focused tests**

Expected: all proxy/session tests PASS and no response exposes the onboarding access token.

### Task 6: Add the Navbar Entry and Quick Registration Experience

**Files:**
- Modify: `apps/legal-sos-website/components/Header.tsx:33`
- Modify: `apps/legal-sos-website/lib/translations/ar.ts:8`
- Modify: `apps/legal-sos-website/lib/translations/en.ts:6`
- Modify: `apps/legal-sos-website/lib/translations/tr.ts:6`
- Create: `apps/legal-sos-website/app/[locale]/lawyer/register/page.tsx`
- Create: `apps/legal-sos-website/components/LawyerOnboardingFlow.tsx`
- Create: `apps/legal-sos-website/components/LawyerOnboardingFlow.module.css`
- Create: `apps/legal-sos-website/test/lawyer-onboarding-ui.test.tsx`
- Modify: `apps/legal-sos-website/test/header-country-selector.test.tsx`

**Interfaces:**
- `Header` links to `/${locale}/lawyer/register` with localized label.
- `LawyerOnboardingFlow` owns UI states:

```ts
type LawyerOnboardingView =
  | "quick_form"
  | "check_email"
  | "verifying"
  | "profile_incomplete"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "link_invalid";
```

- [ ] **Step 1: Write failing navbar and quick-form tests**

Assert the navbar contains a visible localized registration link on desktop/mobile and retains the existing header controls. Assert the quick form renders exactly three editable user fields and posts normalized input plus selected country/locale to `/api/lawyer/onboarding/start`.

- [ ] **Step 2: Run focused UI tests and confirm red**

Expected: FAIL because the route/component/nav label do not exist.

- [ ] **Step 3: Add translations and navbar link**

Use Arabic `سجّل كمحامٍ`, English `Register as a lawyer`, and Turkish `Avukat olarak kaydol`. Do not rename or remove current nav items, country selector, language selector, or sign-in button.

- [ ] **Step 4: Implement the quick form and email-link handling**

On initial load, show name/email/identifier plus a read-only country card. If `token` exists in the query string, POST it to the verify proxy, immediately remove it from the address bar with `router.replace`, then fetch status. Use localized inline validation and one primary action.

- [ ] **Step 5: Implement locked and pending status cards**

Render a four-step progress rail: verify email, complete information, review, activation. `profile_incomplete` shows `الحساب غير مفعّل` and `أكمل بياناتك للتفعيل`; `pending_approval` shows a locked review state and no dashboard access.

- [ ] **Step 6: Add development-only visual states**

In the server page only, accept `?previewState=profile_incomplete` or `?previewState=pending_approval` when `process.env.NODE_ENV === "development"`. Pass the preview state as display-only component input; never create a session, bypass an API, or honor it in production.

- [ ] **Step 7: Run focused UI tests**

Expected: navbar, three-field form, token removal, locked/pending rendering, RTL, and mobile interaction tests PASS.

### Task 7: Reuse the Full Registration Form in Verified Onboarding Mode

**Files:**
- Modify: `apps/legal-sos-website/components/LawyerRegistrationFlow.tsx`
- Modify: `apps/legal-sos-website/components/LawyerRegistrationFlow.module.css`
- Modify: `apps/legal-sos-website/components/LawyerOnboardingFlow.tsx`
- Modify: `apps/legal-sos-website/lib/lawyer-registration.ts`
- Create: `apps/legal-sos-website/test/lawyer-onboarding-completion.test.tsx`
- Test: `apps/legal-sos-website/test/lawyer-registration-flow.test.tsx`

**Interfaces:**
- Extend the form with:

```ts
type LawyerRegistrationFlowProps = {
  countryCode: string;
  locale: string;
  mode?: "standalone" | "onboarding";
  initialIdentity?: {
    fullName: string;
    email: string;
    professionalIdentifier: string;
  };
  onSubmitted?: (result: { reference: string; countryCode: string }) => void;
};
```

- `standalone` continues posting to `/api/lawyer/register`.
- `onboarding` posts to `/api/lawyer/onboarding/submit` and locks verified identity fields.

- [ ] **Step 1: Write failing prefill, lock, and endpoint tests**

Assert Arabic onboarding prefills/locks `fullNameAr`, email, and license number while requiring `fullNameEn`; English/Turkish onboarding prefills/locks `fullNameEn` while requiring `fullNameAr`. Assert country cannot change during the verified session and the submit endpoint changes only in onboarding mode.

- [ ] **Step 2: Run focused tests and confirm red**

Expected: FAIL because the component does not accept onboarding props.

- [ ] **Step 3: Add onboarding mode without changing standalone behavior**

Initialize verified values once, render them read-only with a verified badge, and preserve current country phone/IBAN validation, agreement retrieval, document privacy, file-size checks, signature, password rules, and two-step layout.

- [ ] **Step 4: Replace the success screen with pending approval in onboarding mode**

After a successful staged submission, call `onSubmitted`, refresh status, clear the onboarding cookie through the proxy response, and show the locked `pending_approval` card. Do not link to the provider dashboard.

- [ ] **Step 5: Run focused and regression tests**

Expected: onboarding completion tests PASS and existing standalone lawyer registration tests remain unchanged and PASS.

### Task 8: Verify the Complete Local Flow and Present It Without Publishing

**Files:**
- Modify only if verification reveals a defect in files already listed above.

**Interfaces:**
- Produces local preview URLs for the quick, locked, and pending states.

- [ ] **Step 1: Run focused backend suites serially**

Run all new onboarding tests plus join, provider access, admin approval, and mobile registration regression tests using Node 22. Expected: PASS. If resource pressure occurs, rerun serially rather than deleting project or user files.

- [ ] **Step 2: Run focused website suites serially**

Run all new UI/proxy tests plus existing header, country, lawyer-registration, terms, and portal tests. Expected: PASS.

- [ ] **Step 3: Run static verification**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec tsc --noEmit
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/legal-sos-website typecheck
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/legal-sos-website lint
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/legal-sos-website build
```

Expected: all PASS. Run the backend lint/build command only if the app's existing scripts support it without unrelated deployment work.

- [ ] **Step 4: Verify migration state separately**

Run the migration contract test and `verify_0121_legalsos_lawyer_onboarding.sql` against a disposable/test database. Do not apply the migration to production. Report unavailable database credentials as `Needs Verification`, not PASS.

- [ ] **Step 5: Start the local LegalSOS preview**

Start on an unused local port and inspect:

```text
/ar/lawyer/register
/ar/lawyer/register?previewState=profile_incomplete
/ar/lawyer/register?previewState=pending_approval
```

Verify desktop and mobile widths, Arabic RTL, navbar discoverability, exactly three quick fields, locked-account copy, progress rail, and pending-approval copy.

- [ ] **Step 6: Inspect Git and publishing state**

Confirm only intended files changed in addition to pre-existing dirty work. Confirm no commit, push, deploy, or publish occurred.

- [ ] **Step 7: Present the local site for user review**

Open the local quick-registration page in the app browser and provide the local URL. Report backend tests, database verification, website tests/build, visual preview, Git state, and deployment state as separate evidence categories.
