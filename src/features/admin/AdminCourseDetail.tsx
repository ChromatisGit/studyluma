"use client";

import { ChevronRight, Shield } from "lucide-react";
import { AppLink } from "@components/AppLink";
import type { CourseDTO } from "@schema/courseDTO";
import type { ProgressDTO } from "@schema/progressDTO";
import type { CourseId } from "@services/courseService";
import { ProgressControl } from "./ProgressControl";
import { RegistrationControl } from "./RegistrationControl";
import styles from "./AdminCourseDetail.module.css";
import ADMIN_TEXT from "./admin.de.json";
import { SlideSelection } from "@features/slides/SlideSelection";

type AdminCourseDetailProps = {
  course: CourseDTO;
  progress: ProgressDTO;
  courseId: CourseId;
  slideIds: string[];
};

export function AdminCourseDetail({ course, progress, courseId, slideIds }: AdminCourseDetailProps) {
  const courseUrl = `/${course.groupKey}/${course.subjectKey}`;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li className={styles.breadcrumbItem}>
            <AppLink href="/admin" className={styles.breadcrumbHome}>
              <Shield size={16} />
            </AppLink>
          </li>
          <li className={styles.breadcrumbSeparator} aria-hidden="true">
            <ChevronRight size={12} />
          </li>
          <li className={styles.breadcrumbItem}>
            <AppLink href={courseUrl} className={styles.breadcrumbLink}>
              {course.label}
            </AppLink>
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

        {/* Slide Selection Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {ADMIN_TEXT.courseDetail.slideSelection.title}
          </h2>
          <p className={styles.sectionDescription}>
            {ADMIN_TEXT.courseDetail.slideSelection.description}
          </p>
          <SlideSelection
            subjectId={course.subjectId}
            topicId={progress.currentTopicId}
            chapterId={progress.currentChapterId}
            slideIds={slideIds}
          />
        </section>

        {/* Progress Control Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{ADMIN_TEXT.courseDetail.progressControl.title}</h2>
          <p className={styles.sectionDescription}>
            {ADMIN_TEXT.courseDetail.progressControl.description}
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
          <h2 className={styles.sectionTitle}>{ADMIN_TEXT.courseDetail.registration.title}</h2>
          <p className={styles.sectionDescription}>
            {ADMIN_TEXT.courseDetail.registration.description}
          </p>
          <RegistrationControl courseId={courseId} />
        </section>

        {/* Enrolled Students Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{ADMIN_TEXT.courseDetail.enrolledStudents.title}</h2>
          <p className={styles.sectionDescription}>
            {ADMIN_TEXT.courseDetail.enrolledStudents.description}
          </p>
          <div className={styles.placeholder}>
            <p>{ADMIN_TEXT.courseDetail.enrolledStudents.comingSoon}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

