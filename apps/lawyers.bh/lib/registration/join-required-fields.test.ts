import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  JOIN_REQUIRED_FIELDS,
  joinInvalidProps,
} from "./join-required-fields";
import { RequiredMark } from "../../app/[locale]/join/_components/RequiredMark";

describe("join required fields", () => {
  it("lists every required field under its wizard step", () => {
    expect(JOIN_REQUIRED_FIELDS).toEqual({
      1: ["subscriptionType", "experienceYears", "specialties"],
      2: [
        "profileImage",
        "fullNameAr",
        "fullNameEn",
        "email",
        "phone",
        "password",
        "confirmPassword",
        "language",
      ],
      3: [
        "licenseNumber",
        "licenseExpiryDate",
        "ibanNumber",
        "ibanCertificateFile",
        "workingHours",
        "licenseFile",
        "personalIdFile",
      ],
      4: ["agreed", "signatureDataUrl"],
    });
  });

  it("keeps institution fields optional", () => {
    expect(JOIN_REQUIRED_FIELDS[3]).not.toContain("crNumber");
    expect(JOIN_REQUIRED_FIELDS[3]).not.toContain(
      "institutionLicenseFile",
    );
  });

  it("connects an invalid control to its stable error description", () => {
    expect(joinInvalidProps("email", { email: "Invalid email" })).toEqual({
      "aria-invalid": true,
      "aria-describedby": "email-error",
    });
    expect(joinInvalidProps("email", {})).toEqual({
      "aria-invalid": false,
    });
  });

  it("localizes the required marker for screen readers", () => {
    expect(
      renderToStaticMarkup(createElement(RequiredMark, { locale: "ar" })),
    ).toContain(
      "حقل إلزامي",
    );
    expect(
      renderToStaticMarkup(createElement(RequiredMark, { locale: "en" })),
    ).toContain("Required");
  });

  it("integrates the approved identifier labels and stable field errors", () => {
    const content = readFileSync(
      resolve(process.cwd(), "app/[locale]/join/Content.tsx"),
      "utf8",
    );

    expect(content).toContain("رقم الرخصة / الرقم الشخصي");
    expect(content).toContain("License Number / Personal Number");
    expect(content).toContain('id={`${field}-error`}');
    expect(content).toContain("<RequiredMark locale=");
  });

  it("does not mark the optional institution labels as required", () => {
    const content = readFileSync(
      resolve(process.cwd(), "app/[locale]/join/Content.tsx"),
      "utf8",
    );

    expect(content).toContain(
      '{isAr ? "رقم السجل التجاري (اختياري)" : "CR Number (Optional)"}',
    );
    expect(content).toContain(
      '{isAr ? "رخصة المؤسسة (اختياري)" : "Institution License (Optional)"}',
    );
    expect(content).not.toMatch(
      /رقم السجل التجاري \(اختياري\)[\s\S]{0,100}<RequiredMark/,
    );
    expect(content).not.toMatch(
      /رخصة المؤسسة \(اختياري\)[\s\S]{0,100}<RequiredMark/,
    );
  });

  it("gives every required control a stable field target", () => {
    const content = readFileSync(
      resolve(process.cwd(), "app/[locale]/join/Content.tsx"),
      "utf8",
    );
    const requiredTargets = Object.values(JOIN_REQUIRED_FIELDS).flat();

    for (const field of requiredTargets) {
      expect(
        content.includes(`id="${field}"`) ||
          content.includes(`data-join-field="${field}"`),
        `${field} must have an id or data-join-field target`,
      ).toBe(true);
    }
  });

  it("associates every textual required label with its control", () => {
    const content = readFileSync(
      resolve(process.cwd(), "app/[locale]/join/Content.tsx"),
      "utf8",
    );
    const labeledControls = [
      "experienceYears",
      "registrationLevel",
      "profileImage",
      "fullNameAr",
      "fullNameEn",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "language",
      "licenseNumber",
      "licenseExpiryDate",
      "ibanNumber",
      "ibanCertificateFile",
      "workingHours",
      "licenseFile",
      "personalIdFile",
    ];

    for (const field of labeledControls) {
      expect(content, `${field} must have an associated label`).toContain(
        `htmlFor="${field}"`,
      );
    }
  });
});
