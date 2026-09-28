# LegalSOS Internal Lawyer Login Design

## Goal

Allow a lawyer to sign in and remain inside LegalSOS without being redirected to Lawyers.bh. The lawyer receives a dedicated LegalSOS dashboard with account status and request lists, while client and administration portals remain isolated.

## User experience

The existing `/{locale}/portal/lawyer` page becomes the complete lawyer entry point:

- Signed out: show a lawyer sign-in form and a separate “Create lawyer account” action.
- Sign-in fields: country, lawyer number/personal number, password.
- Provide an inline forgot-password action using the selected country and identifier.
- Registration continues to reveal the existing country-aware `LawyerRegistrationFlow`; it never shares field state with sign-in.
- Signed in: replace the sign-in card with the lawyer dashboard.
- Dashboard: show lawyer name, account state, availability, total/completed request counts, and grouped new, accepted/in-progress, and completed requests.
- Provide refresh and sign-out actions.
- Every state retains a visible back link to the account gateway.

No client or administration authentication field appears on the lawyer route.

## Session architecture

LegalSOS uses a same-origin server proxy. Browser code never receives or stores the lawyer bearer token.

1. The browser posts credentials to `POST /api/lawyer-auth/login` on LegalSOS.
2. The LegalSOS route validates the input and same-origin request, then forwards the credentials server-to-server to the existing Lawyers.bh `/api/lawyers/login` contract.
3. On success, LegalSOS stores the returned signed mobile-lawyer token in a `Secure`, `HttpOnly`, `SameSite=Lax`, path-scoped cookie. The token is already signed and expiring; the cookie is not described as encrypted.
4. The browser receives only a sanitized lawyer session DTO without the token.
5. Subsequent LegalSOS session/request routes read the protected cookie server-side and attach it as a bearer token when calling Lawyers.bh.
6. `DELETE /api/lawyer-auth/session` removes the LegalSOS cookie. Passwords and bearer tokens are never logged or returned to browser JavaScript.

The cookie must use `Secure` in production, a 30-day maximum age matching the current token lifetime, and a LegalSOS-only name. State-changing routes require JSON and a same-origin check.

## Backend session endpoint

Add a narrow authenticated endpoint on Lawyers.bh at `GET /api/mobile/lawyer/session`.

- Authenticate with `getMobileLawyerSession`.
- Resolve the lawyer by authenticated lawyer ID and country code only.
- Reject missing, closed, rejected, or suspended accounts.
- Return a safe profile DTO: ID, country, localized names, email, phone, registration number, status, active/emergency readiness, availability, image, rating, total requests, and completed requests.
- Never return password hashes, tokens, bank information, internal table names, or document paths.

This removes any need for LegalSOS to decode or trust token payload fields.

## LegalSOS proxy routes

### `POST /api/lawyer-auth/login`

- Accept `countryCode`, `licenseNumber`, and `password`.
- Validate a two-letter country code, non-empty identifier, and password.
- Apply same-origin protection and `Cache-Control: no-store`.
- Forward to Lawyers.bh and normalize known error codes/messages into localized UI states.
- Set the protected cookie only after successful backend login.
- Immediately resolve the safe session DTO before returning success; clear the cookie if session validation fails.

### `GET /api/lawyer-auth/session`

- Read the protected cookie.
- Call Lawyers.bh `/api/mobile/lawyer/session` with the bearer token.
- Return the safe DTO with `Cache-Control: no-store`.
- Clear an invalid/expired cookie.

### `GET /api/lawyer-auth/requests`

- Read the protected cookie.
- Forward to the existing `/api/sos/lawyer/pickups/check` endpoint.
- Sanitize the response into three read-only lists: new offers, active cases, and completed cases.
- Preserve request identifiers, references, service type/status, client-safe display fields, response deadlines, and timestamps required for the list UI.
- Do not expose internal dispatch tokens or unrelated client personal data.

Request acceptance, navigation, chat, and lifecycle mutations are outside this bounded login slice. They remain available in the mobile app until separately designed for the web dashboard.

### `DELETE /api/lawyer-auth/session`

- Require same origin.
- Expire the protected cookie.
- Return success even if the cookie is already absent.

### `POST /api/lawyer-auth/forgot-password`

- Accept country, identifier, and locale.
- Require same origin and forward to the existing provider forgot-password endpoint.
- Always use a non-enumerating user-facing result when the backend accepts the request.

## Components and state

- `LawyerAccessPortal` owns only the top-level signed-out/signed-in state and refreshes session on mount.
- A focused `LawyerLoginForm` owns credential fields, submission, error presentation, and password-reset request state.
- A focused `LawyerWebDashboard` owns session display, request refresh, grouping, empty/loading/error states, and sign-out.
- `LawyerRegistrationFlow` remains independent and mounts only after explicit selection and valid country loading.
- Changing from login to registration clears password/error state by unmounting the login component.

## Error handling

- Invalid credentials: show a localized generic message without identifying which field was wrong.
- Pending/review account: allow login only if the backend session policy permits it, then show the review status and no request actions.
- Rejected/suspended/closed account: deny the session with a localized unavailable-account message.
- Expired session: clear the cookie and return to the sign-in form.
- Requests failure: retain the authenticated dashboard, show a retry state, and do not sign out a valid lawyer.
- Network/non-JSON backend failure: return a sanitized service-unavailable error without upstream stack traces.

## Files in scope

### Lawyers.bh

- New `apps/lawyers.bh/app/api/mobile/lawyer/session/route.ts` and tests.

### LegalSOS website

- `apps/legal-sos-website/components/LawyerAccessPortal.tsx`
- New `LawyerLoginForm.tsx` and `LawyerWebDashboard.tsx`
- New routes under `apps/legal-sos-website/app/api/lawyer-auth/`
- A focused server-only cookie/upstream helper under `apps/legal-sos-website/lib/`
- `apps/legal-sos-website/lib/translations/{ar,en,tr}.ts`
- `apps/legal-sos-website/app/globals.css`
- Focused route/component tests under `apps/legal-sos-website/test/`

No database migration, account duplication, client-auth change, administration-auth change, payment change, or mobile-app source change is required.

## Verification

Automated tests must prove:

1. Valid backend login creates an HttpOnly cookie without returning the token.
2. Invalid login never creates a cookie and exposes no credential detail.
3. Session and request proxies require the cookie and forward the bearer token server-side only.
4. Logout expires the cookie and is idempotent.
5. The backend session endpoint scopes profile lookup to authenticated lawyer ID and country.
6. The signed-out lawyer page contains only lawyer login/registration/reset actions.
7. The signed-in page contains profile/request sections and no credential inputs.
8. Registration and login state do not leak into each other.
9. Client and administration portal tests remain green.
10. TypeScript checks and production builds pass for both affected applications.

Production verification uses a deliberately invalid login to confirm safe rejection without creating a cookie. A successful live credential login is not performed unless the user separately supplies and authorizes a test lawyer account.
