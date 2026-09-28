"use client";

import {
  CalendarCheck,
  ChatCircleDots,
  CheckCircle,
  FileText,
  Lightning,
  PaperPlaneTilt,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";
import { EmergencyCasesSection } from "./EmergencyCasesSection";

const benefitIcons = [FileText, UsersThree, Lightning, ShieldCheck];
const quickFlowIcons = [FileText, ChatCircleDots, CalendarCheck, CheckCircle];
const stepIcons = [PaperPlaneTilt, ChatCircleDots, CheckCircle, CalendarCheck];

const appGallery = [
  "/images/app-request.png",
  "/images/app-chat.png",
  "/images/app-inbox.png",
];

export function LandingSections({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();

  return (
    <>
      <section className="section-block app-clone-section" id="app-mirror">
        <div className="container">
          <div className="section-heading">
            <span>{dictionary.download.screenshotsLabel}</span>
            <h2>{dictionary.download.title}</h2>
            <p>{dictionary.download.body}</p>
          </div>

          <div className="mobile-clone-layout">
            <div className="app-gallery" aria-label={dictionary.download.screenshotsLabel}>
              <div className="app-gallery-track">
                {appGallery.map((screen, index) => (
                  <article className="app-screen-card" key={screen}>
                    <div className="phone-frame phone-frame-float">
                      <Image src={screen} alt={dictionary.download.gallery[index]} fill sizes="(max-width: 760px) 160px, 220px" />
                    </div>
                    <p>{dictionary.download.gallery[index]}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mobile-clone-copy">
              <h3>{dictionary.download.quickFlow.title}</h3>
              <p>{dictionary.download.quickFlow.body}</p>
              <ol className="mobile-clone-steps">
                {dictionary.download.quickFlow.steps?.map((step, index) => {
                  const Icon = quickFlowIcons[index % quickFlowIcons.length];
                  return (
                    <li key={step.title}>
                      <span className="step-pill">{index + 1}</span>
                      <span className="step-icon"><Icon size={21} /></span>
                      <div>
                        <h4>{step.title}</h4>
                        <p>{step.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button className="gold-button" onClick={() => site.openSos()}>
                {dictionary.download.quickFlow.cta}
              </button>
            </div>
          </div>

          <div className="download-actions-grid">
            <div className="store-badge" aria-disabled="true" style={{ cursor: "default", opacity: 0.6 }}>
              <span>
                <small>{dictionary.download.storeUnavailable}</small>
                <strong>App Store</strong>
              </span>
            </div>
            <div className="store-badge" aria-disabled="true" style={{ cursor: "default", opacity: 0.6 }}>
              <span>
                <small>{dictionary.download.storeUnavailable}</small>
                <strong>Google Play</strong>
              </span>
            </div>
            <Link className="gold-button" href={`/${locale}/portal`}>{dictionary.download.portal}</Link>
          </div>
        </div>
      </section>

      <section className="section-block benefits-section" id="services">
        <div className="container">
          <div className="section-heading"><span>Legal SOS</span><h2>{dictionary.benefitsTitle}</h2></div>
          <div className="benefit-grid">
            {dictionary.benefits.map((benefit, index) => {
              const Icon = benefitIcons[index];
              return (
                <article className="feature-card" key={benefit.title}>
                  <Icon size={39} weight="duotone" />
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-block process-section" id="how">
        <div className="container">
          <div className="section-heading"><h2>{dictionary.howTitle}</h2></div>
          <div className="steps-grid">
            {dictionary.how.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <article className="step-card" key={step.title}>
                  <span className="step-number">{index + 1}</span>
                  <span className="step-icon"><Icon size={32} /></span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <EmergencyCasesSection locale={locale} dictionary={dictionary} />


      <section className="section-block home-help-teaser">
        <div className="container home-help-teaser-inner">
          <div>
            <span className="eyebrow">{dictionary.nav.questions}</span>
            <h2>{locale === "ar" ? "هل تحتاج توضيحًا قبل طلب SOS؟" : locale === "tr" ? "SOS talebinden önce bilgiye mi ihtiyacınız var?" : "Need clarity before an SOS request?"}</h2>
            <p>{locale === "ar" ? "تصفح الإجابات والأسئلة الشائعة في مركز المساعدة." : locale === "tr" ? "Yardım merkezindeki sık sorulan sorulara göz atın." : "Browse answers and frequently asked questions in the help center."}</p>
          </div>
          <Link className="gold-button" href={`/${locale}/help`}>{locale === "ar" ? "مركز المساعدة" : locale === "tr" ? "Yardım merkezi" : "Help center"}</Link>
        </div>
      </section>
    </>
  );
}
