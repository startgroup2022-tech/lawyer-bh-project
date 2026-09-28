# Saraya Square Public Home Design

## Goal

Restore a polished public home page at `/` that does not require authentication and presents the currently available Saraya Square units plus the virtual-address offering. Keep every administrative route and all customer data protected.

## Public Experience

- `/` renders immediately as a bilingual Arabic RTL / English LTR marketing and availability page.
- The hero identifies Saraya Square and provides two actions: browse availability on the same page and open `/login` for tenants and management.
- The units section displays only API-approved public listings: unit name, type, number, area, floor, rent, and availability.
- The virtual-address section displays aggregate inventory only: total slots and currently available slots. It never exposes tenants, business names, contracts, or individual assignment data.
- Empty and failed API states remain useful: the public page stays visible, explains that live availability could not be loaded, and keeps the login action available.

## Architecture

- Extend the existing public inventory service with a home projection that combines public units with safe virtual-address counts.
- Add `GET /api/saraya/v1/public/home`; it has no authentication requirement and returns only the explicit public contract.
- Add a Flutter `PublicHomeRepository` and `PublicHomeScreen` feature. The screen owns only presentation state and calls the public endpoint through the existing API client.
- Replace the root `SessionGate` route with the public page. Session restoration starts without blocking the public page so `/login` and protected routes retain the existing authentication behavior.
- Keep `/dashboard`, `/units`, `/virtual-addresses`, and all management routes unchanged and protected.

## Security And Privacy

- Public data is allow-listed at the repository query level.
- Virtual-address output is limited to numeric totals grouped by safe availability status.
- Public unit output continues to require `vacant`, `isRentable`, `isPublicListing`, and an active property.
- No write operation is added to the public API.

## Verification

- Backend tests prove the response excludes private address assignment data and preserves unit pagination limits.
- Flutter repository tests prove public JSON parsing and error handling.
- Router tests prove `/` is visible while unauthenticated and `/dashboard` still redirects to `/login`.
- Widget tests cover Arabic RTL, English LTR, unit cards, virtual-address totals, empty state, error state, and login navigation.
- Run focused tests, full Saraya backend tests, Flutter analyze/tests, web build, static-bundle publication, DEV/PRODUCTION release, and live anonymous probes.
