export function pickDatabaseUrl(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const value = new URL(candidate);
      if ((value.protocol === "postgres:" || value.protocol === "postgresql:") && value.hostname) {
        return candidate;
      }
    } catch {
      // Try the next configured Postgres integration variable.
    }
  }
  throw new Error("No valid PostgreSQL database URL is configured");
}
