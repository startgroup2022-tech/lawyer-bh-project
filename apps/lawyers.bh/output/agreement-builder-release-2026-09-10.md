# Production release verified

- DEV: `682c1a6027c70eaf78e719c96ab074f78b985595`
- PRODUCTION: `f36b90e7e328cb2f657d123b6a3a5a05db0ea52c`
- Both remote refs verified. Production merge author/committer: omaralnadeem-max <omaralnadeem@gmail.com>.
- Fresh release checks: 20 agreement test files / 80 tests passed; TypeScript and whitespace checks passed.
- Vercel: `dpl_7VcvTjo2PjpXF5BpXD6mdB66s7Ja`, READY, aliases include www.lawyers.bh and lawyers.bh.
- Deployment URL: https://lawyers-puyefx307-gulf-international-collection-and-consulting.vercel.app
- Build logs identify PRODUCTION commit f36b90e; migration runner reported success at 2026-09-09T22:35:59.669Z; deployment completed at 22:37:31.449Z.
- Automatic Git deployment completed while a duplicate manual upload was still running. Manual upload was interrupted before creating another deployment.
- Live public agreement API: HTTP 200, ok=true, versionId=legacy unchanged from pre-release baseline.
- Live admin library API without login: HTTP 403 forbidden, confirming the new endpoint and access protection.
- Live admin agreement page: HTTP 307 to admin login with return path.
- Live /ar/join: HTTP 200.
- No agreement version was published or activated. Full authenticated production editor interaction was not repeated; local editor save/preview was verified in the preceding implementation turn.
