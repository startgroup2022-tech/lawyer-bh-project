"use client";

import { useCallback, useEffect, useState } from "react";

import type { Dictionary, Locale } from "@/lib/i18n";
import type { LawyerRequestLists, LawyerSessionProfile } from "@/lib/lawyer-portal-types";

type Props = {
  locale: Locale;
  dictionary: Dictionary;
  lawyer: LawyerSessionProfile;
  onSignedOut: () => void;
};

function statusLabel(status: string, copy: Dictionary["portal"]["lawyerAuth"]) {
  if (status === "approved") return copy.approved;
  if (status === "pending" || status === "pending_review") return copy.pendingReview;
  if (status === "rejected") return copy.rejected;
  if (status === "suspended") return copy.suspended;
  return status;
}

export function LawyerWebDashboard({ locale, dictionary, lawyer, onSignedOut }: Props) {
  const copy = dictionary.portal.lawyerAuth;
  const [lists, setLists] = useState<LawyerRequestLists | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/lawyer-auth/requests", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as
        | { requests?: LawyerRequestLists }
        | null;
      if (response.status === 401) {
        onSignedOut();
        return;
      }
      if (!response.ok || !payload?.requests) {
        setError(copy.serviceUnavailable);
        return;
      }
      setLists(payload.requests);
    } catch {
      setError(copy.serviceUnavailable);
    } finally {
      setLoading(false);
    }
  }, [copy.serviceUnavailable, onSignedOut]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function signOut() {
    try {
      await fetch("/api/lawyer-auth/session", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      onSignedOut();
    }
  }

  const name = locale === "ar" ? lawyer.nameAr : lawyer.nameEn;
  const groups = [
    { title: copy.newOffers, items: lists?.newOffers ?? [] },
    { title: copy.activeCases, items: lists?.activeCases ?? [] },
    { title: copy.completedCases, items: lists?.completedCases ?? [] },
  ];

  return (
    <section className="lawyer-dashboard" aria-labelledby="lawyer-dashboard-title">
      <div className="lawyer-dashboard-header">
        <div>
          <h1 id="lawyer-dashboard-title">{copy.dashboardTitle}</h1>
          <p>{name}</p>
        </div>
        <button type="button" className="ghost-button" onClick={signOut}>{copy.signOut}</button>
      </div>
      <dl className="lawyer-dashboard-summary">
        <div><dt>{copy.accountStatus}</dt><dd>{statusLabel(lawyer.status, copy)}</dd></div>
        <div><dt>{copy.registrationNumber}</dt><dd>{lawyer.registrationNo}</dd></div>
        <div><dt>{copy.availability}</dt><dd>{lawyer.isAvailable ? copy.available : copy.unavailable}</dd></div>
        <div><dt>{copy.totalRequests}</dt><dd>{lawyer.totalRequests}</dd></div>
        <div><dt>{copy.completedRequests}</dt><dd>{lawyer.completedRequests}</dd></div>
        <div><dt>{copy.rating}</dt><dd>{lawyer.rating.toFixed(1)}</dd></div>
      </dl>
      <div className="lawyer-dashboard-actions">
        <button type="button" className="gold-button" onClick={() => void refresh()} disabled={loading}>{copy.refresh}</button>
      </div>
      {error ? (
        <div className="lawyer-dashboard-error">
          <p role="alert">{error}</p>
          <button type="button" className="ghost-button" onClick={() => void refresh()}>{copy.retry}</button>
        </div>
      ) : null}
      {loading && !lists ? <p role="status">{copy.loading}</p> : null}
      <div className="lawyer-request-groups">
        {groups.map((group) => (
          <section className="lawyer-request-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.length ? (
              <div className="lawyer-request-list">
                {group.items.map((item) => (
                  <article className="lawyer-request-card" key={item.id}>
                    <strong>{item.caseRef}</strong>
                    <span>{item.caseType}</span>
                    {"serviceStatus" in item && item.serviceStatus ? <span>{item.serviceStatus}</span> : null}
                  </article>
                ))}
              </div>
            ) : <p>{copy.empty}</p>}
          </section>
        ))}
      </div>
    </section>
  );
}
