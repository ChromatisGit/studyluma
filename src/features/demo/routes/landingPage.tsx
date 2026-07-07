import { redirect } from "react-router";
import { Map, FileText, Repeat, Sun, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSession } from "@core/auth/session.server";
import { isAdmin } from "@core/auth/guards";
import { getSidebarDTO } from "@services/courseService";
import { buildMeta } from "@core/seo";

import { createLightFieldClasses, LightFieldBase } from "../components/LightField/LightFieldBase";
import TEXT from "./landingPage.de.json";
import styles from "./landingPage.module.css";

const LIGHT_FIELD_CLASSES = createLightFieldClasses(styles);

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
      <LandingFooter />
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
          <button onClick={toggleLandingTheme} className={styles.themeToggle} aria-label="Design-Modus wechseln">
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
      <LightFieldBase classes={LIGHT_FIELD_CLASSES} />
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
          <LandingButton href="/demo" variant="primary" size="lg">{TEXT.hero.ctaPrimary}</LandingButton>
          <LandingButton href="/roadmap" variant="secondary" size="lg">{TEXT.hero.ctaSecondary}</LandingButton>
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
              <LandingButton href="/roadmap" variant="secondary">{TEXT.story.cta}</LandingButton>
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
        <div className={`${styles.surface} ${styles.surfaceLg} ${styles.centeredBox}`}>
          <h2 className="text-xl font-semibold mb-3">{TEXT.demo.title}</h2>
          <p className="text-foreground leading-relaxed mb-5">{TEXT.demo.body}</p>
          <LandingButton href="/demo" variant="primary">{TEXT.demo.cta}</LandingButton>
        </div>
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
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  const Icon = icon;

  return (
    <div className={`${styles.surface} ${styles.surfaceMd}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={styles.featureIcon}>
          <Icon size={18} aria-hidden />
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      {cta && (
        <a href={cta.href} className="inline-block mt-3 text-sm text-primary hover:underline">
          {cta.label} →
        </a>
      )}
    </div>
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

function LandingButton({
  href,
  variant,
  size = "md",
  children,
}: {
  href: string;
  variant: "primary" | "secondary";
  size?: "md" | "lg";
  children: string;
}) {
  return (
    <a href={href} className={`${styles.button} ${styles[`button${capitalize(variant)}`]} ${styles[`button${capitalize(size)}`]}`}>
      {children}
    </a>
  );
}

function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>{TEXT.footer.copyright.replace("{year}", String(year))}</span>
        <span>{TEXT.footer.tagline}</span>
        <a href="/impressum" className={styles.footerLink}>{TEXT.footer.impressum}</a>
      </div>
    </footer>
  );
}

function toggleLandingTheme() {
  const root = document.documentElement;
  const nextTheme = root.classList.contains("dark") ? "light" : "dark";

  root.classList.toggle("dark", nextTheme === "dark");

  try {
    localStorage.setItem("theme", nextTheme);
  } catch {
    // Ignore blocked storage; the class change still updates the current page.
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
