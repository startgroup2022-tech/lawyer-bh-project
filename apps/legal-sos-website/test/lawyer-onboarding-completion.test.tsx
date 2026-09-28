import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LawyerRegistrationFlow } from "@/components/LawyerRegistrationFlow";

afterEach(cleanup);

describe("verified lawyer onboarding completion", () => {
  it("locks the verified Arabic name, email, and personal-license number", () => {
    render(
      <LawyerRegistrationFlow
        countryCode="BH"
        locale="ar"
        mode="onboarding"
        initialIdentity={{
          fullName: "أحمد الموثق",
          email: "verified@example.com",
          professionalIdentifier: "12345",
        }}
      />,
    );

    expect(screen.getByLabelText("الاسم الكامل بالعربية")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("البريد الإلكتروني")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("رقم رخصة المحاماة")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("الاسم الكامل بالإنجليزية")).not.toHaveAttribute(
      "readonly",
    );
    expect(screen.getByDisplayValue("verified@example.com")).toBeInTheDocument();
  });
});
