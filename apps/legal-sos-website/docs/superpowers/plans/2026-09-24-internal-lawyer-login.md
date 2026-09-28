# LegalSOS Internal Lawyer Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a lawyer sign in, review account status, and view grouped request lists entirely inside LegalSOS without exposing the Lawyers.bh bearer token to browser JavaScript.

**Architecture:** Add one authenticated safe-profile endpoint to Lawyers.bh, then place a same-origin LegalSOS proxy in front of the existing mobile-lawyer authentication and request APIs. LegalSOS stores the signed upstream token only in a 30-day `HttpOnly` cookie and renders separate focused login and dashboard components on the lawyer portal.

**Tech Stack:** Next.js 16 route handlers, React 19, TypeScript, Zod, Vitest, Testing Library, Drizzle ORM, existing HMAC mobile-lawyer authentication.

## Global Constraints

- Browser code never receives, stores, logs, or decodes the lawyer bearer token.
- The session cookie is LegalSOS-only, `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and expires after 30 days.
- Every response from lawyer authentication/session/request routes uses `Cache-Control: no-store`.
- State-changing LegalSOS routes accept JSON and reject cross-origin requests.
- Login, registration, and password-reset state remain isolated; no client or administration fields appear on the lawyer route.
- Rejected, suspended, closed, or missing lawyer accounts cannot establish a LegalSOS session.
- The dashboard request lists are read-only; accepting jobs, chat, navigation, and lifecycle mutations remain in the mobile app.
- Request responses expose only list-display fields and never expose dispatch tokens or unrelated client personal data.
- No database migration, account duplication, client-auth change, administration-auth change, payment change, or mobile-app source change is included.
- Implement every task test-first and preserve unrelated dirty work in the main worktree.

## File Map

- `apps/lawyers.bh/app/api/mobile/lawyer/session/route.ts`: authenticated safe lawyer profile endpoint.
- `apps/lawyers.bh/app/api/mobile/lawyer/session/route.test.ts`: authorization, country scoping, lifecycle denial, and DTO tests.
- `apps/legal-sos-website/lib/lawyer-auth-proxy.ts`: server-only backend origin, cookie, upstream request, and sanitization contracts.
- `apps/legal-sos-website/app/api/lawyer-auth/login/route.ts`: credential exchange and protected cookie creation.
- `apps/legal-sos-website/app/api/lawyer-auth/session/route.ts`: protected-cookie session lookup and logout.
- `apps/legal-sos-website/app/api/lawyer-auth/requests/route.ts`: sanitized read-only lawyer request lists.
- `apps/legal-sos-website/app/api/lawyer-auth/forgot-password/route.ts`: non-enumerating password-reset proxy.
- `apps/legal-sos-website/components/LawyerLoginForm.tsx`: login/reset UI only.
- `apps/legal-sos-website/components/LawyerWebDashboard.tsx`: profile, status, grouped request lists, refresh, and logout.
- `apps/legal-sos-website/components/LawyerAccessPortal.tsx`: top-level login/registration/dashboard state coordinator.
- `apps/legal-sos-website/lib/translations/{ar,en,tr}.ts`: all new lawyer portal copy.
- `apps/legal-sos-website/app/globals.css`: responsive RTL/LTR lawyer portal presentation.
- `apps/legal-sos-website/test/lawyer-auth-proxy.test.ts`: proxy helper and sanitizer tests.
- `apps/legal-sos-website/test/lawyer-auth-routes.test.ts`: login/session/logout/reset/request route tests.
- `apps/legal-sos-website/test/lawyer-portal-auth.test.tsx`: signed-out, registration, reset, session, and dashboard component tests.
- `apps/legal-sos-website/test/separated-auth-portals.test.tsx`: update the existing lawyer-link assertion to the embedded form contract.

---

### Task 1: Add the authenticated Lawyers.bh session profile endpoint

**Files:**
- Create: `apps/lawyers.bh/app/api/mobile/lawyer/session/route.ts`
- Create: `apps/lawyers.bh/app/api/mobile/lawyer/session/route.test.ts`

**Interfaces:**
- Consumes: `getMobileLawyerSession(request): Promise<{ lawyerId: string; countryCode: string } | null>`, `db`, `schema.bahrainLawyers`, and the account lifecycle state already enforced by mobile authentication.
- Produces: `GET(request): Promise<NextResponse>` with `{ ok: true, lawyer: LawyerSessionProfile }`, where `LawyerSessionProfile` contains `id`, `countryCode`, `nameAr`, `nameEn`, `email`, `phone`, `registrationNo`, `status`, `active`, `emergencyReady`, `isAvailable`, `image`, `rating`, `totalRequests`, and `completedRequests` only.

- [ ] **Step 1: Write failing route tests**

Create tests that mock `getMobileLawyerSession` and the Drizzle query chain. Assert:

```ts
expect((await GET(request())).status).toBe(401);
expect(db.select).not.toHaveBeenCalled();

