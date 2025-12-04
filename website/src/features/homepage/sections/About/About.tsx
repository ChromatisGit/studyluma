import { InfoGrid } from "@features/homepage/components/InfoGrid";
import { HomeSection } from "@features/homepage/layout/HomeSection";
import { aboutGoals } from "@features/homepage/sections/About/aboutData";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import styles from "@features/homepage/sections/About/About.module.css";

export function About() {
  const { about } = HOMEPAGE_COPY;

  return (
    <HomeSection id="about" title={about.title} subtitle={about.subtitle}>
      <InfoGrid items={aboutGoals} iconVariant="circle" />

      <div className={styles.infoNote}>
        <p>{about.intro}</p>
        <p>{about.note}</p>
      </div>
    </HomeSection>
  );
}
