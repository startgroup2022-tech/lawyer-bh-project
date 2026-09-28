import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "@/components/Hero";
import { SiteProvider, useSite } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

function SosStateObserver() {
  return (
    <output aria-label="SOS dialog state">
      {useSite().sosOpen ? "open" : "closed"}
    </output>
  );
}

describe("Hero SOS orb", () => {
  it("renders four decorative pulse rings without breaking the SOS action", () => {
    const dictionary = getDictionary("en");
    const { container } = render(
      <SiteProvider initialCountries={[testBahrain]}>
        <Hero locale="en" dictionary={dictionary} />
        <SosStateObserver />
      </SiteProvider>,
    );

    const button = container.querySelector<HTMLButtonElement>(
      ".sos-orb",
    );
    expect(button).toHaveAccessibleName(dictionary.hero.sos);
    expect(button).toHaveTextContent(/^SOS$/);
    expect(button).not.toHaveTextContent("Bahrain");
    expect(
      container.querySelectorAll(".sos-pulse-ring[aria-hidden='true']"),
    ).toHaveLength(4);
    expect(screen.getByLabelText("SOS dialog state")).toHaveTextContent(
      "closed",
    );

    fireEvent.click(button!);

    expect(screen.getByLabelText("SOS dialog state")).toHaveTextContent(
      "open",
    );
  });
});
