# LegalSOS Separated Authentication Portals

## Goal

Remove the mixed role tabs and shared authentication state from the LegalSOS portal. Users, lawyers, and administrators must enter through separate pages with separate actions and error states.

## Routes and behavior

### Portal gateway — `/{locale}/portal`

The portal route is a simple account-type gateway. It shows three independent cards and no login or registration form:

- User: opens `/{locale}/portal/client`.
- Lawyer: opens `/{locale}/portal/lawyer`.
- Administration: opens `/{locale}/portal/admin`.

The gateway retains the selected locale and country context. It contains no shared tabs and no authentication errors.

### User portal — `/{locale}/portal/client`

This page contains only client features:

- Sign in with email and password.
- Create a user account with name, phone, email, password, and OTP verification.
- Continue to the existing request tracking workspace after authentication.
- Show user-authentication errors only on this page.
- Provide a clear back link to the portal gateway.

The existing `/api/client-auth/*` contracts and client session storage remain unchanged.

### Lawyer portal — `/{locale}/portal/lawyer`

This page contains only lawyer features:

- A distinct “Lawyer sign in” action linking to `https://www.lawyers.bh/{locale}/login/provider`.
- A distinct “Create lawyer account” action that reveals the existing country-aware `LawyerRegistrationFlow` on this page.
- Lawyer registration errors and completion state stay on this page only.
- Provide a clear back link to the portal gateway.

The existing lawyer registration API and approval workflow remain unchanged.

### Administration portal — `/{locale}/portal/admin`

This page contains only an administration sign-in action linking to `https://www.lawyers.bh/{locale}/login/admin`.

- There is no administration registration action.
- No client or lawyer fields are rendered.
- Provide a clear back link to the portal gateway.

## Component boundaries

- Replace the role-tab state in `PortalShell` with a client-only workspace component.
- Add a gateway component for the three account-type cards.
- Add a lawyer access component that owns the sign-in and registration presentation.
- Add an administration access component with sign-in only.
- Create dedicated Next.js route pages for client, lawyer, and administration.
- Reuse the current header, country gate, SOS dialog, translations, and country provider instead of duplicating their behavior.

## Navigation and presentation

- No shared tabs or in-page role switching.
- Each page has one role-specific heading and actions.
- Mobile and desktop layouts use the existing LegalSOS visual system.
- Arabic remains RTL; English and Turkish remain LTR.
- Switching locale preserves the corresponding role route when possible.
- Browser back navigation and a visible back action both return safely to the gateway.

## Error and state isolation

- User login, registration, and OTP state exist only in the client portal.
- Lawyer application state exists only in the lawyer portal.
- Administration has no form state on LegalSOS because authentication remains on Lawyers.bh.
- Moving between role pages unmounts the previous role component, so fields and errors cannot leak between roles.
- Country loading must complete before mounting lawyer registration, preserving the existing `COUNTRY_UNAVAILABLE` guard.

## Files in scope

- `apps/legal-sos-website/app/[locale]/portal/page.tsx`
- New pages under `apps/legal-sos-website/app/[locale]/portal/client`, `lawyer`, and `admin`
- `apps/legal-sos-website/components/PortalShell.tsx`
- New small role-specific access/gateway components as required
- `apps/legal-sos-website/lib/translations/{ar,en,tr}.ts`
- `apps/legal-sos-website/app/globals.css`
- Focused tests under `apps/legal-sos-website/test/`

No authentication API, database schema, payment flow, lawyer approval workflow, or Lawyers.bh account model changes are in scope.

## Verification

Automated tests must prove:

1. The gateway renders three separate links and no authentication form.
2. The client page renders user sign-in/create-account only.
3. The lawyer page renders lawyer sign-in/create-account only and never client authentication.
4. The administration page renders administration sign-in only and no registration action.
5. Arabic, English, and Turkish translations cover every new label.
6. The lawyer registration flow waits for a valid loaded country.
7. Existing client authentication, lawyer registration, terms, SOS, and country tests remain green.

Final verification includes TypeScript checking, the LegalSOS test suite, a production build, and browser checks at mobile and desktop sizes.
