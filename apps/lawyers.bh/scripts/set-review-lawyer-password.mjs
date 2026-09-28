import bcrypt from "bcryptjs";
import postgres from "postgres";
import { pathToFileURL } from "node:url";

export function beginSerializableTransaction(sql, operation) {
  return sql.begin("isolation level serializable", operation);
}

export async function setReviewLawyerPassword({ email, password, hash, transaction, log }) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("REVIEW_LAWYER_EMAIL and REVIEW_LAWYER_PASSWORD are required");
  }

  const passwordHash = await hash(password, 12);
  await transaction(async ({ findFlaggedIds, updateById }) => {
    const matchingIds = await findFlaggedIds(normalizedEmail);
    if (matchingIds.length !== 1) {
      throw new Error("Expected to update exactly one flagged review lawyer");
    }

    const updatedCount = await updateById(matchingIds[0], passwordHash);
    if (updatedCount !== 1) {
      throw new Error("Expected to update exactly one flagged review lawyer");
    }
  });
  log(`Review lawyer password updated for ${normalizedEmail}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  const sql = postgres(connectionString, { max: 1 });
  try {
    await setReviewLawyerPassword({
      email: process.env.REVIEW_LAWYER_EMAIL,
      password: process.env.REVIEW_LAWYER_PASSWORD,
      hash: bcrypt.hash,
      transaction: (operation) => beginSerializableTransaction(sql, async (transactionSql) => operation({
        findFlaggedIds: async (email) => {
          const rows = await transactionSql`
            SELECT id
            FROM public.bahrain_lawyers
            WHERE lower(trim(email)) = ${email}
              AND is_review_account = true
            FOR UPDATE
          `;
          return rows.map((row) => row.id);
        },
        updateById: async (id, passwordHash) => {
          const rows = await transactionSql`
            UPDATE public.bahrain_lawyers
            SET password_hash = ${passwordHash}, updated_at = NOW()
            WHERE id = ${id}
              AND is_review_account = true
            RETURNING id
          `;
          return rows.length;
        },
      })),
      log: console.log,
    });
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Review password update failed");
    process.exitCode = 1;
  });
}
