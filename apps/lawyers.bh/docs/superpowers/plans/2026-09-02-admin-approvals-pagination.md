# Admin Approvals Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display ten filtered approval applications per page with numbered navigation.

**Architecture:** Pure helpers calculate safe pages and a five-button window. The existing client component owns the page state and slices its existing filtered list without changing the server query or mutation APIs.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Page size is exactly 10.
- Pagination applies after the existing filter and search.
- Changing filter or search resets to page 1.
- Do not change database queries, permissions, approval actions, or totals.

---

### Task 1: Pagination Helpers

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/approvals/pagination.ts`
- Test: `apps/lawyers.bh/app/[locale]/admin/approvals/pagination.test.ts`

**Interfaces:**
- Produces: `paginateItems<T>(items, requestedPage, pageSize)` and `visiblePageNumbers(totalPages, currentPage, maximumVisible)`.

- [ ] Write literal tests for first/full page, final partial page, page clamping, and start/middle/end five-number windows.
- [ ] Run the focused test and verify failure because the helper module is absent.
- [ ] Implement the minimal pure helpers.
- [ ] Re-run the focused test and verify all cases pass.

### Task 2: Approvals Component Integration

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/Content.tsx`

**Interfaces:**
- Consumes: `paginateItems` and `visiblePageNumbers`.
- Produces: localized, responsive numbered navigation for the filtered results.

- [ ] Add `requestedPage` state and derive the clamped page, page slice, total pages, and visible numbers.
- [ ] Reset the requested page inside status-filter and search change handlers.
- [ ] Render only the current page slice.
- [ ] Add Previous, numbered, and Next controls with disabled and active accessibility states.
- [ ] Run focused and full tests, TypeScript, changed-file ESLint, and `git diff --check`.
