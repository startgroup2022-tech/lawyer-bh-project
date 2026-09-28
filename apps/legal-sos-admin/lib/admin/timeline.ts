import type { MockCase } from "@/lib/mockData";

export interface TimelineItem {
  time: string;
  label: string;
  desc?: string;
  kind?: "done" | "live" | "fail" | "";
  meta?: string;
}

/** Build the case lifecycle timeline shown in the peek panel.
 *  Ported from the legalsos design bundle (admin/app.jsx buildTimeline). */
export function buildTimeline(c: MockCase): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      time: "09:38",
      label: "Case created",
      desc: `Client tapped SOS · consent recorded · payment authorized BHD ${c.fee}`,
      kind: "done",
    },
    {
      time: "09:38",
      label: "Dispatch broadcast",
      desc: "Routed to 3 lawyers within 25km radius · accept timeout 45s",
      kind: "done",
    },
  ];

  if (c.status !== "draft") {
    items.push({
      time: "09:40",
      label: `${c.lawyer} accepted`,
      desc:
        c.status === "mobilizing"
          ? `ETA ${c.etaMin} min · Live GPS tracking enabled`
          : "Live consultation started",
      kind: c.status === "mobilizing" ? "live" : "done",
      meta: c.lawyer === "—" ? "" : "+2:14",
    });
  }
  if (c.status === "live") {
    items.push({
      time: "09:42",
      label: "Call in progress",
      desc: "Encrypted EN/AR audio · 15-min window",
      kind: "live",
    });
  }
  if (c.status === "completed") {
    items.push({
      time: "09:45",
      label: "Lawyer arrived on-site",
      desc: "GPS confirm · client interaction begins",
      kind: "done",
    });
    items.push({
      time: "10:12",
      label: "Case completed",
      desc: "Closed by lawyer · rating 5/5 submitted",
      kind: "done",
    });
  }
  if (c.status === "disputed") {
    items.push({ time: "09:45", label: "Lawyer arrived on-site", kind: "done" });
    items.push({
      time: "11:02",
      label: "Client filed dispute",
      desc: "Reason: incomplete service · refund requested",
      kind: "fail",
    });
  }
  if (c.status === "refunded") {
    items.push({
      time: "09:43",
      label: "5-minute SLA breach",
      desc: "No lawyer accepted · auto-refund triggered",
      kind: "fail",
    });
    items.push({ time: "09:43", label: "BHD 25 refunded to client", kind: "done" });
  }
  return items;
}
