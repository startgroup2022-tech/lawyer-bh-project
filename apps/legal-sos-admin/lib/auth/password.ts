// Bcrypt wrappers. Centralised so the work factor + algorithm choice is
// audited in one place. Cost 12 ≈ 250 ms on commodity hardware — sweet
// spot between login UX and brute-force resistance.

import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  // bcrypt.compare is timing-safe.
  return bcrypt.compare(plain, hash);
}
