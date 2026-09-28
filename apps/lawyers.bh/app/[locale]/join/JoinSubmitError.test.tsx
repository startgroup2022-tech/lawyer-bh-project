import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JoinSubmitError } from "./JoinSubmitError";

describe("registration submission error", () => {
  it("renders the supplied error once without a duplicate heading", () => {
    const html = renderToStaticMarkup(
      <JoinSubmitError message="تعذر إرسال الطلب. حاول مرة أخرى." />,
    );
    expect(html.match(/تعذر إرسال الطلب/g)).toHaveLength(1);
    expect(html).toContain('role="alert"');
  });
});
