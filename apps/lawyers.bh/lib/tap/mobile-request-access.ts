import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const TOKEN_BYTES = 32;
const SHA256_HEX_LENGTH = 64;

export function digestMobileRequestAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createMobileRequestAccessToken(): {
  token: string;
  digest: string;
} {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  return {
    token,
    digest: digestMobileRequestAccessToken(token),
  };
}

export function verifyMobileRequestAccessToken(
  token: string,
  digest: string,
): boolean {
  if (
    !token ||
    !new RegExp(`^[0-9a-f]{${SHA256_HEX_LENGTH}}$`, "i").test(digest)
  ) {
    return false;
  }

  const actual = Buffer.from(digestMobileRequestAccessToken(token), "hex");
  const expected = Buffer.from(digest, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
