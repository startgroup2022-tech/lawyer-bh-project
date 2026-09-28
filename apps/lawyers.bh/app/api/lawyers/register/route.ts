import { POST as registerLawyer } from "../../mobile/lawyers/register/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compatibility endpoint for older Flutter builds.
export async function POST(request: Request) {
  return registerLawyer(request);
}
