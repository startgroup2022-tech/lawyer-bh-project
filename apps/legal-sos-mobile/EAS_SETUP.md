# EAS Build setup — Legal SOS Mobile

This is the one-time + per-account setup needed to actually fire builds against the staged `eas.json`. The config itself is ready to go; this doc tracks the credentials + account steps that have to happen outside the repo.

---

## 1. Expo account (free — required before anything else)

```bash
cd apps/legal-sos-mobile
npx eas login              # Sign in (or create) an Expo account
npx eas init               # Creates EAS project, returns a project ID
```

After `eas init`, **paste the printed Project ID** back to me. I'll swap these three placeholders in `app.json`:

| Field | Where | Looks like |
|---|---|---|
| `expo.owner` | `app.json` line ~13 | your-username |
| `expo.updates.url` | `app.json` line ~17 | `https://u.expo.dev/<UUID>` |
| `expo.extra.eas.projectId` | `app.json` line ~22 | `<UUID>` |

EAS plan: Free covers 30 builds/month — fine for closed beta. Production ($99/mo) gives priority queue + concurrent builds — pick that once we're submitting weekly.

---

## 2. Apple Developer Program ($99/year)

Required for **all** iOS distribution paths: TestFlight, App Store, even physical device testing beyond the free 7-day cert.

### Steps
1. Enroll at developer.apple.com/programs (15 min for individual; 2–14 days for organization with D-U-N-S)
2. **Choose org type:**
   - **Individual** — fast, but seller name on App Store = your personal name
   - **Organization** (recommended for a legal services app) — requires D-U-N-S + Bahrain CR docs; takes longer but App Store reviewers are friendlier
3. Once approved, hand me:
   - **Apple ID** (the email you enrolled with)
   - **Team ID** (Membership → 10-character ID)
4. **Create the App Store Connect record** at appstoreconnect.apple.com → My Apps → +
   - Bundle ID: `bh.lawyers.legalsos` (must match `app.json`)
   - Hand me the **ASC App ID** (numeric, shown in URL when viewing the app)

### EAS credentials
EAS Build manages your iOS signing certs + provisioning profiles automatically. First build with `eas build --profile preview --platform ios` walks through it interactively:
- Sign in with your Apple ID
- Pick / generate distribution cert
- Pick / generate provisioning profile

This is one-time. Subsequent builds just reuse.

### Submit profile placeholders
Swap the three `PLACEHOLDER_*` fields in `eas.json` under `submit.production.ios`:
- `appleId` — your Apple ID email
- `ascAppId` — the App Store Connect app ID (numeric)
- `appleTeamId` — the 10-char Team ID

---

## 3. Google Play Console ($25 one-time)

### Steps
1. Sign up at play.google.com/console with a Google account
2. Pay the $25 one-time fee (credit card)
3. **Create the app:**
   - Default language: English (US)
   - App name: Legal SOS
   - App type: App (not game)
   - Free or paid: Free
4. **Reserve the package name** `bh.lawyers.legalsos` (it's already in `app.json` so this should match)

### EAS credentials
Play requires a Google Service Account JSON for `eas submit` automation. Steps:
1. Create a Service Account at console.cloud.google.com → IAM → Service Accounts → Create
2. Grant role `Service Account User`
3. Generate a JSON key → download
4. In Play Console → Setup → API access → grant the service account `Release Manager` role on this app
5. Save the JSON to `apps/legal-sos-mobile/secrets/play-service-account.json` (gitignored)

This file is referenced from `eas.json` under `submit.production.android.serviceAccountKeyPath`.

---

## 4. Vendor env vars (already set locally — need to push to EAS)

Mobile app reads these from `EXPO_PUBLIC_*` vars at build time. They need to live in EAS Build's secret store so cloud builds pick them up:

```bash
# Set each EXPO_PUBLIC_* secret via:
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://admin.legalsos.lawyer"
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://06456f66...@o4511459400089600.ingest.de.sentry.io/4511459408150608"
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_KEY --value "phc_BrMJCLzcSXHTbNhKanbY4JTzn7madVZNEZZb5nqTxtEA"
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_HOST --value "https://eu.i.posthog.com"
eas secret:create --scope project --name EXPO_PUBLIC_PUSHER_KEY --value "c107bf66dcae01d3cc56"
eas secret:create --scope project --name EXPO_PUBLIC_PUSHER_CLUSTER --value "ap2"
```

Run these after `eas login`. The values will land in your EAS project and override `.env` at build time.

---

## 5. First build — what to run

Once everything above is in place:

```bash
# Internal dev build for iPhone (Apple Dev account required)
npm run build:dev

# OR for the iOS Simulator (no Apple Dev account needed — useful first test)
npm run build:dev-sim

# Once you have a working dev build:
npx expo start --dev-client    # Metro hot-reload into the dev client app
```

Build takes ~10–15 min on the free EAS tier. You'll get a notification when ready + a QR/link to install on the device.

---

## 6. Going to production

```bash
# 1. Bump version in app.json (or use --auto-increment via EAS remote versioning)
# 2. Build for both platforms
npm run build:prod

# 3. Submit (once both store accounts are set up)
npm run submit:ios       # → TestFlight first, then promote to App Store
npm run submit:android   # → Play Internal Testing first, then promote

# 4. Over-the-air JS updates (skip the store for non-native changes)
npm run update:prod
```
