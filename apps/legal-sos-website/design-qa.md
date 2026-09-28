# Legal SOS Website Design QA

## Evidence

- Source visual truth: `/Users/hma/Downloads/ChatGPT Image Aug 10, 2026, 06_03_38 PM.png`
- Source dimensions: 853 × 1844 pixels.
- Browser-rendered implementation, first desktop pass: `implementation-ar-853-pass1.png`
- First desktop capture dimensions: 838 × 4049 pixels from an 853 × 1000 CSS viewport at device scale factor 1. The 15-pixel difference is the browser scrollbar.
- Browser-rendered mobile implementation: `implementation-mobile-390.png`
- Mobile capture: 375 × 844 visible pixels from a 390 × 844 CSS viewport at device scale factor 1. The 15-pixel difference is the browser scrollbar.
- Combined visual comparison: `design-qa-comparison-pass1.png`
- State: Arabic landing page, Bahrain selected manually, no modal open for desktop comparison; Arabic hero on mobile.

## Full-View Comparison Evidence

The combined first-pass comparison confirmed that the implementation follows the source hierarchy and visual language: dark navy canvas, gold accents, official Legal SOS emblem, split hero, prominent red SOS control, bordered benefit cards, numbered process, legal-question artwork, download/portal call-to-action, and structured footer.

The first full-page browser screenshot exposed an in-app-browser capture artifact on the RTL page: the sticky header was repeated during full-page stitching. The implementation itself had no horizontal overflow at desktop (`scrollWidth = clientWidth = 838`) or mobile (`scrollWidth = clientWidth = 375`).

## Focused Comparison Evidence

The hero and mobile viewport were inspected separately because they contain the most fidelity-sensitive details. The generated skyline asset has the intended navy nighttime treatment and red reflection; the supplied official Legal SOS emblem is sharp; the SOS control is readable; Arabic text hierarchy, gold icons, and dark bordered surfaces are coherent. Mobile places SOS above the heading and keeps the primary CTA within the first viewport, matching the approved priority.

## Findings And Comparison History

### Pass 1

- [P2] Desktop hero was too tall relative to the source.
  - Evidence: source header and hero occupy approximately the first 505 pixels; first implementation pass used a 680-pixel hero plus header.
  - Fix applied: reduced desktop hero/content minimum height from 680 to 520 pixels, reduced hero padding and typography, and reduced the SOS orb from 230 to 190 pixels.

- [P2] Benefit cards collapsed to two columns at the 853-pixel reference width.
  - Evidence: source uses four cards in one row while first implementation pass used a two-by-two layout.
  - Fix applied: removed the 1040-pixel two-column override so four columns remain through tablet/reference width and collapse only at the mobile breakpoint.

- [P2] Sticky header created repeated regions in the full-page RTL browser capture and drifted from the non-sticky source composition.
  - Fix applied: changed the site header to relative positioning on desktop and mobile.

- [P3] The implementation adds a country-aware service catalog and client portal beyond the single reference image.
  - Classification: intentional product scope approved in the design specification.

### Post-Fix Verification

Automated tests and the production build can be rerun after the fixes. A fresh browser screenshot and the mandatory second side-by-side comparison could not be completed because the in-app browser blocked all further access to the local URL after the development server restart. Browser testing before the restart had already verified:

- Arabic, English, and Turkish navigation with correct RTL/LTR document direction.
- Manual Bahrain selection and all eight country choices visible.
- SOS details and contact steps.
- Successful local SOS submission with a generated non-guessable reference.
- Portal navigation in Turkish.
- Mobile layout with no horizontal overflow.
- Browser console had no application errors; one Next.js smooth-scroll warning was fixed by adding `data-scroll-behavior="smooth"`.

## Required Fidelity Surfaces

- Fonts and typography: hierarchy is close to the reference and readable in all three languages; system font fallbacks are used to avoid external font loading. Post-fix desktop wrapping requires recapture.
- Spacing and layout rhythm: first-pass P2 hero and grid issues were fixed in code; post-fix browser evidence is blocked.
- Colors and visual tokens: navy, gold, white, muted blue-gray, and SOS red map consistently to the source.
- Image quality and asset fidelity: official supplied emblem used; generated skyline and scales imagery match the intended dark premium art direction; no placeholder art or custom SVG illustration is used.
- Copy and content: coherent trilingual standalone copy, privacy explanation, and public-emergency disclaimer are present.
- Icons: Phosphor icon family is used consistently with gold line/duotone treatment.
- Accessibility and states: keyboard focus, semantic dialogs, labeled controls, reduced motion, validation, disabled, error, success, and mobile states are implemented.

## Remaining Blocking Check

- Capture the post-fix Arabic desktop page at the reference width.
- Compare it with the source in one combined visual artifact.
- Confirm the three fixed P2 findings are visibly resolved.

final result: blocked
