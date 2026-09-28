// One-off: provision the R2 bucket. Idempotent — safe to re-run.
//
//   npm run r2:bootstrap

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv(); // fall back to .env if .env.local doesn't exist
import { ensureBucket, r2Bucket, r2Endpoint, isR2Configured } from "../lib/r2";

async function main() {
  if (!isR2Configured()) {
    console.error(
      "[r2-bootstrap] R2 creds missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local",
    );
    process.exit(1);
  }
  console.log(`[r2-bootstrap] endpoint = ${r2Endpoint()}`);
  console.log(`[r2-bootstrap] bucket   = ${r2Bucket()}`);
  const { created } = await ensureBucket();
  console.log(
    created
      ? `[r2-bootstrap] Created bucket "${r2Bucket()}".`
      : `[r2-bootstrap] Bucket "${r2Bucket()}" already exists — no changes.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[r2-bootstrap] failed:", err);
  process.exit(1);
});
