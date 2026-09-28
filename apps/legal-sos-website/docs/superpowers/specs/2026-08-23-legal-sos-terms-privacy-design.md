# LegalSOS Terms and Privacy Page Design

## Goal

Add a public, multilingual LegalSOS terms and privacy page that can be used as the App Store privacy-policy URL and matches the existing LegalSOS website identity.

## Legal owner

The page identifies **GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L** as the owner and operator of LegalSOS. It must not identify Saraya Square Foundation for Services Business as the owner.

## Routes and languages

- Arabic: `/ar/terms`
- English: `/en/terms`
- Turkish: `/tr/terms`

The route follows the website's existing locale and direction rules. Arabic renders RTL; English and Turkish render LTR. Each route has localized metadata, headings, body text, and last-updated text.

## Content

The page adapts the lawyers.bh terms-page structure to LegalSOS and contains:

1. Terms and acceptance
2. Nature of LegalSOS and emergency-service limitation
3. Privacy and security
4. Information collected and processing purposes
5. Location and notification permissions
6. Sharing with lawyers and service providers
7. Payments
8. Registration and account responsibilities
9. Platform limitations and legal-service outcomes
10. Data retention and user rights
11. Governing law and Bahrain courts
12. Amendments and contact details

The copy describes LegalSOS as an intermediary and states that it is not a government emergency service. It does not promise confidentiality or security beyond implemented product behavior. It uses the LegalSOS contact email already displayed by the website.

## Presentation

The page uses the current navy background, gold accents, typography, spacing, and responsive container styles. A compact header links back to the localized homepage. Content appears in readable sections without horizontal scrolling on mobile.

## Integration

- Add a localized Terms and Privacy link to the existing footer.
- Link the SOS consent text to the localized terms page without accidentally toggling its checkbox.
- Preserve the current locale during navigation.
- Do not change submission, authentication, payment, or location behavior.

## Metadata

Each route provides a localized title and description suitable for a public App Store privacy-policy URL. The route remains server-rendered and indexable.

## Verification

- Verify all supported locales resolve to localized content.
- Verify the Gulf company is the legal owner and the previous lawyers.bh owner is absent.
- Verify the footer and SOS consent expose the localized `/terms` link.
- Run website tests, typecheck, lint, and production build.
- Visually inspect desktop and mobile layouts.

## Out of scope

- Legal certification of the policy text
- App Store Connect form completion
- Backend data-collection or retention changes
- Deployment or DNS changes
