# Saraya Square Public Brand Header Design

## Goal

Restore the previously used Saraya Square building mark to the public page, recolor it to match the current green-and-gold identity, and make entry to management and tenant accounts immediately visible on desktop and mobile.

## Scope

- Restore the existing `saraya-gateway.png` mark from project history as a Flutter asset.
- Present the mark with the existing Saraya Square bilingual wordmark in the public header.
- Replace the icon-only login control with a clearly labeled account-entry button.
- Keep the language switch adjacent to the account-entry action.
- Add a second account-entry action in the hero on compact layouts so mobile visitors do not need to search the header.
- Preserve the current public inventory, routing, loading, and localization behavior.

## Visual Treatment

The restored building mark uses the current Saraya palette rather than introducing a new brand system. The mark sits on a deep-green rounded surface with a muted-gold tint, while the bilingual wordmark remains dark green and muted ink on the white header.

The desktop header keeps a single horizontal row: brand at the leading edge, then the language switch and a prominent filled account-entry button at the trailing edge. The button uses the localized equivalent of “Management & tenant login” and includes a login icon.

On narrow screens, the brand remains compact and readable. The header action retains a useful text label rather than collapsing to an unexplained icon. A matching secondary action appears in the hero to make account entry easy to find without competing with the primary inventory browsing action.

## Interaction

- Both account-entry actions call the existing `onLogin` callback and preserve the current login route.
- The language control continues to switch between Arabic RTL and English LTR.
- No new authentication roles or login routes are introduced in this change.
- Buttons expose stable keys and readable labels for widget tests and accessibility.

## Responsive Behavior

- Wide layouts show the full bilingual brand and full account-entry label in one header row.
- Compact layouts reduce spacing and typography but keep both the brand identity and a readable login label.
- The hero action group wraps vertically when horizontal space is insufficient.

## Testing

Widget tests verify that:

- the restored logo asset is rendered;
- the account-entry label is visible instead of an icon-only control;
- tapping the header and compact hero account-entry actions invokes the existing login callback;
- Arabic and English layouts continue to render without overflow at representative mobile and desktop sizes.

## Out of Scope

- Authentication workflow changes.
- Separate administration and tenant login screens.
- Changes to public inventory data or rental checkout behavior.
