import { BookOpen, Clock, Plus, Globe } from "lucide-react";
import { Button } from "@components/Button";
import { PageHeader } from "@ui/components/PageHeader/PageHeader";
import { CourseCard } from "@features/homepage/sections/CourseSection/CourseCard";
import { ConfigableIcon } from "@ui/components/ConfigableIcon/ConfigableIcon";
import type { IconName } from "@ui/components/ConfigableIcon/ConfigableIcon";
import type { CourseDTO } from "@schema/courseTypes";
import styles from "./AuthenticatedHomePage.module.css";

type Props = {
  courses: CourseDTO[];
  continueHref: string;
  continueCourseName: string | null;
  continueTopicName: string | null;
  continueChapterName: string | null;
  continueIcon: string | null;
  accessCode?: string | null;
};

export function AuthenticatedHomePage({
  courses,
  continueHref,
  continueCourseName,
  continueTopicName,
  continueChapterName,
  continueIcon,
  accessCode,
}: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <PageHeader
          title={accessCode ? `Willkommen zurück, ${accessCode}!` : "Willkommen zurück!"}
          subtitle="Mach weiter, wo du aufgehört hast."
        />

        {/* === Above the fold === */}
        <div className={styles.aboveFold}>

          {/* Continue Card */}
          <div className={`${styles.actionCard} ${styles.actionCardPrimary}`}>
            <div className={styles.cardTop}>
              <div className={styles.cardIconWrap}>
                {continueIcon ? (
                  <ConfigableIcon iconKey={continueIcon as IconName} size={18} />
                ) : (
                  <BookOpen size={18} aria-hidden />
                )}
              </div>
              <div className={styles.cardInfo}>
                {continueCourseName ? (
                  <>
                    <p className={styles.cardTitle}>
                      {continueCourseName}{continueTopicName ? ` – ${continueTopicName}` : ""}
                    </p>
                    {continueChapterName && (
                      <p className={styles.cardSubtitle}>{continueChapterName}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className={styles.cardTitle}>Noch kein Kurs</p>
                    <p className={styles.cardSubtitle}>Tritt einem Kurs bei, um loszulegen.</p>
                  </>
                )}
              </div>
            </div>
            <Button
              href={continueCourseName ? continueHref : "/access?join=1"}
              variant="primary"
              size="md"
              fullWidth
            >
              {continueCourseName ? "Weitermachen" : "Kurs beitreten"}
            </Button>
          </div>

          {/* Quick Practice Card */}
          <div className={styles.actionCard}>
            <div className={styles.cardTop}>
              <div className={`${styles.cardIconWrap} ${styles.cardIconWrapTeal}`}>
                <Clock size={18} aria-hidden />
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>Schnell-Training</p>
                <p className={styles.cardSubtitle}>3 Minuten</p>
              </div>
            </div>
            <Button href="/practice" variant="secondary" size="md" fullWidth>
              Starten
            </Button>
          </div>
        </div>

        {/* === Enrolled courses === */}
        {courses.length > 0 && (
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Courses</h2>
              <Button href="/access?join=1" variant="secondary" size="sm">
                <Plus size={14} aria-hidden />
                Join Course
              </Button>
            </div>
            <div className={styles.courseGrid}>
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {/* === Secondary actions (no courses) === */}
        {courses.length === 0 && (
          <div className={styles.secondaryActions}>
            <Button href="/access?join=1" variant="secondary">
              <Plus size={16} aria-hidden />
              Kurs beitreten
            </Button>
            <Button href="/" variant="ghost">
              <Globe size={16} aria-hidden />
              Öffentliche Kurse
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
