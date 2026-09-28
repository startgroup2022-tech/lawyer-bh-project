type TapMobileCredentials = {
  secretKey: string;
  publicKey: string;
};

export function validateMobileSdkTestCredentials(
  credentials: TapMobileCredentials,
): string | null {
  if (
    !credentials.secretKey.startsWith("sk_test_") ||
    !credentials.publicKey.startsWith("pk_test_")
  ) {
    return "Tap mobile test credentials are required";
  }

  return null;
}
