const androidPackage = "bh.lawyers.saraya_square_app";
const appleBundle = "bh.lawyers.sarayaSquareApp";
const rentalPath = "/saraya/rental-requests/*";

type AssociationEnvironment = Partial<Record<"SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS" | "SARAYA_APPLE_TEAM_ID", string | undefined>>;
const json = (value: unknown) => Response.json(value, { headers: { "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
const deploymentEnvironment = (): AssociationEnvironment => ({
  SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS: process.env.SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS,
  SARAYA_APPLE_TEAM_ID: process.env.SARAYA_APPLE_TEAM_ID,
});

export async function assetLinksResponse(environment: AssociationEnvironment = deploymentEnvironment()) {
  const fingerprints = environment.SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  return json(fingerprints.length === 0 ? [] : [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: androidPackage, sha256_cert_fingerprints: fingerprints },
  }]);
}

export async function appleAssociationResponse(environment: AssociationEnvironment = deploymentEnvironment()) {
  const teamId = environment.SARAYA_APPLE_TEAM_ID?.trim();
  return json({ applinks: { apps: [], details: teamId ? [{ appID: `${teamId}.${appleBundle}`, paths: [rentalPath] }] : [] } });
}

export function paymentReturnFallback(requestId: string, requestUrl: string) {
  return Response.redirect(`${new URL(requestUrl).origin}/saraya/index.html#/rental-requests/${encodeURIComponent(requestId)}`, 307);
}
