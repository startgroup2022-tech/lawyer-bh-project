<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Drizzle migrations

`node scripts/run-migrations.mjs` runs `drizzle/meta/_journal.json` **in array
order, all inside one transaction**, and skips any entry whose `when` is not
greater than the last applied migration. Three traps make a from-zero build fail:

1. **Every `drizzle/*.sql` file must have a journal entry.** Files on disk that
   are absent from `_journal.json` are silently never applied. Some files must
   stay unjournaled because a later migration supersedes them (e.g.
   `0022_dapper_arachne` re-creates tables already created by
   `0019_multi_country_table_provisioning`). `when` values must stay strictly
   increasing; `idx` must stay contiguous for `drizzle-kit generate`.
2. **No migration may contain a top-level `BEGIN;`/`COMMIT;`/`ROLLBACK;`.** The
   runner already wraps everything in a transaction; a stray `COMMIT` ends it,
   so later statements that need a transaction fail (`25P01 LOCK TABLE can only
   be used in transaction blocks`). `BEGIN`/`END` inside a `DO $$ ... $$` block
   are fine.
3. **Never `ALTER TYPE ... ADD VALUE` and then use that value later in the same
   chain.** PostgreSQL rejects it (`55P04 unsafe use of new value ... New enum
   values must be committed before they can be used`). Declare new enum values in
   the original `CREATE TYPE`; keep the `ADD VALUE IF NOT EXISTS` line as a
   no-op.

Editing an already-journaled migration is safe for production because the max
`when` does not change: an existing database applies nothing new and never
re-runs it. Verify a fix on a throwaway database before deploying.

# Communication WebSocket on self-hosted servers

The call-signaling socket lives at `/api/mobile/communications/ws`. Its route
handler uses `experimental_upgradeWebSocket` from `@vercel/functions`, which
only exists on a runtime that performs the HTTP upgrade for the function. A
plain `next start` server does **not**: Next's router-server upgrade handler
matches the app route, hits `if (matchedOutput) return socket.end();`, and the
route handler never runs. The socket therefore closes with no handshake.

Self-hosted deployments must use the bundled server instead:

```
npm run build            # next build
npm run build:self-host  # emits ./server.mjs and ./build/self-host/socket-runtime.mjs
npm run start:self-host  # node server.mjs
```

`server.mjs` runs Next's request handler and takes over only the socket path's
`upgrade` events; `scripts/self-host-server.mjs` is the source and
`scripts/build-self-host-server.mjs` (esbuild) bundles it. Both transports share
`lib/communications/socket-runtime.ts`, so authentication, signal replay and
call verification are identical. The runtime bundle is emitted outside `lib/`
on purpose: Vite resolves `.mjs` before `.ts`, so a `lib/.../socket-runtime.mjs`
would shadow the source and break its unit tests.

Realtime delivery is Postgres `LISTEN/NOTIFY` (see
`lib/communications/postgres-event-bridge.ts`) plus an in-process hub; chat
itself is REST + push and does not need the socket.

# Admin-managed Tap credentials

`tap_gateway_settings` (migration `0131`) is a single-row table (`id boolean
PRIMARY KEY DEFAULT true`, always `true`) holding TEST and LIVE Tap credentials
so an administrator can switch environments without editing environment
variables. Secret keys are stored AES-256-GCM encrypted, key derived with
scrypt from `TAP_CONFIG_ENCRYPTION_KEY` (>= 16 chars; when unset the dashboard
cannot save secrets and the `TAP_*` variables stay the source of truth).

- Admin API `GET/PATCH/POST /api/admin/tap-settings` — `requireSuperAdmin()` +
  the usual `origin === new URL(request.url).origin` check + `Cache-Control:
  no-store`. `POST` probes the Tap API to verify a key; `PATCH` only writes the
  fields supplied.
- The DB check `tap_gateway_settings_live_requires_enable` forbids
  `active_environment = 'live'` unless `live_enabled`, so a partial TEST setup
  can never take real payments.
- Stored credentials are hydrated into the existing synchronous Tap accessors
  (`lib/tap/config.ts`) at boot via `instrumentation.ts` and after every save,
  so all current callers are unchanged and the environment remains the fallback.
  The hydrated override is kept on `globalThis` (a `Symbol.for` key), not in a
  module-level binding: the instrumentation hook and the route handlers are
  bundled into different chunks, and a module-level binding would leave each
  chunk with its own empty copy, so admin-managed credentials would silently
  never take effect in a production build.
- UI: `/admin/tap-payments` (`page.tsx` + `TapPaymentsContent.tsx`), registered
  as a `superOnly` dashboard card. It only ever sees masked secrets.

