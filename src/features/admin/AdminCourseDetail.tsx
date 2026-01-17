"use client";

import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";
import type { CourseDTO } from "@/domain/courseDTO";
import type { ProgressDTO } from "@/domain/progressDTO";
import type { CourseId } from "@/server/data/courses";
import { ProgressControl } from "./ProgressControl";
import { RegistrationControl } from "./RegistrationControl";
import styles from "./AdminCourseDetail.module.css";

type AdminCourseDetailProps = {
  course: CourseDTO;
  progress: ProgressDTO;
  courseId: CourseId;
};

export function AdminCourseDetail({ course, progress, courseId }: AdminCourseDetailProps) {
  const courseUrl = `/${course.groupKey}/${course.subjectKey}`;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li className={styles.breadcrumbItem}>
            <Link href="/admin" className={styles.breadcrumbHome}>
              <Shield size={16} />
            </Link>
          </li>
          <li className={styles.breadcrumbSeparator} aria-hidden="true">
            <ChevronRight size={12} />
          </li>
          <li className={styles.breadcrumbItem}>
            <Link href={courseUrl} className={styles.breadcrumbLink}>
              {course.label}
            </Link>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{course.label}</h1>
        <p className={styles.subtitle}>{course.description}</p>
      </header>

      {/* Sections */}
      <div className={styles.sections}>
        {/* Progress Control Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Chapter Progress Control</h2>
          <p className={styles.sectionDescription}>
            Set the current chapter for all students. Students can only see chapters up to the planned chapter.
          </p>
          <ProgressControl
            courseId={courseId}
            currentTopicId={progress.currentTopicId}
            currentChapterId={progress.currentChapterId}
            topics={progress.topics}
          />
        </section>

        {/* Registration Window Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Registration Window</h2>
          <p className={styles.sectionDescription}>
            Control when students can join this course without an access code.
          </p>
          <RegistrationControl courseId={courseId} />
        </section>

        {/* Enrolled Students Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Enrolled Students</h2>
          <p className={styles.sectionDescription}>
            View all students enrolled in this course.
          </p>
          <div className={styles.placeholder}>
            <p>Student list coming soon</p>
          </div>
        </section>
      </div>
    </div>
  );
}
