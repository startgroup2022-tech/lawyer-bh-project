# Directory Detail Image Ratio Design

## Goal

Make the lawyer portrait on each directory detail page use the same visible crop ratio as the portrait on the directory listing card, so the detail portrait no longer appears more zoomed or loses additional content.

## Current Difference

The listing card displays portraits in a 96 by 110 pixel container with `object-cover`. The detail page displays portraits in a square 176 by 176 pixel container with `object-cover`. The square detail container applies a different crop and makes portrait photography appear more zoomed.

## Approved Design

Keep the detail portrait width at 176 pixels and increase its height to 202 pixels, which closely preserves the listing card's 96:110 aspect ratio. Retain `object-cover`, the existing border, rounded corners, fallback avatar, and responsive placement. Do not change the directory listing card.

## Verification

Add a focused regression test for the shared 96:110 aspect-ratio calculation or class contract before changing the detail page. Verify the test fails before implementation and passes afterward. Run the focused test, TypeScript-aware project checks appropriate to the changed files, and inspect the Arabic and English detail pages in a browser at desktop and mobile widths.