expect(whereExpression).toMatchObject(
  expect.objectContaining({ queryChunks: expect.any(Array) }),
);
expect(await response.json()).toEqual({
  ok: true,
  lawyer: {
    id: "lawyer-1",
    countryCode: "SA",
    nameAr: "محامي اختبار",
    nameEn: "Test Lawyer",
    email: "lawyer@example.test",
    phone: "+966500000000",
    registrationNo: "SA-100",
    status: "approved",
    active: true,
    emergencyReady: true,
    isAvailable: true,
    image: null,
    rating: 4.8,
    totalRequests: 12,
    completedRequests: 9,
  },
});
expect(JSON.stringify(await response.clone().json())).not.toContain("password");
```

Cover missing authentication, authenticated ID plus country scoping, rejected/suspended/closed/missing records, and the exact safe DTO.

- [ ] **Step 2: Run the new tests and confirm the missing route failure**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- app/api/mobile/lawyer/session/route.test.ts
```

Expected: FAIL because `route.ts` does not exist.

- [ ] **Step 3: Implement the minimal safe-profile route**

Implement `GET` with this control flow:

```ts
const session = await getMobileLawyerSession(request);
if (!session) return noStore({ ok: false, error: "UNAUTHORIZED" }, 401);

const [lawyer] = await db
  .select({
    id: bahrainLawyers.id,
    countryCode: bahrainLawyers.countryCode,
    nameAr: schema.bahrainLawyers.fullNameAr,
    nameEn: schema.bahrainLawyers.fullNameEn,
    email: bahrainLawyers.email,
    phone: bahrainLawyers.phone,
    registrationNo: bahrainLawyers.registrationNo,
    status: bahrainLawyers.status,
    active: schema.bahrainLawyers.isActive,
    emergencyReady: schema.bahrainLawyers.isEmergencyReady,
    image: schema.bahrainLawyers.profileImageUrl,
    rating: sql<number>`coalesce((
      select avg(rating_value)::float from (
        select ${schema.emergencyRequests.ratingStars}::float as rating_value
        from ${schema.emergencyRequests}
        where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
          and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId}
          and ${schema.emergencyRequests.ratingStars} is not null
        union all
        select ${schema.bookingReviews.lawyerRating}::float
        from ${schema.bookingReviews}
        where ${schema.bookingReviews.countryCode} = ${session.countryCode}
          and ${schema.bookingReviews.lawyerId} = ${session.lawyerId}
          and ${schema.bookingReviews.status} = 'submitted'
          and ${schema.bookingReviews.lawyerRating} is not null
      ) ratings
    ), 0)`,
    totalRequests: sql<number>`(
      (select count(*) from ${schema.emergencyRequests}
        where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
          and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId})
      +
      (select count(*) from ${schema.bookingRequests}
        where ${schema.bookingRequests.countryCode} = ${session.countryCode}
          and ${schema.bookingRequests.selectedLawyerId} = ${session.lawyerId})
    )::int`,
    completedRequests: sql<number>`(
      (select count(*) from ${schema.emergencyRequests}
        where ${schema.emergencyRequests.countryCode} = ${session.countryCode}
          and ${schema.emergencyRequests.assignedLawyerId} = ${session.lawyerId}
          and ${schema.emergencyRequests.serviceStatus} = 'completed')
      +
      (select count(*) from ${schema.bookingRequests}
        where ${schema.bookingRequests.countryCode} = ${session.countryCode}
          and ${schema.bookingRequests.selectedLawyerId} = ${session.lawyerId}
          and ${schema.bookingRequests.adminStatus} = 'completed')
    )::int`,
  })
  .from(schema.bahrainLawyers)
  .where(and(
    eq(schema.bahrainLawyers.id, session.lawyerId),
    eq(schema.bahrainLawyers.countryCode, session.countryCode),
  ))
  .limit(1);
```

