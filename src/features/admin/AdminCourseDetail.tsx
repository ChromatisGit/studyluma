"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { AppLink } from "@components/AppLink";
import type { CourseDTO, ProgressDTO, CourseId } from "@schema/courseTypes";
import type { AdminWorksheetRef } from "@services/courseService";
import { listSlideDecksAction } from "@actions/slideActions";
import { ProgressControl } from "./ProgressControl";
import { RegistrationControl } from "./RegistrationControl";
import { WorksheetManagement } from "./WorksheetManagement";
import styles from "./AdminCourseDetail.module.css";
import ADMIN_TEXT from "./admin.de.json";
import { SlideSelection } from "@features/slides/SlideSelection";

type AdminCourseDetailProps = {
  course: CourseDTO;
  progress: ProgressDTO;
  courseId: CourseId;
  slideIds: string[];
  worksheets: AdminWorksheetRef[];
};

export function AdminCourseDetail({ course, progress, courseId, slideIds, worksheets }: AdminCourseDetailProps) {
  const courseUrl = course.slug;

  const [viewTopicId, setViewTopicId] = useState(progress.currentTopicId);
  const [viewChapterId, setViewChapterId] = useState(progress.currentChapterId);
  const [viewSlideIds, setViewSlideIds] = useState(slideIds);
  const [isLoadingSlides, setIsLoadingSlides] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [pickerOpen]);

  const handleChapterSelect = async (topicId: string, chapterId: string) => {
    setPickerOpen(false);
    if (topicId === viewTopicId && chapterId === viewChapterId) return;
    setViewTopicId(topicId);
    setViewChapterId(chapterId);
    setIsLoadingSlides(true);
    const result = await listSlideDecksAction(course.subjectId, topicId, chapterId);
    setViewSlideIds(result.ok ? result.slideIds : []);
    setIsLoadingSlides(false);
  };

  const viewChapterLabel = progress.topics
    .flatMap((t) => t.chapters)
    .find((c) => c.chapterId === viewChapterId)?.label ?? viewChapterId;

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

        {/* Chapter Content Card */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {ADMIN_TEXT.courseDetail.chapterContent.title}
          </h2>
          <p className={styles.sectionDescription}>
            {ADMIN_TEXT.courseDetail.chapterContent.description}
          </p>
          <div className={styles.chapterCard}>

            {/* Card header: chapter name + picker */}
            <div className={styles.chapterCardHeader} ref={pickerRef}>
              <button
                type="button"
                className={styles.chapterPickerButton}
                onClick={() => setPickerOpen((o) => !o)}
                aria-expanded={pickerOpen}
              >
                <h2 className={styles.chapterPickerTitle}>{viewChapterLabel}</h2>
                <ChevronDown
                  size={20}
                  className={pickerOpen ? styles.chevronOpen : styles.chevronClosed}
                />
              </button>

              {pickerOpen && (
                <div className={styles.chapterPickerDropdown}>
                  {progress.topics.map((topic) => (
                    <div key={topic.topicId} className={styles.dropdownTopic}>
                      <span className={styles.dropdownTopicLabel}>{topic.label}</span>
                      {topic.chapters.map((chapter) => (
                        <button
                          key={chapter.chapterId}
                          type="button"
                          className={
                            chapter.chapterId === viewChapterId
                              ? styles.dropdownChapterActive
                              : styles.dropdownChapter
                          }
                          onClick={() => handleChapterSelect(topic.topicId, chapter.chapterId)}
                        >
                          {chapter.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.cardSubsection}>
              <h3 className={styles.cardSubsectionTitle}>
                {ADMIN_TEXT.courseDetail.chapterContent.slidesLabel}
              </h3>
              <SlideSelection
                subjectId={course.subjectId}
                topicId={viewTopicId}
                chapterId={viewChapterId}
                slideIds={viewSlideIds}
                isLoading={isLoadingSlides}
              />
            </div>
            <div className={styles.cardDivider} />
            <div className={styles.cardSubsection}>
              <h3 className={styles.cardSubsectionTitle}>
                {ADMIN_TEXT.courseDetail.chapterContent.worksheetsLabel}
              </h3>
              <WorksheetManagement
                courseId={courseId}
                courseSlug={courseUrl}
                worksheets={worksheets}
                chapterId={viewChapterId}
              />
            </div>
          </div>
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
