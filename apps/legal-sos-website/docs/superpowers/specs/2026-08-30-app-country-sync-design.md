# LegalSOS Website App Country Sync Design

## Goal

Make the LegalSOS website use the same enabled-country channel and country background images as the LegalSOS app. Enabling a country for the app must make it available on the website without separately enabling the website channel.

## Source and Boundary

The source of truth remains the lawyers.bh countries API with `channel=app`. The LegalSOS website adds a same-origin read-only proxy at `/api/countries`; the proxy requests `${LEGAL_SOS_BACKEND_URL}/api/countries?channel=app`, defaulting the backend origin to `https://www.lawyers.bh`. It validates and normalizes the response before returning it to browser code. It never changes country settings.

## Client State

`SiteProvider` loads the proxy response and exposes the returned countries. The saved selection is used only if it remains in the returned list. On a first visit with no valid saved selection, the website asks for browser geolocation permission immediately, selects a matching enabled country when available, and otherwise falls back to the first enabled country without opening the custom country dialog. The country dialog remains available only when the user opens it manually from the header. The country gate and SOS form render the provider list instead of the previous hard-coded eight-country list.

If the country request fails or returns no valid countries, the website must not substitute an unapproved country list or automatically open the custom country dialog.

## Background

The hero reads the selected country's validated HTTPS `backgroundUrl` and applies it as its background image. Changing the country changes the image immediately. If an enabled country has no valid background image, the existing LegalSOS hero image remains as the visual fallback.

## Compatibility

Known geographic bounds remain available for browser location detection. Detection can select only a country present in the fetched app-enabled list. Arbitrary valid ISO alpha-2 country codes from the backend are supported even when automatic coordinate detection has no local bounds for them.

## Verification

- Parser tests accept valid app-country payloads and reject malformed country/background data.
- Provider/hero tests prove a stale saved country falls back to the first returned country and changing country changes the hero background.
- Existing SOS interaction and RTL/responsive behavior remain intact.
- Run the full website test suite, typecheck, lint, and production build.
