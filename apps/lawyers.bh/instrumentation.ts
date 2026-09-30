import "server-only";

/**
 * Runs once when a server process starts. Loads admin-managed Tap credentials
 * from the database into the synchronous Tap config so payments use the
 * dashboard configuration when present and the environment variables
 * otherwise. Failures are swallowed: a database that is not ready yet must not
 * stop the server from booting.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureTapConfig } = await import("@/lib/tap/hydrate");
    await ensureTapConfig();
  } catch {
    // A missing database or unapplied migration must not stop the server from
    // booting; the Tap routes fall back to environment credentials.
  }
}
