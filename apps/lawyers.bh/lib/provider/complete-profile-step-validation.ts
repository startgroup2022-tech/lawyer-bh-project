import {
  getFirstJoinError,
  validateAllJoinSteps,
  validateJoinStep,
  type JoinFieldErrors,
  type JoinStep,
  type JoinValidationInput,
} from "@/lib/registration/join-step-validation";

export type CompleteProfileValidationInput = JoinValidationInput;
export type CompleteProfileFieldErrors = JoinFieldErrors;
export type CompleteProfileStep = JoinStep;
export type CompleteProfileLocale = "ar" | "en";

function registrationInput(
  input: CompleteProfileValidationInput,
): JoinValidationInput {
  return {
    ...input,
    subscriptionTypes: input.subscriptionTypes.map((value) =>
      value.toLowerCase() === "lawyer" ? "Lawyer" : value,
    ),
  };
}

export function validateCompleteProfileStep(
  input: CompleteProfileValidationInput,
  step: CompleteProfileStep,
  locale: CompleteProfileLocale,
): CompleteProfileFieldErrors {
  return validateJoinStep(registrationInput(input), step, locale);
}

export function validateAllCompleteProfileSteps(
  input: CompleteProfileValidationInput,
  locale: CompleteProfileLocale,
): CompleteProfileFieldErrors {
  return validateAllJoinSteps(registrationInput(input), locale);
}

export function getFirstCompleteProfileError(
  errors: CompleteProfileFieldErrors,
): { field: string; step: CompleteProfileStep } | null {
  return getFirstJoinError(errors);
}
