import { redirect } from "react-router";
import { GraduationCap, Map, FileText, Repeat } from "lucide-react";
import { getSession } from "@core/index.server";
import { isAdmin } from "@core/auth/guards";
import { getSidebarDTO } from "@services/courseService";
import { Button } from "@components/Button";
import TEXT from "./landingPage.de.json";
import styles from "./landingPage.module.css";

export function meta() {
  return [
    { title: TEXT.meta.title },
    { name: "description", content: TEXT.meta.description },
  ];
}

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  const user = session?.user ?? null;

  if (user) {
    if (isAdmin(user)) return redirect("/admin");
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
      <Hero />
      <WhatIs />
      <Features />
      <Story />
      <DemoHint />
      <About />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav>
      <div className={styles.navInner}>
        <a href="/" className={styles.navBrand}>StudyLuma</a>
        <div className={styles.navLinks}>
          <a href="/demo" className="text-muted-foreground hover:text-foreground transition-colors">{TEXT.nav.demo}</a>
          <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">{TEXT.nav.roadmap}</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroContent}>
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <GraduationCap size={28} />
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

function WhatIs() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}>
        <h2 className="text-xl font-semibold mb-4">{TEXT.about.title}</h2>
        <p className="leading-relaxed mb-4">{TEXT.about.intro}</p>
        <p className="text-muted-foreground text-sm">{TEXT.about.note}</p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInnerWide}>
        <h2 className="text-xl font-semibold mb-5">{TEXT.features.title}</h2>
        <div className={styles.featureGrid}>
          <FeatureCard icon={Map} title={TEXT.features.roadmap.title} description={TEXT.features.roadmap.description} />
          <FeatureCard icon={FileText} title={TEXT.features.worksheets.title} description={TEXT.features.worksheets.description} />
          <FeatureCard
            icon={Repeat}
            title={TEXT.features.lerntraining.title}
            description={TEXT.features.lerntraining.description}
            cta={{ label: TEXT.features.lerntraining.roadmapCta, href: "/roadmap" }}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: typeof Map;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className={styles.featureCard}>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon size={18} className="text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
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

function Story() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionInner}>
        <h2 className="text-xl font-semibold mb-4">{TEXT.story.title}</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">{TEXT.story.body}</p>
        <Button href="/roadmap" variant="secondary">{TEXT.story.cta}</Button>
      </div>
    </section>
  );
}

function DemoHint() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.demoHintBox}>
        <h2 className="text-lg font-semibold mb-3">{TEXT.demo.title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">{TEXT.demo.body}</p>
        <Button href="/demo" variant="primary">{TEXT.demo.cta}</Button>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className={styles.section}>
      <div className={styles.aboutInner}>
        {/* Replace with: <img src="/christian-holst.jpg" alt="Christian Holst" className={styles.photo} /> */}
        <div className={styles.photoPlaceholder} aria-hidden>CH</div>
        <div>
          <h2 className="text-xl font-semibold mb-3">{TEXT.project.title}</h2>
          <p className="text-muted-foreground leading-relaxed text-sm">{TEXT.project.body}</p>
          <div className="flex gap-3 mt-4">
            <a
              href="https://github.com/christianholst/studyluma"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {TEXT.project.githubLabel} ↗
            </a>
            <a
              href={`mailto:${TEXT.project.email}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {TEXT.project.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>{TEXT.footer.copyright.replace("{year}", String(year))}</span>
        <div className={styles.footerLinks}>
          <a href="/demo" className="hover:text-foreground transition-colors">{TEXT.footer.links.demo}</a>
          <a href="/roadmap" className="hover:text-foreground transition-colors">{TEXT.footer.links.roadmap}</a>
          <a
            href="https://github.com/christianholst/studyluma"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {TEXT.footer.links.github}
          </a>
          <a href="/impressum" className="hover:text-foreground transition-colors">{TEXT.footer.links.impressum}</a>
        </div>
      </div>
    </footer>
  );
}
