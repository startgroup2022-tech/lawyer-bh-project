import { sql, type SQLWrapper } from "drizzle-orm";

export function confirmedProviderPaymentSql(
  paymentStatus: SQLWrapper,
  tapStatus: SQLWrapper,
) {
  return sql`lower(trim(coalesce(${paymentStatus}::text, ''))) IN ('paid', 'success') AND upper(trim(coalesce(${tapStatus}::text, ''))) = 'CAPTURED'`;
}
