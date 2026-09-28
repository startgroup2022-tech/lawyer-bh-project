# Join Form Required Fields and Step Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every required lawyer-registration field explicit, validate each wizard step before advancing, and relabel the single identifier input as license number or personal number.

**Architecture:** Move the duplicated client validation into a pure registration-step policy module that returns localized field errors and the first invalid field. Keep `Content.tsx` responsible for gathering form state, rendering controls, focusing errors, and submitting. Add small UI helpers for a consistent red required marker and invalid control attributes while retaining independent server validation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Playwright browser verification.

## Global Constraints

- The identifier remains one submitted field named `licenseNumber`; do not add a database column or second input.
- Arabic label: `رقم الرخصة / الرقم الشخصي`.
- English label: `License Number / Personal Number`.
- Arabic missing error: `يرجى إدخال رقم الرخصة أو الرقم الشخصي`.
- English missing error: `Please enter the license number or personal number`.
- A red `*` appears beside required fields and required groups only.
- Validate only the visible step on `Next`; validate all four steps on final submit.
- Do not change the four-step layout, approval behavior, Tap onboarding, payouts, or optional institution fields.
- Keep server-side validation authoritative.

---

### Task 1: Centralize the four-step validation policy

**Files:**
- Create: `lib/registration/join-step-validation.ts`
- Create: `lib/registration/join-step-validation.test.ts`
- Modify: `app/[locale]/join/Content.tsx`

**Interfaces:**
- Produces: `type JoinStep = 1 | 2 | 3 | 4`.
- Produces: `type JoinFieldErrors = Record<string, string>`.
- Produces: `validateJoinStep(input: JoinValidationInput, step: JoinStep, locale: "ar" | "en"): JoinFieldErrors`.
- Produces: `validateAllJoinSteps(input: JoinValidationInput, locale: "ar" | "en"): JoinFieldErrors`.
- Produces: `getJoinStepForField(field: string): JoinStep`.
- Produces: `getFirstJoinError(errors: JoinFieldErrors): { field: string; step: JoinStep } | null`.
- Consumes: normalized strings, selected roles/specialties, selected `File` objects, agreement state, and signature state gathered by `Content.tsx`.

- [ ] **Step 1: Write failing pure-policy tests**

Create table-driven tests proving the exact field ownership and bilingual copy:

```ts
it("uses the combined identifier wording", () => {
  const errors = validateJoinStep(emptyInput(), 3, "ar");
  expect(errors.licenseNumber).toBe(
    "يرجى إدخال رقم الرخصة أو الرقم الشخصي",
  );
  expect(validateJoinStep(emptyInput(), 3, "en").licenseNumber).toBe(
    "Please enter the license number or personal number",
  );
});

it.each([
  [1, ["subscriptionType", "experienceYears", "specialties"]],
  [2, ["profileImage", "fullNameAr", "fullNameEn", "email", "phone", "password", "confirmPassword", "language"]],
  [3, ["licenseNumber", "licenseExpiryDate", "ibanNumber", "ibanCertificateFile", "workingHours", "licenseFile", "personalIdFile"]],
  [4, ["agreed", "signatureDataUrl"]],
] as const)("rejects missing required fields on step %s", (step, fields) => {
  expect(Object.keys(validateJoinStep(emptyInput(), step, "en"))).toEqual(fields);
});
```

Add cases for valid steps, invalid email/password/IBAN/date, the Lawyer-only registration level, exactly two distinct sub-specialties, optional institution fields, and file size/type limits.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run lib/registration/join-step-validation.test.ts --reporter=verbose
```

Expected: FAIL because `join-step-validation.ts` does not exist.

- [ ] **Step 3: Implement the pure validation module**

Define a serializable validation input with files represented by the information the policy needs:

```ts
export type JoinFileValue = {
  name: string;
  size: number;
  type: string;
} | null;

export type JoinValidationInput = {
  subscriptionTypes: string[];
  registrationLevel: string;
  experienceYears: string;
  mainSpecialty: string;
  subSpecialties: string[];
  profileImage: JoinFileValue;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  language: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  ibanNumber: string;
  ibanCertificateFile: JoinFileValue;
  workingHours: string;
  licenseFile: JoinFileValue;
  personalIdFile: JoinFileValue;
  institutionLicenseFile: JoinFileValue;
  agreed: boolean;
  signatureDataUrl: string;
};
```

Preserve the existing validation limits and messages, with the approved identifier copy. Reject a selected required file when its size exceeds the existing limit or its MIME/extension is outside the current accepted set. Keep institution registration number and institution license optional, validating the institution file only when present.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the Task 1 Vitest command. Expected: all policy tests pass.

- [ ] **Step 5: Replace duplicated validation in `Content.tsx`**

Add one `buildJoinValidationInput(formData)` function inside the page component that converts `File` instances with:

```ts
const fileValue = (value: FormDataEntryValue | null): JoinFileValue =>
  value instanceof File && value.size > 0
    ? { name: value.name, size: value.size, type: value.type }
    : null;
