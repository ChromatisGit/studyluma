import { redirect } from "react-router";
import { Map, FileText, Repeat, Sun, Moon } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { toggleTheme } from "@chromatis/base";
import { getSession } from "@core/auth/session.server";
import { isAdmin } from "@core/auth/guards";
import { getSidebarDTO } from "@services/courseService";
import { buildMeta } from "@core/seo";

import { Button } from "@components/Button";
import { Box } from "@components/Box";
import { IconBox } from "@components/IconBox";
import { LightField } from "../components/LightField/LightField";
import { SiteFooter } from "./SiteFooter";
import TEXT from "./landingPage.de.json";
import styles from "./landingPage.module.css";

export function meta() {
  return buildMeta({
    title: TEXT.meta.title,
    description: TEXT.meta.description,
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "StudyLuma",
      url: "https://studyluma.org/",
      description: TEXT.meta.description,
      inLanguage: "de",
    },
  });
}

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  const user = session?.user ?? null;

  if (user && !isAdmin(user)) {
    const sidebar = await getSidebarDTO({ courseId: null, user });
    const firstCourse = sidebar.courses[0];
    if (firstCourse) return redirect(firstCourse.href);
  }

  return {};
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <main>
        <Hero />
        <WhatIsAndFeatures />
        <DemoHint />
        <About />
      </main>
      <SiteFooter />
    </div>
  );
}

function Nav() {
  return (
    <nav className="md:hidden">
      <div className={styles.navInner}>
        <a href="/" className={styles.navBrand}>StudyLuma</a>
        <div className={styles.navLinks}>
          <a href="/demo" className="text-muted-foreground hover:text-foreground transition-colors">{TEXT.nav.demo}</a>
          <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">{TEXT.nav.roadmap}</a>
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Design-Modus wechseln">
            <Sun size={17} className={styles.iconSun} aria-hidden />
            <Moon size={17} className={styles.iconMoon} aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <LightField />
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroContent}>
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <span className="text-3xl font-bold leading-none" aria-hidden>S</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">{TEXT.hero.claim}</h1>
        <p className="text-muted-foreground leading-relaxed" style={{ maxWidth: "500px", margin: "0 auto" }}>
          {TEXT.hero.lead}
        </p>
        <div className={styles.heroActions}>
          <Button href="/demo" variant="primary" size="lg">{TEXT.hero.ctaPrimary}</Button>
          <Button href="/roadmap" variant="secondary" size="lg">{TEXT.hero.ctaSecondary}</Button>
        </div>
      </div>
    </section>
  );
}

function WhatIsAndFeatures() {
  return (
    <section className={`${styles.section} ${styles.sectionLead}`}>
      <div className={styles.sectionInner}>
        <div className={styles.whatIsGrid}>
          <div className={styles.leftCol}>
            <h2 className="text-xl font-semibold mb-4">{TEXT.about.title}</h2>
            <p className="leading-relaxed mb-4">{TEXT.about.intro}</p>
            <p className={styles.whatIsNote}>{TEXT.about.note}</p>
            <div className={styles.storyBlock}>
              <h2 className="text-xl font-semibold mb-3">{TEXT.story.title}</h2>
              <p className="text-foreground leading-relaxed mb-4">{TEXT.story.body}</p>
              <Button href="/roadmap" variant="secondary">{TEXT.story.cta}</Button>
            </div>
          </div>
          <div className={styles.featureStack}>
            <p className="text-sm font-medium text-muted-foreground mb-3">{TEXT.features.title}</p>
            <FeatureCard icon={Map} title={TEXT.features.roadmap.title} description={TEXT.features.roadmap.description} />
            <FeatureCard icon={FileText} title={TEXT.features.worksheets.title} description={TEXT.features.worksheets.description} />
            <FeatureCard
              icon={Repeat}
              title={TEXT.features.lerntraining.title}
              description={TEXT.features.lerntraining.description}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoHint() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <Box padding="lg" className={styles.centeredBox}>
          <h2 className="text-xl font-semibold mb-3">{TEXT.demo.title}</h2>
          <p className="text-foreground leading-relaxed mb-5">{TEXT.demo.body}</p>
          <Button href="/demo" variant="primary">{TEXT.demo.cta}</Button>
        </Box>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  cta,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <Box padding="md">
      <div className="flex items-center gap-2.5 mb-2">
        <IconBox icon={icon} size="sm" variant="circle" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      {cta && (
        <a href={cta.href} className="inline-block mt-3 text-sm text-primary hover:underline">
          {cta.label} →
        </a>
      )}
    </Box>
  );
}


function About() {
  return (
    <section className={styles.section}>
      <div className={styles.aboutInner}>
        {/* TODO: Move this portrait to the CDN once media hosting is set up. */}
        <img
          src="/demo/christian-holst.webp"
          alt="Christian Holst"
          className={styles.photo}
          width={96}
          height={96}
        />
        <h2 className={`${styles.aboutTitle} text-xl font-semibold`}>{TEXT.project.title}</h2>
        <p className={`${styles.aboutBody} text-foreground leading-relaxed`}>{TEXT.project.body}</p>
        <div className={`${styles.aboutLinks} flex gap-3 mt-4`}>
          <a
            href="https://github.com/ChromatisGit/studyluma"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {TEXT.project.githubLabel}
          </a>
          <a
            href={`mailto:${TEXT.project.email}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {TEXT.project.email}
          </a>
        </div>
      </div>
    </section>
  );
}
