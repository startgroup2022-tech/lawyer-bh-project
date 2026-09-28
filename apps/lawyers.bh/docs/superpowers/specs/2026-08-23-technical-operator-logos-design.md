# Technical Operator Logos Design

## Scope

Add the supplied GICC logo to the existing GULF INTERNATIONAL Company card and change the existing CODEZY card logo to use a solid white background. Ensure organisation logos display fully without changing person portraits.

## Assets

- Create `apps/lawyers.bh/public/images/team/gicc-logo.png` from `/Users/hma/Downloads/ChatGPT Image Jul 25, 2026, 06_18_08 PM.png`.
- Preserve the complete GICC globe, red mark, and `GICC` text on a square white canvas.
- Replace `apps/lawyers.bh/public/images/team/codezy-logo.png` with the same approved CODEZY symbol on a square solid white canvas.
- Preserve both source logos' colours, geometry, text, and proportions; do not redesign them.

## Card Rendering

- Add `photo: "/images/team/gicc-logo.png"` to the existing GULF INTERNATIONAL organisation member.
- Keep CODEZY's existing `photo: "/images/team/codezy-logo.png"` reference.
- Pass organisation identity to `MemberAvatar` from `member.schemaType === "Organization"`.
- Render organisation logos with a white background and `object-contain` so the complete mark is visible inside the existing circular avatar.
- Continue rendering person portraits with the existing `object-cover` behavior.

## Boundaries and Verification

- Do not change company names, titles, duties, card order, or section layout.
- Do not change person-card appearance.
- Test both organisation logo paths and the organisation-specific image-fit behavior.
- Verify the two PNGs are square and have opaque white corners.
- Run focused tests and lint; record the existing unrelated application build blocker separately.
- Do not deploy without separate approval.
