// Shared helper used by every legal-tool calculator that accepts a date input.
// Returns `null` for empty or unparseable values so the caller can guard on it
// without sprinkling `try/catch` everywhere.
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}
