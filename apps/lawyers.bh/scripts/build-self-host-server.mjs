// Builds the self-hosted entry points:
//
//   server.mjs                          — HTTP server + WebSocket upgrade routing
//   build/self-host/socket-runtime.mjs  — the bundled socket runtime that
//                                         server.mjs imports at runtime
//
// Run after `next build`:  node scripts/build-self-host-server.mjs
//
// The runtime bundle is emitted outside `lib/` on purpose: Vite resolves `.mjs`
// before `.ts`, so a built `lib/communications/socket-runtime.mjs` would shadow
// the TypeScript source and break the unit tests that import it.
//
// Only `next` and `ws` stay external (real runtime packages); everything else
// the socket runtime imports — including the `@/lib/db/client` alias — is
// inlined so no path aliases or Next-only `server-only` markers are needed at
// runtime.

import { build } from "esbuild";

// `server-only` is a Next.js build-time marker (not a real dependency on disk),
// so it must be stubbed for a standalone bundle.
const stubServerOnly = {
  name: "stub-server-only",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^server-only$/ }, () => ({
      path: "server-only",
      namespace: "stub-server-only",
    }));
    pluginBuild.onLoad({ filter: /.*/, namespace: "stub-server-only" }, () => ({
      contents: "",
      loader: "js",
    }));
  },
};

const alias = { "@": "." };
const runtimeSpecifier = "./build/self-host/socket-runtime.mjs";
const appointmentRuntimeSpecifier = "./build/self-host/appointment-socket-runtime.mjs";
const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // `next` and `ws` are real runtime packages; the socket runtimes are emitted
  // as their own files and resolved dynamically at runtime, so keep them
  // external too.
  external: ["next", "ws", runtimeSpecifier, appointmentRuntimeSpecifier],
  alias,
  plugins: [stubServerOnly],
  logLevel: "info",
};

await build({
  ...shared,
  entryPoints: ["scripts/self-host-server.mjs"],
  outfile: "server.mjs",
});

await build({
  ...shared,
  entryPoints: ["lib/communications/socket-runtime.ts"],
  outfile: "build/self-host/socket-runtime.mjs",
});

await build({
  ...shared,
  entryPoints: ["lib/appointment-communications/socket-runtime.ts"],
  outfile: "build/self-host/appointment-socket-runtime.mjs",
});
