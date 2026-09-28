# LegalSOS Website SOS Orb Pulse Design

## Goal

Make the SOS orb in the LegalSOS website hero closely match the current Flutter app SOS button while preserving the website's click behavior, responsive layout, localization, and RTL behavior.

## Source of Truth

The visual timing and layering come from `lib/features/shared/home/screens/main_home_screen.dart` in the LegalSOS Flutter app:

- One continuously repeating 1600 ms cycle.
- Four expanding rings with normalized delays of 0, 0.18, 0.36, and 0.54.
- Each ring starts at the button edge, expands outward, and fades from 0.42 opacity to transparent.
- Rings use a thin red border and a soft red glow.
- The center button uses the app's red hue with a visually clear 24% translucent fill over the darker website hero, a subtle gold border, red and gold glows, and white SOS text. It does not show the selected country inside the orb.

## Website Design

Keep the existing hero `button` and its `site.openSos()` click handler. Wrap it in a presentation-only pulse container and render four `aria-hidden` ring elements behind it. The rings must use `pointer-events: none` so they cannot intercept the click.

Desktop keeps the existing 190 px orb and mobile keeps the existing 150 px orb. Ring maximum sizes are proportional to those button sizes so the animation retains the app's feeling without changing the hero grid or causing horizontal overflow. The hero already clips overflowing artwork.

CSS custom properties define the button size, ring expansion scale, delay, and common 1600 ms timing. The animation is linear to match the Flutter controller's uncurved progress. Hover feedback remains on the button itself.

## Accessibility and Compatibility

- Preserve the current localized accessible label.
- Mark decorative rings as hidden from assistive technology.
- Disable ring animation under `prefers-reduced-motion: reduce`, leaving a static, subtle ring treatment.
- Do not add direction-specific positioning; centered grid placement must work identically in LTR and RTL.
- Do not change the SOS dialog, request flow, translations, or APIs.

## Verification

- Add a component test that clicks the hero SOS orb and observes the real dialog-opening state through the existing provider, proving the wrapper and rings do not replace or break the interaction.
- Assert that four decorative rings are rendered and hidden from accessibility.
- Run the focused test first in a failing state, then after implementation.
- Run the full LegalSOS website test suite, TypeScript check, lint, and production build.
- Review the scoped diff and confirm unrelated worktree changes were untouched.
