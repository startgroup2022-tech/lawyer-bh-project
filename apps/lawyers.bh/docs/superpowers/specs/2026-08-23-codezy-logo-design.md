# CODEZY Card Logo Design

## Scope

Create a website-ready logo asset from the user-supplied `/Users/hma/Downloads/ceck.png` and display it on the existing CODEZY technical-operator card.

## Image Treatment

- Preserve only the coloured symbol on the left side of the source image.
- Remove the CODEZY wordmark, registered-trademark mark, and surrounding white canvas.
- Preserve the original pink, cyan, and purple symbol without redesigning or changing its proportions.
- Export a square PNG with a transparent background and modest even padding around the symbol.
- Save the project asset as `apps/lawyers.bh/public/images/team/codezy-logo.png`.

## Card Integration

- Set the existing `CODEZY FOR TECH SOLUTIONS` organisation member's `photo` field to `/images/team/codezy-logo.png`.
- Reuse the existing About-page card image renderer and styling.
- Do not change the CODEZY names, duties, section placement, or the existing GULF INTERNATIONAL card.

## Verification

- Confirm the output has an alpha channel, transparent corners, and contains only the symbol.
- Verify the CODEZY team-data test expects the logo path.
- Run the focused tests and lint for the changed About-page files.
- Record the existing unrelated application build blocker separately.
- Do not deploy without separate approval.
