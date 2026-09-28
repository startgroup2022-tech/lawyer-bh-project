# LegalSOS Website Visual Polish Design

## Goal

Refresh the current LegalSOS website locally so it feels more polished, cohesive, and premium while preserving the existing LegalSOS identity, content, localized behavior, and service flows. Use `https://legalsos.lawyer/` only as visual inspiration for depth, spacing, phone presentation, and restrained motion; do not copy its brand, text, structure, or visual assets.

## Fixed Constraints

- Do not change the current header markup, behavior, navigation, country trigger, language selector, or responsive menu.
- Do not change request, authentication, payment, dispatch, country-loading, or registration APIs.
- Do not change LegalSOS copy, supported countries, screenshots, or existing public assets.
- Preserve the current uncommitted footer email and eFada work.
- Do not deploy, push, publish, or commit the visual changes.
- Present a local browser preview before any future release decision.

## Visual Direction

Keep the dark navy, LegalSOS gold, and SOS red palette. Replace hard section boundaries with layered navy gradients, low-opacity gold or red radial light, and subtle overlap between adjacent sections. Surfaces should use quieter borders, larger radii, softer shadows, and consistent focus treatments rather than bright outlines or visible separator rules.

Motion remains restrained: short entrance or hover transitions only, with no continuous decorative animation beyond the existing SOS pulse. Every new transition must be disabled or simplified under `prefers-reduced-motion`.

## Section Transitions

Remove the visible hero bottom border and the hard borders currently separating the help teaser and other landing sections. Each landing section receives a compatible top and bottom color wash so adjacent backgrounds blend into one another. Decorative gradient layers must not block interaction and must remain inside their section to prevent horizontal overflow.

The content order, section anchors, copy, and SOS actions remain unchanged.

## Phone Showcase

Keep the three existing LegalSOS app screenshots and their localized captions. Present them as a coordinated device composition inspired by the reference:

- The middle phone is slightly larger and visually forward.
- The side phones sit lower and angle inward with reduced emphasis.
- Frames gain a more realistic dark shell, inner highlight, speaker or island detail, and layered shadow.
- A soft navy and gold glow anchors the phones to the section without adding a new image asset.
- Desktop shows the full three-device composition; smaller screens keep a touch-friendly horizontal snap layout with readable captions and no clipped controls.

The quick-flow content and actions remain beside the composition on desktop and stack below it on mobile.

## Country Selection

Retain the existing location-detection action and supported-country source from `SiteProvider`. Improve only the country dialog presentation and selection semantics:

- Show a generated country flag, localized country name, ISO code, and dialing code for every option.
- Mark the currently selected country visibly and with an accessible selected state.
- Use larger selectable cards, clearer hover and focus states, and a quieter selected glow.
- Preserve automatic geolocation, error handling, close behavior, and the header trigger.

No country is added, removed, or enabled by this change.

## Phone and Form Fields

The SOS request already separates the country control and national phone input. Preserve that data flow and improve its visual hierarchy:

- Treat the country trigger and number input as one segmented control.
- Strengthen focus-within feedback without changing validation.
- Improve the country search menu, selected row, scrolling, and mobile sizing.
- Keep phone normalization, submitted values, and payment contact payloads unchanged.

Apply the same surface, border, focus, spacing, and disabled-state language to comparable public form fields and the lawyer registration form. The lawyer registration phone value remains a single international number in this pass; splitting its stored value or changing validation is outside scope.

## Components and Files

Planned production changes are limited to:

- `app/globals.css` for section blending, country dialog styling, phone composition, shared landing surfaces, and responsive behavior.
- `components/LandingSections.tsx` only if small presentation hooks are needed for the three-phone composition; content and actions stay unchanged.
- `components/CountryGate.tsx` for flag, dialing-code, and selected-state presentation.
- `components/SosFlow.module.css` for the SOS phone control, menu, and related fields.
- `components/LawyerRegistrationFlow.module.css` for matching form-field polish.

`components/Header.tsx` is explicitly excluded.

## Accessibility

- Preserve keyboard operation and visible focus for every button, field, menu option, and country card.
- Use `aria-pressed` or an equivalent accessible state for the selected supported country.
- Keep labels associated with inputs and preserve current dialog roles.
- Maintain readable contrast for muted text and disabled states.
- Keep RTL and LTR layouts equivalent and avoid physical left/right assumptions where logical CSS properties are available.

## Testing and Local Review

Follow test-first implementation for the country-selection semantic change. Add or update a focused component test that fails before implementation and verifies the current country exposes its selected state and dialing code without changing the selection callback.

After implementation:

- Run focused tests for the affected components.
- Run the full LegalSOS website test suite, TypeScript check, lint, production build, and scoped diff check with Node 22.
- Start the website locally on an available local port.
- Review Arabic desktop and mobile layouts in a real browser, including the phone composition, country dialog, SOS phone control, and reduced-width behavior.
- Leave the local preview open for the user and do not perform any deployment or Git push.