Return 403 with `ACCOUNT_UNAVAILABLE` when `status` is `rejected` or `suspended`; a closed lifecycle account is already rejected by `getMobileLawyerSession`. Permit a pending review account to view its status even when inactive. Return 404 for a missing record. Normalize `pending` to `pending_review`, derive `isAvailable` as `active && emergencyReady`, normalize numeric aggregates with `Number(value || 0)`, and return the selected fields without spreading the database row.

- [ ] **Step 4: Run the focused tests until green**

Run the Task 1 command again. Expected: all tests PASS and every response includes `cache-control: no-store`.

- [ ] **Step 5: Commit the backend endpoint**

```bash
git add apps/lawyers.bh/app/api/mobile/lawyer/session
git commit -m "feat: add safe mobile lawyer session endpoint"
```

---

### Task 2: Build the LegalSOS server-only authentication contract

**Files:**
- Create: `apps/legal-sos-website/lib/lawyer-auth-proxy.ts`
- Create: `apps/legal-sos-website/test/lawyer-auth-proxy.test.ts`

**Interfaces:**
- Consumes: the existing `LEGAL_SOS_BACKEND_URL` with production fallback `https://www.lawyers.bh`.
- Produces: `LAWYER_SESSION_COOKIE`, `LAWYER_SESSION_MAX_AGE_SECONDS`, `lawyerCookieOptions()`, `requireSameOrigin(request)`, `readLawyerToken(request)`, `lawyerBackendUrl(path)`, `fetchLawyerBackend(path, init, token?)`, `sanitizeLawyerSession(value)`, and `sanitizeLawyerRequests(value)`.

- [ ] **Step 1: Write failing helper tests**

Test these exact behaviors:

```ts
expect(LAWYER_SESSION_COOKIE).toBe("legalsos_lawyer_session");
expect(LAWYER_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
expect(lawyerCookieOptions("production")).toEqual(expect.objectContaining({
  httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 2592000,
}));
expect(requireSameOrigin(new Request("https://legalsos.org/api/x", {
  method: "POST", headers: { origin: "https://evil.example" },
}))).toBe(false);
expect(lawyerBackendUrl("/api/mobile/lawyer/session").toString()).toBe(
  "https://www.lawyers.bh/api/mobile/lawyer/session",
);
```

Also prove that `fetchLawyerBackend` strips browser authorization, sets `Authorization: Bearer <cookie-token>` only from its explicit token argument, requests JSON, and never logs upstream bodies. Prove that `sanitizeLawyerSession` rejects malformed input and selects only the DTO fields. Prove that `sanitizeLawyerRequests` maps upstream `pickups`, `activeCases`, and `completedCases` to `newOffers`, `activeCases`, and `completedCases` while discarding `dispatchToken`, document paths, and unknown client fields.

