# Saraya Square Public Brand Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the previous Saraya Square building mark and make management and tenant account entry prominent, polished, and responsive.

**Architecture:** Keep the change inside the existing Flutter public-home feature. Register the historical brand image as a Flutter asset, render it through a focused private brand widget, and adapt the header and hero actions with `LayoutBuilder` so the same login callback works on desktop and mobile.

**Tech Stack:** Flutter, Material 3, generated Flutter localization, `flutter_test`.

## Global Constraints

- Reuse the historical `saraya-gateway.png` mark rather than creating a new logo.
- Use the existing `SarayaColors.deepGreen` and `SarayaColors.mutedGold` palette.
- Preserve the current public inventory, routing, loading, localization, and login callback behavior.
- Keep Arabic RTL and English LTR layouts free of overflow on mobile and desktop.
- Do not introduce new authentication roles or routes.

---

### Task 1: Restore the brand mark and labeled desktop account entry

**Files:**
- Create: `apps/saraya_square_app/assets/branding/saraya-gateway.png`
- Modify: `apps/saraya_square_app/pubspec.yaml`
- Modify: `apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart:82`
- Test: `apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart`

**Interfaces:**
- Consumes: `AppLocalizations.publicHomeLogin`, `SarayaColors.deepGreen`, `SarayaColors.mutedGold`, and the existing `VoidCallback onLogin`.
- Produces: a header image keyed `public-brand-logo` and a labeled account button keyed `public-login`.

- [ ] **Step 1: Write the failing desktop branding test**

Add a widget test that pumps a `Size(1100, 900)` English layout and asserts:

```dart
expect(find.byKey(const Key('public-brand-logo')), findsOneWidget);
expect(find.text('Admin and tenant login'), findsOneWidget);

await tester.tap(find.byKey(const Key('public-login')));
expect(loginRequested, isTrue);
```

The test must also assert `tester.takeException()` is null.

- [ ] **Step 2: Run the focused test and verify it fails for the missing brand image and labeled button**

Run:

```bash
cd apps/saraya_square_app
flutter test test/features/public_home/public_home_screen_test.dart --plain-name "desktop public header shows the Saraya brand and labeled account entry"
```

Expected: FAIL because `public-brand-logo` is absent and the login label is only a tooltip.

- [ ] **Step 3: Restore and register the historical brand asset**

Create the asset from commit `954d213`:

```bash
mkdir -p apps/saraya_square_app/assets/branding
git show 954d213:apps/lawyers.bh/public/saraya/assets/assets/branding/saraya-gateway.png > apps/saraya_square_app/assets/branding/saraya-gateway.png
```

Register it in `pubspec.yaml`:

```yaml
flutter:
  generate: true
  uses-material-design: true
  assets:
    - assets/branding/saraya-gateway.png
```

- [ ] **Step 4: Replace the generic building icon with the restored mark and a labeled login button**

In `_PublicHeader`, render the image with a muted-gold tint on the existing deep-green rounded container:

```dart
Image.asset(
  'assets/branding/saraya-gateway.png',
  key: const Key('public-brand-logo'),
  color: SarayaColors.mutedGold,
  fit: BoxFit.contain,
  semanticLabel: 'Saraya Square',
)
```

Replace the icon-only control with:

```dart
FilledButton.icon(
  key: const Key('public-login'),
  onPressed: onLogin,
  icon: const Icon(Icons.login_rounded),
  label: Text(strings.publicHomeLogin),
)
```

Extract the image and bilingual name into a private `_SarayaBrand` widget so responsive layout changes do not duplicate brand markup.

- [ ] **Step 5: Run the focused test and verify it passes**

Run the command from Step 2.

Expected: PASS with no layout exceptions.

- [ ] **Step 6: Commit the desktop brand change**

```bash
git add apps/saraya_square_app/assets/branding/saraya-gateway.png apps/saraya_square_app/pubspec.yaml apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart
git commit -m "feat(saraya): restore public brand header"
```

### Task 2: Polish compact account entry and hero actions

