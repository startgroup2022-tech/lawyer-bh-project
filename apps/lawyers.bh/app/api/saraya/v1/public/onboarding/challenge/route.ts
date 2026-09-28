import { publicOnboardingHandlers } from "@/lib/saraya/public-onboarding/runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return publicOnboardingHandlers.challenge(request);
}
