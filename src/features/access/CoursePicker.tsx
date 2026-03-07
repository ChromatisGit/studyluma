import { BookOpen } from "lucide-react";
import { IconBox } from "@components/IconBox";
import { CourseCard } from "@features/homepage/sections/CourseSection/CourseCard";
import type { CourseDTO } from "@schema/courseTypes";
import styles from "./AccessSection.module.css";
import pickerStyles from "./CoursePicker.module.css";

type CoursePickerProps = {
  courses: CourseDTO[];
};

export function CoursePicker({ courses }: CoursePickerProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <IconBox icon={BookOpen} color="purple" size="lg" />
          <h1 className={styles.title}>Kurse beitreten</h1>
          <p className={styles.subtitle}>Wähle einen Kurs aus der Liste.</p>
        </header>

        {courses.length === 0 ? (
          <p className={pickerStyles.empty}>Keine Kurse verfügbar.</p>
        ) : (
          <div className={pickerStyles.grid}>
            {courses.map((course) => {
              const [, urlGroup, urlSubject] = course.slug.split("/");
              const href = `/access?groupKey=${urlGroup}&subjectKey=${urlSubject}&from=/home`;
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={href}
                  actionLabel="Kurs beitreten"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
