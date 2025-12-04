import type { CSSProperties } from "react";
import { CourseCard } from "@features/homepage/sections/CourseSection/CourseCard";
import { HomeSection } from "@features/homepage/layout/HomeSection";
import HOMEPAGE_COPY from "@features/homepage/homepage.de.json";
import styles from "@features/homepage/sections/CourseSection/CourseSection.module.css";
import COURSES_JSON from "@generated-configs/courses.config.json";
import { Course } from "@builder/transformer/courses";
import { chunkSections } from "@features/homepage/sections/CourseSection/sectionSplitter";

const COURSES = COURSES_JSON as Course[];

export function CourseSection() {
  const courseRows = chunkSections(COURSES);
  const { courses } = HOMEPAGE_COPY;

  return (
    <HomeSection id="courses" title={courses.title} subtitle={courses.subtitle}>
      <div className={styles.courseGrid}>
        {courseRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={styles.courseRow}
            style={{ "--columns": row.length } as CSSProperties}
          >
            {row.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
