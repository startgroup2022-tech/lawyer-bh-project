# Emergency Lawyer Mobile Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the mobile emergency-lawyer route create a pending full application without directory-only professional fields while keeping web join validation strict.

**Architecture:** A pure policy module resolves professional profile fields for `web` and `emergency-mobile` modes. The join route exposes an internal server function accepting that typed mode while its public `POST` wrapper always selects `web`. The mobile route invokes the internal function with `emergency-mobile` after identifying a full document submission.

**Tech Stack:** Next.js 16.2 Route Handlers, TypeScript 5, Vitest 4, PostgreSQL/Drizzle SQL client.

## Global Constraints

- Do not require or invent registration level, working hours, or specialties for mobile emergency lawyers.
- Keep web join validation and response behavior unchanged.
- Keep document, signature, identity, banking, duplicate, and file validation unchanged.
- Do not run migrations or deploy production as part of implementation.

---

### Task 1: Professional-profile policy

**Files:**
- Create: `lib/registration/lawyer-professional-profile-policy.ts`
- Test: `lib/registration/lawyer-professional-profile-policy.test.ts`

**Interfaces:**
- Produces: `resolveLawyerProfessionalProfile(input)` returning either normalized persisted fields or the existing validation error string.

- [ ] Write failing tests proving emergency mode returns `null` registration level, working hours, and main specialty plus empty sub-specialties, while web mode rejects missing values and accepts valid directory values.
- [ ] Run the focused test and verify RED because the policy does not exist.
- [ ] Implement the minimal typed policy and run the test to GREEN.

### Task 2: Route isolation

**Files:**
- Modify: `app/api/join/route.ts`
- Modify: `app/api/mobile/lawyers/register/route.ts`
- Test: `lib/registration/lawyer-professional-profile-policy.test.ts`

**Interfaces:**
- Produces: `submitJoinApplication(request, { mode })`; public `POST(request)` always supplies `web`; mobile full-document branch supplies `emergency-mobile`.

- [ ] Add failing contract assertions for the server-only modes consumed by both routes.
- [ ] Refactor join validation and insert values through the tested policy.
- [ ] Change the mobile full-document delegation to call emergency mode.
- [ ] Run focused tests and verify web strictness plus emergency nullable persistence values.

### Task 3: Verification

**Files:** No additional production files.

- [ ] Run focused Vitest tests.
- [ ] Run TypeScript without emitting files.
- [ ] Run ESLint on changed route and policy files.
- [ ] Run `git diff --check` and inspect the scoped diff.
- [ ] Report implementation status separately from deployment; production remains unchanged until explicitly deployed.

