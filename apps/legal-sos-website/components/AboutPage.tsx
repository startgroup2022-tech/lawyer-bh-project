"use client";

import { ArrowRight, CheckCircle, GlobeHemisphereWest, Heart, Lightning, ShieldCheck } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n";
import { useSite } from "./providers/SiteProvider";
import styles from "./AboutPage.module.css";

const valueIcons = [ShieldCheck, Lightning, Heart];

export function AboutPage({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const site = useSite();
  const copy = dictionary.about;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.introduction}</p>
        </div>
      </section>

      <section className={styles.storySection}>
        <div className={`container ${styles.storyGrid}`}>
          <article className={styles.storyCard}>
            <span className={styles.cardIcon}><CheckCircle size={28} weight="duotone" /></span>
            <h2>{copy.mission.title}</h2>
            <p>{copy.mission.body}</p>
          </article>
          <article className={styles.storyCard}>
            <span className={styles.cardIcon}><GlobeHemisphereWest size={28} weight="duotone" /></span>
            <h2>{copy.vision.title}</h2>
            <p>{copy.vision.body}</p>
          </article>
        </div>
      </section>

      <section className={styles.valuesSection}>
        <div className="container">
          <div className={styles.sectionHeading}><h2>{copy.values.title}</h2></div>
          <div className={styles.valuesGrid}>
            {copy.values.items.map((value, index) => {
              const Icon = valueIcons[index];
              return (
                <article className={styles.valueCard} key={value.title}>
                  <Icon size={32} weight="duotone" />
                  <h3>{value.title}</h3>
                  <p>{value.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.processSection}>
        <div className="container">
          <div className={styles.sectionHeading}><h2>{copy.process.title}</h2></div>
          <div className={styles.processGrid}>
            {copy.process.steps.map((step, index) => (
              <article className={styles.processCard} key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <article className={styles.coverageCard}>
            <GlobeHemisphereWest size={42} weight="duotone" />
            <div><h2>{copy.coverage.title}</h2><p>{copy.coverage.body}</p></div>
          </article>
        </div>
      </section>

      <section className={styles.managementSection}>
        <div className="container">
          <div className={styles.sectionHeading}><span className="eyebrow">Legal SOS</span><h2>{copy.management.title}</h2></div>
          <article className={styles.memberCard} data-testid="management-member">
            <div className={styles.memberPhoto}>
              <Image
                src="/images/team/omar-nabih-shaker.jpg"
                alt={copy.management.member.name}
                fill
                sizes="(max-width: 760px) 100vw, 390px"
                priority
              />
            </div>
            <div className={styles.memberCopy}>
              <span className="eyebrow">{copy.management.member.role}</span>
              <h3>{copy.management.member.name}</h3>
              <p>{copy.management.member.biography}</p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`container ${styles.ctaCard}`}>
          <div><h2>{copy.cta.title}</h2><p>{copy.cta.body}</p></div>
          <div className={styles.ctaActions}>
            <button className="sos-primary" type="button" onClick={() => site.openSos()}>{copy.cta.primary}</button>
            <Link className="ghost-button" href={`/${locale}/lawyer/register`}>{copy.cta.secondary}<ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