- [ ] **Step 2: Run the tests and confirm missing exports**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/lawyer-auth-proxy.test.ts
```

Expected: FAIL because the helper module is missing.

- [ ] **Step 3: Implement schemas, origin checks, cookie options, and upstream wrapper**

Use Zod schemas with explicit keys. The request-list DTO is:

```ts
type LawyerRequestLists = {
  newOffers: Array<{
    id: string; caseRef: string; caseType: string; baseFeeBhd: string | number;
    createdAt: string; deadline: string | null;
  }>;
  activeCases: Array<{
    id: string; caseRef: string; caseType: string; workflowType: string | null;
    contactName: string | null; location: unknown | null; serviceStatus: string | null;
    createdAt: string;
  }>;
  completedCases: Array<{
    id: string; caseRef: string; caseType: string; workflowType: string | null;
    serviceStatus: string | null; createdAt: string;
  }>;
  advocateOnline: boolean;
  now: string;
};
```

`requireSameOrigin` accepts missing `Origin` only when `Sec-Fetch-Site` is absent or `same-origin`; otherwise compare `Origin` to forwarded protocol/host or request origin. `lawyerBackendUrl` permits `https:` and permits `http:` only for localhost/127.0.0.1. Mark the file with `import "server-only"`.

- [ ] **Step 4: Run helper tests until green**

Run the Task 2 test command again. Expected: PASS.

- [ ] **Step 5: Commit the server-only contract**

```bash
git add apps/legal-sos-website/lib/lawyer-auth-proxy.ts apps/legal-sos-website/test/lawyer-auth-proxy.test.ts
git commit -m "feat: add LegalSOS lawyer auth proxy contract"
```

---

### Task 3: Add login, session, logout, reset, and request proxy routes

**Files:**
- Create: `apps/legal-sos-website/app/api/lawyer-auth/login/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer-auth/session/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer-auth/requests/route.ts`
- Create: `apps/legal-sos-website/app/api/lawyer-auth/forgot-password/route.ts`
- Create: `apps/legal-sos-website/test/lawyer-auth-routes.test.ts`

**Interfaces:**
- Consumes: all Task 2 exports and upstream `/api/lawyers/login`, `/api/mobile/lawyer/session`, `/api/sos/lawyer/pickups/check`, and the existing provider forgot-password endpoint.
- Produces: same-origin LegalSOS routes whose public JSON never includes a token.

- [ ] **Step 1: Write failing route tests**

Mock global `fetch` and cover:

```ts
expect(login.status).toBe(200);
expect(login.headers.get("set-cookie")).toContain("legalsos_lawyer_session=");
expect(login.headers.get("set-cookie")).toContain("HttpOnly");
expect(login.headers.get("set-cookie")).toContain("SameSite=Lax");
expect(JSON.stringify(await login.json())).not.toContain("signed-token");
```

Add tests for invalid input (400/no fetch/no cookie), cross-origin login/reset/logout (403), invalid upstream credentials (401/no cookie), successful login followed by safe session validation, session-validation failure clearing the cookie, missing cookie (401), expired session clearing cookie, request proxy bearer forwarding plus sanitization, request failure retaining a 502 retryable error, idempotent logout, and non-enumerating reset success.

- [ ] **Step 2: Run route tests and confirm missing modules**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/lawyer-auth-routes.test.ts
```

Expected: FAIL because the four route modules are absent.

- [ ] **Step 3: Implement the login route**

Validate with:

```ts
const credentialsSchema = z.object({
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()),
  licenseNumber: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});
```

After upstream login succeeds, extract `data.token` without returning it, call `/api/mobile/lawyer/session` using that token, sanitize the profile, set the protected cookie, and return `{ ok: true, lawyer }`. Return generic `INVALID_CREDENTIALS`, `ACCOUNT_UNAVAILABLE`, or `SERVICE_UNAVAILABLE` codes without upstream stack text. Set no cookie until both upstream calls succeed.

- [ ] **Step 4: Implement GET/DELETE session routes**

GET reads the cookie, calls the safe session endpoint, sanitizes its response, clears invalid/expired cookies, and returns `{ ok: true, lawyer }`. DELETE requires same origin, expires the cookie with `maxAge: 0`, and always returns `{ ok: true }`.

- [ ] **Step 5: Implement requests and forgot-password routes**

GET requests reads the cookie, forwards only its value as bearer authorization, sanitizes the upstream list, and returns `{ ok: true, requests }`. POST forgot-password validates `{ countryCode, identifier, locale }`, forwards `{ countryCode, identifier, lang: locale === "ar" ? "ar" : "en" }` to `/api/provider/forgot-password`, and returns `{ ok: true }` for every accepted upstream request so the UI does not reveal account existence.

- [ ] **Step 6: Run route tests until green**

Run the Task 3 command again. Expected: PASS.

- [ ] **Step 7: Commit the proxy routes**

```bash
git add apps/legal-sos-website/app/api/lawyer-auth apps/legal-sos-website/test/lawyer-auth-routes.test.ts
git commit -m "feat: proxy LegalSOS lawyer sessions securely"
```

---

### Task 4: Build the embedded lawyer login and dashboard UI

