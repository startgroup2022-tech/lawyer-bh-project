// Next.js 16's instrumentation file — loaded once at server boot for
// each runtime (nodejs + edge). Selects the right Sentry init based
// on the runtime that's actually running.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors thrown by request handlers + server actions so they
// show up in Sentry with the right request context attached.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
