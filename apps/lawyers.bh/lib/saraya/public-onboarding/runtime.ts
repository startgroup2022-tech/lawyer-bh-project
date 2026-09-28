import { ApiError } from "../auth/contracts";
import { hashPassword } from "../auth/passwords";
import { createSarayaSessions } from "../auth/runtime";
import { createPublicOnboardingDelivery } from "./delivery";
import { createPublicOnboardingHandlers } from "./http";
import { publicOnboardingRepository } from "./repository";
import { createPublicOnboardingService } from "./service";

function otpSecret() {
  const value = process.env.SARAYA_PUBLIC_OTP_SECRET
    ?? process.env.SARAYA_ACCESS_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new ApiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "خدمة التحقق غير مهيأة",
      "Verification service is not configured",
    );
  }
  return value;
}

function service() {
  return createPublicOnboardingService({
    repository: publicOnboardingRepository,
    delivery: createPublicOnboardingDelivery(),
    createSession: (userId, context) => createSarayaSessions(context).create(userId),
    hashPassword,
    otpSecret: otpSecret(),
  });
}

export const publicOnboardingHandlers = {
  challenge(request: Request) {
    return createPublicOnboardingHandlers(service()).challenge(request);
  },
  verify(request: Request) {
    return createPublicOnboardingHandlers(service()).verify(request);
  },
};
