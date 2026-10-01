// Drizzle's postgres-js driver replaces the client's json serializer with an
// identity function, so `sqlClient.json(value)` throws ERR_INVALID_ARG_TYPE
// before the query is sent. Serializing to a string lets PostgreSQL parse it
// into the target json/jsonb column, matching the previous wire format.
export function toSqlJson(value: unknown): string {
  return JSON.stringify(value);
}