```

Use `validateJoinStep` in `handleNextStep` and `validateAllJoinSteps` in `handleSubmit`. Remove the two duplicated blocks of validation conditions. Use `getFirstJoinError` to choose the step on final-submit failure.

- [ ] **Step 6: Re-run focused tests and TypeScript**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run lib/registration/join-step-validation.test.ts --reporter=verbose
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec tsc --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit Task 1**

```bash
git add apps/lawyers.bh/lib/registration/join-step-validation.ts apps/lawyers.bh/lib/registration/join-step-validation.test.ts apps/lawyers.bh/app/'[locale]'/join/Content.tsx
git commit -m "refactor: centralize join step validation"
```

---

### Task 2: Render required markers and field-level invalid states

**Files:**
- Create: `app/[locale]/join/_components/RequiredMark.tsx`
- Create: `lib/registration/join-required-fields.ts`
- Create: `lib/registration/join-required-fields.test.ts`
- Modify: `app/[locale]/join/Content.tsx`

**Interfaces:**
- Produces: `RequiredMark(): JSX.Element`, rendering a red visible star and screen-reader text.
- Produces: `JOIN_REQUIRED_FIELDS: Readonly<Record<JoinStep, readonly string[]>>`.
- Produces: `joinInvalidProps(field: string, errors: JoinFieldErrors): { "aria-invalid": boolean; "aria-describedby"?: string }`.
- Consumes: `JoinStep` and `JoinFieldErrors` from Task 1.

- [ ] **Step 1: Write failing marker/contract tests**

Test the exact required-field inventory and source integration:

```ts
expect(JOIN_REQUIRED_FIELDS[2]).toEqual([
  "profileImage", "fullNameAr", "fullNameEn", "email", "phone",
  "password", "confirmPassword", "language",
]);
expect(JOIN_REQUIRED_FIELDS[3]).not.toContain("crNumber");
expect(JOIN_REQUIRED_FIELDS[3]).not.toContain("institutionLicenseFile");
```

Add a source contract that verifies both approved labels occur in
`Content.tsx`, every field-error paragraph has a stable `${field}-error` ID,
and the optional institution labels do not render `RequiredMark`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run lib/registration/join-required-fields.test.ts --reporter=verbose
```

Expected: FAIL because the required-field module and component are absent.

- [ ] **Step 3: Implement the accessible marker**

Create:

```tsx
export function RequiredMark() {
  return (
    <span className="ms-1 text-red-600" aria-hidden="true">*</span>
  );
}
```

Add required semantics to the actual inputs/groups with `required` or
`aria-required="true"`; do not rely on the star alone. Add localized
screen-reader-only text beside the marker at the group label when no native
input label exists.

- [ ] **Step 4: Add markers and invalid styling to all four steps**

For every required label/group in the spec, render `<RequiredMark />`. Give
each control a stable ID or `data-join-field` matching its error key. Apply
`border-red-500` and `focus:border-red-500` when `fieldErrors[field]` exists.
Set:

```tsx
aria-invalid={Boolean(fieldErrors[field])}
aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
```

For upload panels, checkbox agreement, specialties, and signature, apply the
same invalid border to the visible interactive container rather than only the
hidden input.

- [ ] **Step 5: Clear errors when values are corrected**

Use one helper:

```ts
function clearFieldError(field: string) {
  setFieldErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
}
```

Call it from every required text/select/file change, role/specialty change,
agreement toggle, and signature `onEnd`. Clearing the signature must make the
signature invalid again only on the next validation attempt.

- [ ] **Step 6: Run tests and verify GREEN**

