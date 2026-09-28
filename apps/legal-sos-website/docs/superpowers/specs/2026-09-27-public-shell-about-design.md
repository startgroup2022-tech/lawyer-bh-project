# LegalSOS Public Shell and About Page Design

## Goal

Create one consistent public-site frame for LegalSOS across Arabic, English, and Turkish pages. The frame includes a responsive sticky navigation bar, a shared footer, and a new About page featuring the platform story and Omar Nabih Shaker as the sole management profile.

## Scope

- Keep the existing LegalSOS brand, colors, logo, country selector, language selector, account links, and registration flow.
- Make the navigation bar sticky on every public page.
- Compact the navigation bar after the user scrolls, using a restrained translucent glass treatment.
- Replace the homepage-only footer markup with one reusable footer used by all public pages.
- Add a localized About page at `/{locale}/about`.
- Add Omar Nabih Shaker's official photo from the existing Lawyers.bh repository as a local LegalSOS asset.
- Validate desktop, tablet, and mobile layouts before publication.

## Out of Scope

- No CMS or admin editor for About content.
- No additional management profiles.
- No changes to authentication, payment, SOS dispatch, lawyer approval, or database behavior.
- No redesign of the LegalSOS logo or existing page content unrelated to the shared shell.

## Navigation

### Default State

- The header remains full-height at the top of the page.
- It uses the existing dark LegalSOS surface and preserves the current information hierarchy.
- The logo, primary navigation, country selector, language selector, sign-in action, and mobile menu remain available.
- Add a localized About link without removing existing navigation items.

### Scrolled State

- The header stays fixed at the top of the viewport.
- After a small scroll threshold, its height and spacing reduce.
- The background becomes translucent navy with backdrop blur, a subtle gold-tinted border, and a restrained shadow.
- Transitions are short and disabled when `prefers-reduced-motion` is enabled.
- Page content receives enough top spacing to prevent the fixed header from covering headings or anchor targets.

### Mobile Behavior

- The menu is a clear single-column panel anchored beneath the compact header.
- Interactive controls keep a minimum 44-pixel touch target.
- Opening the menu prevents confusing overlap with page content.
- The menu closes after navigation, on Escape, and when the user clicks outside it.
- Country and language controls remain usable without horizontal overflow.

## Shared Footer

Create a reusable footer that appears on all public pages, including the homepage, Help, About, Portal entry pages, legal policies, refund policy, and lawyer registration.

The footer contains:

1. LegalSOS brand, short localized description, and eFada badge.
2. Quick links: Home, About, Help, and the relevant portal.
3. Platform links: lawyer registration, services, and how the service works.
4. Legal links: terms/privacy and refund policy.
5. Contact details: `info@legalsos.org`, current country context when available, and country dial code.
6. The existing emergency disclaimer and copyright line.

The footer must use real links instead of duplicated page-specific buttons when an action can be represented as navigation. It must remain legible and balanced at desktop, tablet, and mobile widths.

## Shared Public Shell

Create a `PublicSiteShell` boundary responsible for the repeated public frame:

- `SiteProvider`
- `Header`
- page content
- `SiteFooter`
- `CountryGate`
- optional `SosDialog`

Pages opt into the SOS dialog through a clear property. Legal pages keep their legal-document content but use the same public navigation and footer. This removes page-by-page duplication while keeping page content isolated.

## About Page

### Content Structure

1. Hero: what LegalSOS is and why it exists.
2. Mission and vision.
3. Values: urgency with care, trust, privacy, clarity, and responsible access to legal support.
4. How LegalSOS works: request, verification/payment where applicable, lawyer matching, and follow-up.
5. Regional coverage and country-aware service experience.
6. Management profile: Omar Nabih Shaker only.
7. Closing call to action linking to SOS assistance and lawyer registration.

### Omar Profile

- Arabic name: `عمر نبيه شاكر`.
- English name: `Omar Nabih Shaker`.
- Role adapted for LegalSOS as Chairman and Chief Executive Officer.
- Use the official image currently stored at `apps/lawyers.bh/public/images/team/omar-nabih-shaker.jpg`.
- Copy the image into the LegalSOS website's public assets so the page does not depend on another domain at runtime.
- Include a short, platform-relevant responsibility summary rather than copying the full Lawyers.bh biography.

## Localization

- Add complete Arabic, English, and Turkish About and footer copy.
- Add the About navigation label in all three languages.
- Preserve RTL/LTR behavior through the existing locale and direction system.
- Avoid hard-coded Arabic-only text inside reusable components.

## Accessibility

- The sticky header remains keyboard accessible.
- Mobile menu state uses `aria-expanded` and meaningful labels.
- Omar's image has localized alternative text.
- Footer headings and link groups use semantic navigation landmarks.
- Focus indicators remain visible against glass and dark backgrounds.
- Decorative effects do not reduce text contrast.

## Error and Fallback Behavior

- If the country context is still loading, the footer displays neutral contact information without layout shift.
- The About page uses a bundled local image, so no remote image failure state is required.
- Public pages remain readable if backdrop filtering is unsupported; the header falls back to an opaque dark background.

## Testing

- Header tests cover the scrolled class, menu opening/closing, and navigation closure behavior.
- Footer tests verify required links and localized labels.
- About tests verify all locales, Omar's name, role, and local image.
- Public-page tests verify the shared shell appears on homepage, Help, Portal, legal pages, refund policy, registration, and About.
- TypeScript, ESLint, the full LegalSOS website test suite, and a production build must pass.
- Browser QA covers desktop and mobile views, top and scrolled header states, the footer, and the About page.

## Delivery Boundary

Implement and show a local preview first. Publish only after the user approves the preview. Keep Git, database, Vercel, and live-route evidence separate in the final report.
