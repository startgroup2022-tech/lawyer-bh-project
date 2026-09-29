import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { lawyerJson, readLawyerJson, rejectCrossOrigin } from "@/lib/booking/mobileLawyerHttp";
import {
  loadMobileLawyerProfile,
  parseLawyerProfileUpdate,
  saveLawyerProfile,
} from "@/lib/booking/mobileLawyerProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in lawyer's own profile. */
export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return lawyerJson({ ok: false, error: "unauthorized" }, 401);

  try {
    const profile = await loadMobileLawyerProfile(session.lawyerId);
    if (!profile) return lawyerJson({ ok: false, error: "not_found" }, 404);
    return lawyerJson({ ok: true, profile });
  } catch (error) {
    console.error("[mobile/lawyer/profile] load failed", error);
    return lawyerJson({ ok: false, error: "profile_unavailable" }, 503);
  }
}

/** Updates the signed-in lawyer's own profile. */
export async function PATCH(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const session = await getMobileLawyerSession(request);
  if (!session) return lawyerJson({ ok: false, error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await readLawyerJson(request);
  } catch {
    return lawyerJson({ ok: false, error: "invalid_input" }, 400);
  }

  const parsed = parseLawyerProfileUpdate(body);
  if (!parsed.ok) return lawyerJson({ ok: false, error: parsed.error }, 400);

  try {
    const profile = await saveLawyerProfile(session.lawyerId, parsed.update);
    if (!profile) return lawyerJson({ ok: false, error: "not_found" }, 404);
    return lawyerJson({ ok: true, profile });
  } catch (error) {
    console.error("[mobile/lawyer/profile] save failed", error);
    return lawyerJson({ ok: false, error: "profile_unavailable" }, 503);
  }
}