Run the Task 2 test plus the Task 1 policy test. Expected: all pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add apps/lawyers.bh/app/'[locale]'/join apps/lawyers.bh/lib/registration/join-required-fields.ts apps/lawyers.bh/lib/registration/join-required-fields.test.ts
git commit -m "feat: mark required lawyer registration fields"
```

---

### Task 3: Focus the first error and preserve step boundaries

**Files:**
- Create: `lib/registration/join-error-navigation.ts`
- Create: `lib/registration/join-error-navigation.test.ts`
- Modify: `app/[locale]/join/Content.tsx`

**Interfaces:**
- Produces: `focusJoinField(field: string, root: HTMLElement): boolean`.
- Consumes: elements identified by `[data-join-field="${field}"]`.

- [ ] **Step 1: Write failing navigation tests**

Using a minimal fake root, verify selector priority and fallback behavior:

```ts
it("focuses and scrolls the first matching field", () => {
  const result = focusJoinField("profileImage", rootWithFocusableControl());
  expect(result).toBe(true);
  expect(control.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  expect(control.focus).toHaveBeenCalled();
});
```

Also verify a visible upload label/group can scroll without throwing when it
does not expose `focus()`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run lib/registration/join-error-navigation.test.ts --reporter=verbose
```

Expected: FAIL because the navigation helper is absent.

- [ ] **Step 3: Implement first-error navigation**

Implement the helper with a safe attribute selector, `scrollIntoView`, and a
feature check for `focus`. In `Content.tsx`, schedule navigation only after
state and step rendering:

```ts
requestAnimationFrame(() => {
  const form = document.getElementById("join-register-form");
  if (form) focusJoinField(firstError.field, form);
});
```

On `Next`, keep the current step and focus its first error. On final submit,
set the step from `getFirstJoinError`, then schedule focus. Do not permit step
header clicks to bypass validation; if headers are interactive, route forward
movement through the same step validator while allowing backward navigation.

- [ ] **Step 4: Run navigation, validation, and required-field tests**

Run all three focused files. Expected: all pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/lawyers.bh/lib/registration/join-error-navigation.ts apps/lawyers.bh/lib/registration/join-error-navigation.test.ts apps/lawyers.bh/app/'[locale]'/join/Content.tsx
git commit -m "feat: focus join form validation errors"
```

---

### Task 4: Align server validation and complete verification

**Files:**
- Create: `lib/registration/join-server-validation-contract.test.ts`
- Modify: `app/api/join/route.ts`
- Modify: `app/[locale]/join/Content.tsx`

**Interfaces:**
- The API continues consuming multipart field `licenseNumber` and returns
  `{ ok: false, error: string }` for invalid requests.
- The client maps known server error codes/messages to localized field errors;
  unknown failures remain in `submitError`.

- [ ] **Step 1: Write failing server-contract tests**

Assert the route still requires `licenseNumber`, `profileImage`, `licenseFile`,
`personalIdFile`, `ibanCertificateFile`, and `signatureDataUrl`. Add a contract
for a stable identifier error value such as `license_or_personal_number_required`
instead of the generic `Missing required fields` when that field alone is
absent.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run lib/registration/join-server-validation-contract.test.ts --reporter=verbose
```

Expected: FAIL until the route exposes the stable identifier validation error.

- [ ] **Step 3: Implement stable server validation mapping**

Check the identifier before the remaining generic required-field guard:

```ts
if (!licenseNumber) {
  return NextResponse.json(
    { ok: false, error: "license_or_personal_number_required" },
    { status: 400 },
  );
}
```

In `Content.tsx`, map this value to `fieldErrors.licenseNumber` using the exact
bilingual copy and switch to step 3. Preserve the generic localized form error
for unknown backend responses. Do not expose raw server text as the primary
user-facing message.

- [ ] **Step 4: Run all automated verification**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec vitest run --testTimeout=20000
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec tsc --noEmit
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH DATABASE_URL=postgres://build:build@127.0.0.1:5432/build pnpm run build:next-only
```

Expected: zero test failures, TypeScript exit 0, and Next.js production build
exit 0.

- [ ] **Step 5: Verify Arabic and English in a real browser**

Start the site with Node 22 and use Playwright against `/ar/join` and
`/en/join`. For each step:

1. press `Next` while required controls are empty;
2. confirm the step does not change;
3. confirm localized errors appear below the controls;
4. confirm the first invalid control is centered/focused;
5. confirm required labels show a red star;
6. fill valid values/files and confirm the next step opens;
7. verify CR number and institution license remain optional;
8. on step 4, verify agreement and signature errors before final submission.

Do not send the completed form to Production. Use local mocked submission or
stop before the final valid submit.

- [ ] **Step 6: Commit Task 4**

```bash
git add apps/lawyers.bh/app/api/join/route.ts apps/lawyers.bh/app/'[locale]'/join/Content.tsx apps/lawyers.bh/lib/registration/join-server-validation-contract.test.ts
git commit -m "fix: validate every lawyer registration step"
```

- [ ] **Step 7: Report evidence and deployment boundary**

Report exact automated counts, Arabic/English browser observations, changed
files, and commit hashes. State explicitly whether changes are only local,
pushed to DEV, merged into PRODUCTION, and deployed on Vercel; do not conflate
these stages.
