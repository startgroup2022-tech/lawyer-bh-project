export type TapMode = "test" | "live";

function configuredTapPublicKeys(): string[] {
  return [
    process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY,
    process.env.TAP_IOS_PUBLIC_KEY,
    process.env.TAP_ANDROID_PUBLIC_KEY,
  ]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

export function resolveTapHashPublicKey(
  requestedPublicKey: unknown,
  mode: TapMode,
): string {
  const configuredKeys = configuredTapPublicKeys();
  const fallbackKey = process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY?.trim() ?? "";
  const requestedKey =
    typeof requestedPublicKey === "string" ? requestedPublicKey.trim() : "";
  const publicKey = requestedKey || fallbackKey;

  if (!configuredKeys.includes(publicKey)) {
    throw new Error("Tap public key is not configured for this application");
  }

  const expectedPrefix = mode === "live" ? "pk_live_" : "pk_test_";

  if (!publicKey.startsWith(expectedPrefix)) {
    throw new Error("Tap public key mode does not match the server mode");
  }

  return publicKey;
}
