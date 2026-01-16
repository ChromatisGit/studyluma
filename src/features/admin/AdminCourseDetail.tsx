"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CourseDTO } from "@/domain/courseDTO";
import type { ProgressDTO } from "@/domain/progressDTO";
import type { Topic } from "@/domain/courseContent";
import type { CourseId } from "@/server/data/courses";
import { ProgressControl } from "./ProgressControl";
import { RegistrationControl } from "./RegistrationControl";
import styles from "./AdminCourseDetail.module.css";

type AdminCourseDetailProps = {
  course: CourseDTO;
  progress: ProgressDTO;
  topics: Topic[];
  courseId: CourseId;
};

export function AdminCourseDetail({ course, progress, topics, courseId }: AdminCourseDetailProps) {
  const courseUrl = `/${course.groupKey}/${course.subjectKey}`;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumbs}>
        <Link href="/admin" className={styles.breadcrumb}>
          <ChevronLeft size={16} />
          Admin Dashboard
        </Link>
        <span className={styles.separator}>|</span>
        <Link href={courseUrl} className={styles.breadcrumbCourse}>
          View Course Page
        </Link>
      </div>

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
            topics={topics}
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
