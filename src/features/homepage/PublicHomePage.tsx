import type { CourseDTO } from "@schema/courseTypes";
import { Hero } from "./sections/Hero/Hero";
import { CourseSection } from "./sections/CourseSection/CourseSection";
import { Footer } from "./sections/Footer/Footer";
import { Container } from "@components/Container";
import { Card } from "@components/Card";
import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import styles from "./Homepage.module.css";

type PublicHomePageProps = {
  publicCourses: CourseDTO[];
};

export function PublicHomePage({ publicCourses }: PublicHomePageProps) {
  const { about } = HOMEPAGE_TEXT;

  return (
    <>
      <Hero />
      <CourseSection courses={publicCourses} />
      <section className={styles.learnMoreSection}>
        <Container size="narrow">
          <Card
            title={about.title}
            subtitle={about.subtitle}
            actionLabel={about.learnMoreLabel}
            href="https://studyluma.org"
            target="_blank"
          />
        </Container>
      </section>
      <Footer />
    </>
  );
}