**Files:**
- Modify: `apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart:82`
- Test: `apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart`

**Interfaces:**
- Consumes: `_SarayaBrand`, `AppLocalizations.publicHomeBrowse`, `AppLocalizations.publicHomeLogin`, and `VoidCallback onLogin`.
- Produces: a two-row compact header and a compact-only hero login action keyed `public-hero-login`.

- [ ] **Step 1: Write the failing compact-layout test**

Add a test that pumps Arabic at `Size(390, 844)`, verifies the header and hero account labels, taps the hero action, and checks for overflow:

```dart
expect(find.byKey(const Key('public-brand-logo')), findsOneWidget);
expect(find.byKey(const Key('public-login')), findsOneWidget);
expect(find.byKey(const Key('public-hero-login')), findsOneWidget);
expect(find.text('دخول الإدارة والمستأجرين'), findsNWidgets(2));

await tester.tap(find.byKey(const Key('public-hero-login')));
expect(loginRequested, isTrue);
expect(tester.takeException(), isNull);
```

- [ ] **Step 2: Run the compact test and verify it fails because the hero action is missing**

Run:

```bash
cd apps/saraya_square_app
flutter test test/features/public_home/public_home_screen_test.dart --plain-name "compact Arabic public home keeps brand and account entry clear"
```

Expected: FAIL because `public-hero-login` does not exist.

- [ ] **Step 3: Implement the compact header layout**

Wrap the header content in `LayoutBuilder`. For widths below `720`, show `_SarayaBrand` and the language switch in the first row, then the full-width `public-login` button below. For wider widths, keep a single row with the same labeled button at the trailing edge.

- [ ] **Step 4: Add a compact-only account action to the hero**

Pass `onLogin` into `_Hero`, use `LayoutBuilder` to detect widths below `720`, and render the browse action with an outlined account action:

```dart
OutlinedButton.icon(
  key: const Key('public-hero-login'),
  onPressed: onLogin,
  icon: const Icon(Icons.login_rounded),
  label: Text(strings.publicHomeLogin),
)
```

Use a `Wrap` with responsive spacing so Arabic and English labels do not overflow.

- [ ] **Step 5: Run the compact and full public-home test file**

Run:

```bash
cd apps/saraya_square_app
flutter test test/features/public_home/public_home_screen_test.dart
```

Expected: all tests PASS without overflow exceptions.

- [ ] **Step 6: Run formatting and static analysis**

Run:

```bash
cd apps/saraya_square_app
dart format lib/features/public_home/presentation/public_home_screen.dart test/features/public_home/public_home_screen_test.dart
flutter analyze
```

Expected: formatting makes no unexpected changes and analysis reports no issues.

- [ ] **Step 7: Commit the responsive polish**

```bash
git add apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart
git commit -m "feat(saraya): clarify responsive account entry"
```

### Task 3: Build and visually verify the published surface

**Files:**
- Modify through generated build output: `apps/lawyers.bh/public/saraya/`

**Interfaces:**
- Consumes: the completed Flutter public-home implementation.
- Produces: a web build ready for the existing Saraya deployment path.

- [ ] **Step 1: Run the complete Flutter test suite**

```bash
cd apps/saraya_square_app
flutter test --concurrency=1
```

Expected: all tests PASS.

- [ ] **Step 2: Build the Flutter web application into the existing hosted directory**

```bash
cd apps/saraya_square_app
flutter build web --release --base-href /saraya/ --output ../lawyers.bh/public/saraya
```

Expected: build completes successfully and includes `assets/assets/branding/saraya-gateway.png`.

- [ ] **Step 3: Verify generated output and review the page locally**

Confirm the built asset exists and open `/saraya` at mobile and desktop widths. Verify the green-and-gold mark, bilingual wordmark, language switch, labeled account entry, and hero action are visually balanced and clickable.

- [ ] **Step 4: Commit the generated web build**

```bash
git add apps/lawyers.bh/public/saraya
git commit -m "build(saraya): publish branded public header"
```
