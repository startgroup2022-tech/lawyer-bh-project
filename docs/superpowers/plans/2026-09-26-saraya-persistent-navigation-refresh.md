# Saraya Persistent Navigation and Pull Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and verification before completion.

**Goal:** Keep the authenticated navigation shell mounted while route content changes and make page data refreshable by pull gesture without browser reload.

**Architecture:** Group authenticated routes under a GoRouter `ShellRoute`; the shell owns navigation chrome while nested routes own page content. Existing refresh callbacks remain page-scoped, with empty states made scrollable.

**Tech Stack:** Flutter 3, Dart 3, go_router 17, flutter_test.

## Global Constraints

- Preserve Arabic RTL and English LTR behavior.
- Do not reload the browser or replace the authenticated shell during navigation.
- Do not add a global refresh that reloads unrelated repositories.
- Preserve existing role-based navigation access.

---

### Task 1: Persistent authenticated shell

**Files:**
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/core/widgets/app_shell.dart`
- Test: `apps/saraya_square_app/test/app/router_test.dart`

- [ ] Add a failing router test that compares the shell element before and after navigation.
- [ ] Add a stable shell key and group authenticated pages under `ShellRoute`.
- [ ] Keep titles, selected navigation, logout, and authorization behavior route-aware.
- [ ] Run router and shell tests.

### Task 2: Pull refresh for empty and populated data pages

**Files:**
- Modify: affected screens under `apps/saraya_square_app/lib/features/*/presentation/`
- Test: focused feature widget tests.

- [ ] Add failing tests for refresh gestures on empty pages.
- [ ] Use always-scrollable list physics and keep refresh callbacks page-scoped.
- [ ] Run focused feature tests.

### Task 3: Full verification and local web publication

**Files:**
- Update generated web bundle under `apps/lawyers.bh/public/saraya/`.

- [ ] Run `flutter analyze` and `flutter test`.
- [ ] Build and publish the web bundle locally.
- [ ] Verify desktop and mobile navigation visually without browser reload.
