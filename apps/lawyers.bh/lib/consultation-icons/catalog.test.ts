import { CircleHelp, Phone, Video } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  CONSULTATION_ICON_KEYS,
  getConsultationIcon,
  getConsultationIconLabel,
  isConsultationIconKey,
} from "./catalog";

describe("consultation icon catalogue", () => {
  it("resolves allowed keys to their actual icon and localized label", () => {
    expect(getConsultationIcon("phone")).toBe(Phone);
    expect(getConsultationIcon("video")).toBe(Video);
    expect(getConsultationIconLabel("video", "ar")).toBe("فيديو");
    expect(CONSULTATION_ICON_KEYS).toContain("scale");
  });

  it("uses a safe fallback for legacy reads and rejects unknown writes", () => {
    expect(getConsultationIcon("legacy-icon")).toBe(CircleHelp);
    expect(isConsultationIconKey("legacy-icon")).toBe(false);
    expect(isConsultationIconKey("message-circle")).toBe(true);
  });
});
