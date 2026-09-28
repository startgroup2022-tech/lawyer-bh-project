"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Siren, Loader2, Lock } from "lucide-react";

export default function LoginForm({
  next,
  hadError,
}: {
  next: string | null;
  hadError: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    hadError ? "Sign-in failed. Check your credentials." : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/sos/dispatch/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Wrong username or password.");
        } else {
          setError(`Sign-in failed (HTTP ${res.status}).`);
        }
        return;
      }
      const target =
        next && next.startsWith("/") ? next : `/${locale}/sos/dispatch`;
      router.push(target);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-light pb-12">
      <div className="bg-gradient-to-r from-[#1A237E] via-[#0D1660] to-[#D32F2F] text-white">
        <div className="max-w-lg mx-auto px-5 py-12">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D32F2F]">
              <Siren size={20} />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Saudi Lawyers · Dispatch
              </div>
              <h1 className="text-xl font-extrabold leading-tight">
                Operator sign-in
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/85 leading-relaxed">
            Sign in with your dispatch credentials to manage emergency
            cases.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4">
        <form
          onSubmit={submit}
          className="rounded-2xl bg-white p-5 shadow-md border border-gray-100 space-y-3"
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Username
            </span>
            <input
              type="text"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1A237E] focus:outline-none"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1A237E] focus:outline-none"
            />
          </label>
          {error && (
            <div className="rounded-lg border border-[#D32F2F]/30 bg-[#D32F2F]/[0.06] p-2 text-[12px] text-[#D32F2F]">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A237E] py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Lock size={14} />
            )}
            Sign in
          </button>
          <p className="text-center text-[10px] text-text-muted leading-relaxed">
            Each operator's actions are recorded in the case audit log.
          </p>
        </form>
      </div>
    </div>
  );
}
