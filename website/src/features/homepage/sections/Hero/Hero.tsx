import { ArrowRight } from "lucide-react";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import styles from "@features/homepage/sections/Hero/Hero.module.css";

export function Hero() {
  const { hero } = HOMEPAGE_COPY;

  return (
    <section className={styles.hero}>
      <div className={styles.heroShell}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{hero.title}</h1>

          <p className={styles.heroLead}>{hero.lead}</p>
          <div className={styles.heroActions}>
            <a href="#courses" className="button button--primary button--lg" aria-label={hero.primaryCta.ariaLabel}>
              {hero.primaryCta.label}
              <ArrowRight size={18} aria-hidden style={{ marginLeft: '0.35rem' }} />
            </a>

            <a href="#about" className={`button button--lg ${styles.ghostButton}`} aria-label={hero.secondaryCta.ariaLabel}>
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
