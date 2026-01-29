import { Grid } from "@components/Grid";
import { Box } from "@components/Box";
import { IconBox } from "@components/IconBox";
import { HomeSection } from "@features/homepage/Homepage";
import { aboutGoals } from "./aboutData";
import HOMEPAGE_TEXT from "@features/homepage/homepage.de.json";
import styles from "./About.module.css";

export function About() {
  const { about } = HOMEPAGE_TEXT;

  return (
    <HomeSection id="about" title={about.title} subtitle={about.subtitle}>
      <Grid minItemWidth={240} gap="md">
        {aboutGoals.map((goal) => (
          <Box key={goal.id} padding="sm" className={styles.goalCard}>
            <IconBox icon={goal.icon} size="sm" variant="circle" />
            <h3 className={styles.goalTitle}>{goal.title}</h3>
            <p className={styles.goalText}>{goal.description}</p>
          </Box>
        ))}
      </Grid>

      <div className={styles.infoNote}>
        <p>{about.intro}</p>
        <p>{about.note}</p>
      </div>
    </HomeSection>
  );
}
