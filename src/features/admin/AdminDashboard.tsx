"use client";

import type { CourseDTO } from "@schema/courseTypes";
import { Box } from "@components/Box";
import { Card } from "@components/Card";
import { Container } from "@components/Container";
import { Grid } from "@components/Grid";
import { Stack } from "@components/Stack";
import { PageHeader } from "@components/PageHeader";
import type { IconName } from "@components/ConfigableIcon/ConfigableIcon";
import styles from "./AdminDashboard.module.css";
import { AccentColor } from "@schema/accentColors";
import ADMIN_TEXT from "./admin.de.json";

type AdminDashboardProps = {
  courses: CourseDTO[];
  totalUsers: number;
};

export function AdminDashboard({ courses, totalUsers }: AdminDashboardProps) {
  return (
    <Container size="wide" className={styles.container}>
      <Stack gap="xl">
        <PageHeader
          title={ADMIN_TEXT.dashboard.title}
          subtitle={ADMIN_TEXT.dashboard.subtitle}
        />

        <Grid minItemWidth={250} gap="lg">
          <Box padding="lg">
            <h3 className={styles.statLabel}>{ADMIN_TEXT.dashboard.totalCourses}</h3>
            <p className={styles.statValue}>{courses.length}</p>
          </Box>

          <Box padding="lg">
            <h3 className={styles.statLabel}>{ADMIN_TEXT.dashboard.totalStudents}</h3>
            <p className={styles.statValue}>{totalUsers}</p>
          </Box>
        </Grid>

        <section>
          <Stack gap="md">
            <div>
              <h2 className={styles.sectionTitle}>{ADMIN_TEXT.dashboard.coursesSection}</h2>
              <p className={styles.sectionSubtitle}>
                {ADMIN_TEXT.dashboard.coursesDescription}
              </p>
            </div>

            <Grid minItemWidth={280} gap="md">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  title={course.label}
                  subtitle={course.description}
                  icon={(course.icon ?? "book-open") as IconName}
                  tags={course.tags}
                  actionLabel={ADMIN_TEXT.dashboard.manageAction}
                  href={`/admin/${course.id}`}
                  color={course.color as AccentColor}
                />
              ))}
            </Grid>
          </Stack>
        </section>
      </Stack>
    </Container>
  );
}
