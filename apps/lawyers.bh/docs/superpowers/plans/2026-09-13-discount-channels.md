# Discount channels implementation plan

**Goal:** Reuse existing discount administration for website, LegalSOS app, or both, with optional app checkout entry and server-calculated prices.

**Architecture:** Existing discount evaluator and redemption records remain authoritative. Routes select their channel; clients cannot select it. Mobile reservations belong to emergency requests and are committed with the request. Existing website codes default to website.

**Constraints:** Arabic/English; no production deployment or live payments; preserve unrelated changes; BHD integer fils; one code per payment; reject zero-total offers using existing policy.

## Tasks (inline execution approved)
- [x] Add failing evaluator/admin validation tests for website/app/both and backwards-compatible default; implement scope schema, migration, admin selector, repository validation. Run `pnpm exec vitest run lib/discounts --maxWorkers=1`.
- [x] Add mobile quote/payment tests: server catalogue price, app channel, bad code, persisted discounted total and reservation, idempotent session. Implement quote route and transaction-backed reservation; link payment state to redemption. Test against isolated PostgreSQL.
- [x] Add Flutter request and checkout interaction tests. Implement apply/remove field, localized errors and original/discount/final breakdown; freeze after session creation. Run focused Flutter tests and analyzer.
- [x] Run backend typecheck, focused regressions, diff checks. Report local versus deployed status separately.

## Verification and deployment boundary

2026-09-13: 45 focused backend tests passed (including 4 real isolated PostgreSQL tests); 33 Flutter payment/service/widget tests passed. Backend TypeScript passed. Scoped Flutter analysis passed after correcting a braces lint. No live charge, production migration, deployment, or store upload performed.

Apply migration 0097 before deploying these server changes, then release the mobile build. Existing codes default to website, so an administrator must explicitly choose app or both. Mobile SDK reservations remain held until confirmed capture, because an SDK session can still complete after a preview expires; do not free capacity merely on a UI timeout. A future abandoned-session reclamation job must prove the session cannot be charged first. This is separate from the pending account-deletion scheduler work. Discount redemption identifiers must be added to its retention inventory before enabling final erasure.
