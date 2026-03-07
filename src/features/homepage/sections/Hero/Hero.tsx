import { GraduationCap } from "lucide-react";
import HOMEPAGE_TEXT from "@features/homepage/homepage.de.json";
import { Button } from "@components/Button";
import styles from "@features/homepage/sections/Hero/Hero.module.css";

export function Hero() {
  const { hero } = HOMEPAGE_TEXT;

  return (
    <section className={styles.hero}>
      <div className={styles.heroShell}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroContent}>
          <div className={styles.logoWrap} aria-hidden>
            <GraduationCap size={32} />
          </div>
          <h1 className={styles.heroTitle}>{hero.title}</h1>
          <p className={styles.heroLead}>{hero.lead}</p>
          <div className={styles.heroActions}>
            <Button href="/access" variant="primary" size="lg" aria-label={hero.primaryCta.ariaLabel}>
              {hero.primaryCta.label}
            </Button>
            <Button href="/access?join=1" variant="secondary" size="lg" aria-label={hero.secondaryCta.ariaLabel}>
              {hero.secondaryCta.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