**Files:**
- Create: `apps/legal-sos-website/components/LawyerLoginForm.tsx`
- Create: `apps/legal-sos-website/components/LawyerWebDashboard.tsx`
- Modify: `apps/legal-sos-website/components/LawyerAccessPortal.tsx`
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/translations/en.ts`
- Modify: `apps/legal-sos-website/lib/translations/tr.ts`
- Create: `apps/legal-sos-website/test/lawyer-portal-auth.test.tsx`
- Modify: `apps/legal-sos-website/test/separated-auth-portals.test.tsx`

**Interfaces:**
- Consumes: `GET/DELETE /api/lawyer-auth/session`, `POST /api/lawyer-auth/login`, `POST /api/lawyer-auth/forgot-password`, `GET /api/lawyer-auth/requests`, `SiteProvider` country state, and the existing `LawyerRegistrationFlow`.
- Produces: `LawyerLoginForm({ locale, dictionary, countryCode, onAuthenticated })` and `LawyerWebDashboard({ locale, dictionary, lawyer, onSignedOut })`.

- [ ] **Step 1: Write failing component tests**

Use Testing Library and mocked `fetch` to prove:

```ts
expect(screen.getByLabelText(dictionary.portal.lawyerAuth.identifier)).toBeInTheDocument();
expect(screen.getByLabelText(dictionary.portal.lawyerAuth.password)).toHaveAttribute("type", "password");
expect(screen.queryByRole("link", { name: dictionary.portal.gateway.lawyerSignIn })).not.toBeInTheDocument();
expect(screen.queryByLabelText(dictionary.portal.auth.email)).not.toBeInTheDocument();
```

Cover session loading, signed-out form, generic invalid-credentials message, successful login switching to dashboard, reset success, registration selection unmounting/clearing the password form, visible back link, dashboard profile/status/counts, three request groups, independent request retry, logout returning to login, and no credential inputs after authentication. Update the existing separated-portal test to expect embedded lawyer fields rather than an external Lawyers.bh link.

- [ ] **Step 2: Run component tests and confirm missing components/keys**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/lawyer-portal-auth.test.tsx test/separated-auth-portals.test.tsx
```

Expected: FAIL because the new components and translation keys are absent.

- [ ] **Step 3: Add one matching `portal.lawyerAuth` translation contract to Arabic, English, and Turkish**

The object must contain keys for `title`, `country`, `identifier`, `password`, `signIn`, `forgotPassword`, `resetTitle`, `resetSubmit`, `resetSent`, `invalidCredentials`, `accountUnavailable`, `serviceUnavailable`, `sessionExpired`, `dashboardTitle`, `accountStatus`, `availability`, `available`, `unavailable`, `totalRequests`, `completedRequests`, `newOffers`, `activeCases`, `completedCases`, `refresh`, `retry`, `signOut`, `loading`, and `empty` in all three dictionaries. Arabic terminology must consistently use «محامي» and «المحامي» rather than «محام».

- [ ] **Step 4: Implement `LawyerLoginForm`**

Keep the password in component state only. Submit JSON with same-origin `fetch`, `credentials: "same-origin"`, and no authorization header. Show localized generic errors by error code. The reset view reuses country and identifier, never reveals account existence, and has an explicit return-to-login action.

- [ ] **Step 5: Implement `LawyerWebDashboard`**

Fetch request lists on mount and refresh. Render account status/availability/counts from the session DTO and cards for all three groups. Request failure shows retry without calling `onSignedOut`. A 401 from the session boundary triggers `onSignedOut`; logout calls DELETE and then clears local state regardless of response body.

- [ ] **Step 6: Refactor `LawyerAccessPortal` as the state coordinator**

On mount, call session GET and render an accessible loading state. Render exactly one of:

```ts
type PortalMode = "login" | "registration" | "dashboard";
```

Keep the gateway back link outside the mode content. Use `key="lawyer-login"` when returning to login so password/reset/error state cannot survive registration or logout. Country loading/absence still guards registration and login submission.

- [ ] **Step 7: Run component and existing portal tests until green**

Run the Task 4 command again, then:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/portal-role-login.test.tsx
```

Expected: all selected tests PASS.

- [ ] **Step 8: Commit the lawyer portal UI**

```bash
git add apps/legal-sos-website/components/LawyerAccessPortal.tsx \
  apps/legal-sos-website/components/LawyerLoginForm.tsx \
  apps/legal-sos-website/components/LawyerWebDashboard.tsx \
  apps/legal-sos-website/lib/translations \
  apps/legal-sos-website/test/lawyer-portal-auth.test.tsx \
  apps/legal-sos-website/test/separated-auth-portals.test.tsx
