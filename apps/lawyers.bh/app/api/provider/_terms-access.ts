import { NextResponse } from "next/server";
import {
  assertLawyerRequestAccess,
  TermsAcceptanceRequiredError,
} from "@/lib/terms-management/acceptance";

export async function requireLawyerTermsForRequests(lawyerId: string) {
  try {
    await assertLawyerRequestAccess(lawyerId);
    return null;
  } catch (error) {
    if (!(error instanceof TermsAcceptanceRequiredError)) throw error;
    return NextResponse.json(
      {
        ok: false,
        error: "terms_acceptance_required",
        code: "TERMS_ACCEPTANCE_REQUIRED",
        versionId: error.versionId,
        redirectTo: "/provider-dashboard/terms",
      },
      { status: 403 },
    );
  }
}
