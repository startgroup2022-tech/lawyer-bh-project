import Link from "next/link";
import { Buildings, SignIn } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary, Locale } from "@/lib/i18n";

export function AdminAccessPortal({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  return (
    <main className="portal-page">
      <section className="container portal-access-page" aria-labelledby="admin-access-title">
        <Link className="portal-back-link" href={`/${locale}/portal`}>{dictionary.portal.gateway.back}</Link>
        <div className="portal-access-card">
          <Buildings size={38} aria-hidden="true" />
          <h1 id="admin-access-title">{dictionary.portal.gateway.adminTitle}</h1>
          <p>{dictionary.portal.gateway.adminDescription}</p>
          <a className="gold-button" href={`https://www.lawyers.bh/${locale}/login/admin`}>
            <SignIn size={19} aria-hidden="true" />{dictionary.portal.gateway.adminSignIn}
          </a>
        </div>
      </section>
    </main>
  );
}
