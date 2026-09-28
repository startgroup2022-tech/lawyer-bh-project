export type LawyerRegistrationMode = "web" | "emergency-mobile";

type ProfessionalProfileInput = {
  mode: LawyerRegistrationMode;
  requiresRegistrationLevel: boolean;
  registrationLevel: string;
  workingHours: string;
  specialtyMain: string;
  specialtySubs: string[];
};

type ProfessionalProfile = {
  registrationLevel: string | null;
  workingHours: string | null;
  specialtyMain: string | null;
  specialtySubs: string[];
  specialties: {
    main: string | null;
    subs: string[];
  };
};

type ProfessionalProfileResult =
  | { ok: true; profile: ProfessionalProfile }
  | { ok: false; error: string };

const allowedWorkingHours = new Set([
  "09:00-13:00",
  "13:00-17:00",
  "09:00-17:00",
]);

const allowedSpecialties = new Set([
  "administrative",
  "civil",
  "commercial",
  "labor",
  "criminal",
  "sharia",
  "constitutional",
  "cassation",
  "sports",
]);

export function resolveLawyerProfessionalProfile(
  input: ProfessionalProfileInput,
): ProfessionalProfileResult {
  if (input.mode === "emergency-mobile") {
    return {
      ok: true,
      profile: {
        registrationLevel: null,
        workingHours: null,
        specialtyMain: null,
        specialtySubs: [],
        specialties: { main: null, subs: [] },
      },
    };
  }

  if (!input.workingHours) {
    return { ok: false, error: "Missing required fields" };
  }

  if (input.requiresRegistrationLevel && !input.registrationLevel) {
    return { ok: false, error: "Registration level is required" };
  }

  if (!allowedWorkingHours.has(input.workingHours)) {
    return { ok: false, error: "Invalid working hours" };
  }

  if (
    !allowedSpecialties.has(input.specialtyMain) ||
    input.specialtySubs.length !== 2
  ) {
    return {
      ok: false,
      error: "Main specialty and exactly two sub-specialties are required",
    };
  }

  return {
    ok: true,
    profile: {
      registrationLevel: input.requiresRegistrationLevel
        ? input.registrationLevel
        : null,
      workingHours: input.workingHours,
      specialtyMain: input.specialtyMain,
      specialtySubs: input.specialtySubs,
      specialties: {
        main: input.specialtyMain,
        subs: input.specialtySubs,
      },
    },
  };
}
