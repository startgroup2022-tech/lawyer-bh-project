import Link from "next/link";
import { Buildings, Scales, User } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary, Locale } from "@/lib/i18n";

export function PortalGateway({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const cards = [
    { href: `/${locale}/portal/client`, icon: User, title: dictionary.portal.gateway.clientTitle, description: dictionary.portal.gateway.clientDescription, action: dictionary.portal.gateway.clientAction },
    { href: `/${locale}/portal/lawyer`, icon: Scales, title: dictionary.portal.gateway.lawyerTitle, description: dictionary.portal.gateway.lawyerDescription, action: dictionary.portal.gateway.lawyerAction },
    { href: `/${locale}/portal/admin`, icon: Buildings, title: dictionary.portal.gateway.adminTitle, description: dictionary.portal.gateway.adminDescription, action: dictionary.portal.gateway.adminAction },
  ];

  return (
    <main className="portal-page">
      <section className="container portal-gateway" aria-labelledby="portal-gateway-title">
        <div className="portal-gateway-heading">
          <h1 id="portal-gateway-title">{dictionary.portal.gateway.title}</h1>
          <p>{dictionary.portal.gateway.intro}</p>
        </div>
        <div className="portal-gateway-grid">
          {cards.map(({ href, icon: Icon, title, description, action }) => (
            <article className="portal-access-card" key={href}>
              <Icon size={34} aria-hidden="true" />
              <h2>{title}</h2>
              <p>{description}</p>
              <Link className="gold-button" href={href} aria-label={`${action} — ${title}`}>
                {action}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
