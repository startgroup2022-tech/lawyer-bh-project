# GICC Sites 

Turborepo hosting the three Azinove-managed web properties for the Kingdom of Bahrain.

## Apps

| App | Port (dev) | Purpose |
|---|---|---|
| `apps/lawyers.bh` | 3000 | Legal services + directory + booking + legal tools |
| `apps/altujar.bh` | 3001 | Bahrain company creation landing |
| `apps/ejari.bh`   | 3002 | Smart rental management landing |

## Scripts

```bash
pnpm install               # install workspace dependencies
pnpm dev                   # turbo dev — all 3 apps in parallel
pnpm build                 # turbo build — all 3 apps

pnpm dev:lawyers           # single app
pnpm dev:altujar
pnpm dev:ejari

pnpm build:lawyers
pnpm build:altujar
pnpm build:ejari
```

## Vercel deployment

Each app is its own Vercel project (3 projects, 3 domains). On Vercel:

1. **Project Settings → General → Root Directory** set to `apps/lawyers.bh` (etc).
2. **Framework Preset**: Next.js (auto-detected).
3. **Install Command**: leave default — pnpm workspaces are detected via `pnpm-workspace.yaml` at repo root.
4. Map production domain per project (`lawyers.bh`, `altujar.bh`, `ejari.bh`).

## Workspaces structure

```
/
├── apps/
│   ├── lawyers.bh/
│   ├── altujar.bh/
│   └── ejari.bh/
├── packages/           (reserved for future shared UI / config)
├── package.json        (workspace root)
├── pnpm-workspace.yaml
└── turbo.json
```