git commit -m "feat: add internal LegalSOS lawyer portal"
```

---

### Task 5: Add responsive styling and complete repository verification

**Files:**
- Modify: `apps/legal-sos-website/app/globals.css`
- Modify if assertions require it: `apps/legal-sos-website/test/lawyer-portal-auth.test.tsx`

**Interfaces:**
- Consumes: the semantic classes emitted by Tasks 4 components.
- Produces: responsive RTL/LTR login, status summary, tabs/groups, cards, loading, empty, and error states without changing behavior.

- [ ] **Step 1: Add a failing structural style assertion**

Add a source-level assertion that the stylesheet defines `.lawyer-login-form`, `.lawyer-dashboard`, `.lawyer-dashboard-summary`, `.lawyer-request-groups`, and a narrow-screen media rule, then run the component test to confirm it fails.

- [ ] **Step 2: Add minimal responsive styles**

Reuse existing portal colors, spacing, border radii, buttons, and focus treatment. Use logical properties (`margin-inline`, `padding-inline`, `text-align: start`) rather than left/right declarations. At widths below 720px, stack summary metrics and request groups without horizontal overflow.

- [ ] **Step 3: Run all affected tests**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- app/api/mobile/lawyer/session/route.test.ts
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test
```

Expected: all tests PASS.

- [ ] **Step 4: Run type checks, lint, and production builds**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec tsc --noEmit
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website typecheck
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website lint
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh build:next-only
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website build
```

Expected: all commands exit 0. If a pre-existing repository-wide failure appears outside this diff, preserve the full output and verify every focused test still passes before reporting it separately.

- [ ] **Step 5: Perform a local browser smoke test**

Start the LegalSOS site with a local Lawyers.bh backend and verify at 390×844 and desktop widths:

1. `/ar/portal/lawyer` remains inside LegalSOS.
2. Back, login, forgot-password, and registration actions are visible and keyboard reachable.
3. A deliberately invalid login produces the Arabic generic rejection and no `legalsos_lawyer_session` cookie.
4. Registration opens independently and returning to login shows an empty password field.
5. No client/admin fields or external Lawyers.bh sign-in link appear.

- [ ] **Step 6: Commit styling and verification adjustments**

```bash
git add apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/lawyer-portal-auth.test.tsx
git commit -m "style: finish LegalSOS lawyer dashboard"
```

---

### Task 6: Prepare the approved production release and live evidence

**Files:**
- No source files unless production verification reveals an in-scope regression.

**Interfaces:**
- Consumes: verified commits from Tasks 1–5 and the repository Lawyers.bh production-release procedure.
- Produces: pushed DEV and PRODUCTION refs, a READY Vercel deployment, and live route evidence separated from credentialed-flow evidence.

- [ ] **Step 1: Review the complete diff and commit history**

```bash
git status --short
git diff origin/DEV...HEAD --stat
git log --oneline --decorate origin/DEV..HEAD
```

Expected: only the files named in this plan and its design/plan documents are changed; the worktree is clean.

- [ ] **Step 2: Re-run the focused tests immediately before release**

Run the Task 5 test/type/build commands again. Expected: exit 0 with fresh output.

- [ ] **Step 3: Release through the repository's DEV-to-PRODUCTION path**

Follow `skills/lawyers-bh-production-release/SKILL.md`: push DEV first, merge DEV into PRODUCTION with the configured production author, push PRODUCTION without force, and deploy from the monorepo root while the Vercel project root remains `apps/lawyers.bh`.

- [ ] **Step 4: Verify live public and API boundaries**

Confirm:

```text
GET  https://www.legalsos.org/ar/portal/lawyer                         -> 200
GET  https://www.legalsos.org/api/lawyer-auth/session                 -> 401, no-store
GET  https://www.legalsos.org/api/lawyer-auth/requests                -> 401, no-store
POST https://www.legalsos.org/api/lawyer-auth/login (invalid test)    -> safe 4xx, no cookie
GET  https://www.lawyers.bh/api/mobile/lawyer/session                 -> 401, no-store
```

Inspect response JSON and headers to prove no token/password/stack trace is exposed. Do not attempt a valid production login without a separately authorized test lawyer account.

- [ ] **Step 5: Report evidence by level**

Report separately: focused tests, full test/type/build status, Git refs, Vercel deployment state, live unauthenticated route probes, and the explicit boundary that a successful credentialed production login was not exercised without an authorized test account.
