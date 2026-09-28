import Link from "next/link";

import type {
  AdminConversationSummary,
  AdminRequestSummary,
} from "@/lib/admin/account-detail";

type Props = {
  locale: string;
  conversations: AdminConversationSummary[];
  requests: AdminRequestSummary[];
};

function date(value: string | Date | null, locale: string) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale === "ar" ? "ar-BH" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bahrain",
      }).format(parsed);
}

export default function AccountActivitySections({ locale, conversations, requests }: Props) {
  const ar = locale === "ar";
  const card = "rounded-3xl border border-transparent bg-white transition hover:border-[#B4232A] focus-within:border-[#B4232A] p-5 shadow-[0_10px_28px_rgba(7,17,31,0.035)]";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={card}>
        <h2 className="text-xl font-black text-[#082B67]">{ar ? "المحادثات" : "Conversations"}</h2>
        <div className="mt-4 space-y-3">
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-500">{ar ? "لا توجد محادثات لهذا الحساب" : "No conversations for this account"}</p>
          ) : conversations.map((conversation) => (
            <article key={conversation.requestId} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold text-[#082B67]">{conversation.reference}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">{conversation.lastMessage || "—"}</p>
              <p className="mt-2 text-xs text-slate-500">{date(conversation.lastMessageAt, locale)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-[#082B67]">{ar ? "الطلبات" : "Requests"}</h2>
        <div className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">{ar ? "لا توجد طلبات لهذا الحساب" : "No requests for this account"}</p>
          ) : requests.map((request) => (
            <Link
              key={`${request.source}:${request.id}`}
              href={`/${locale}/admin/requests/${request.source}/${request.id}`}
              className="block rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-extrabold text-[#082B67]">{request.reference}</p>
                <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-bold text-[#082B67]">{request.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{date(request.createdAt, locale)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
