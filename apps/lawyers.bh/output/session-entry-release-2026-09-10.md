# Session entry release

- DEV: ac7c1eb64d5bedcca75e05c0542197af416d4292
- PRODUCTION: 5ed9925d68ef076a5668c07b28c17fe02f069dd7
- Remote refs verified; Omar author/committer used. Existing published LegalSOS update retained.
- Fresh tests: 8 files / 36 tests passed; TypeScript and whitespace checks passed.
- Automatic Git production deployment: dpl_8F5uttDruZFkhdgLporHgRTsFFb2, READY.
- URL: https://lawyers-m1cw7nyz5-gulf-international-collection-and-consulting.vercel.app
- www.lawyers.bh inspection resolves to that deployment and confirms production aliases.
- Live Arabic login, admin login, provider login and join all returned HTTP 200 with deliberately invalid test cookies; no server crash.
- Valid-session redirect behavior is covered by local signed-token/account tests; no real user's authenticated production session was used.
- Cookie lifetimes unchanged; no new database migration.
- Build completed successfully; existing Turbo warnings for unrelated mobile/maps environment variables were reported and not changed in this release.
