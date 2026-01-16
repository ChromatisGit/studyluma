"use client";

import type { CourseDTO } from "@/domain/courseDTO";
import { Box } from "@/components/Box";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { Grid } from "@/components/Grid";
import { Stack } from "@/components/Stack";
import { PageHeader } from "@/components/PageHeader";
import type { IconName } from "@/components/ConfigableIcon/ConfigableIcon";
import styles from "./AdminDashboard.module.css";
import { AccentColor } from "@/domain/accentColors";

type AdminDashboardProps = {
  courses: CourseDTO[];
  totalUsers: number;
  accessibleCoursesCount: number;
};

export function AdminDashboard({ courses, totalUsers, accessibleCoursesCount }: AdminDashboardProps) {
  return (
    <Container size="wide" className={styles.container}>
      <Stack gap="xl">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Manage courses, progress, and student access"
        />

        <Grid minItemWidth={250} gap="lg">
          <Box padding="lg">
            <h3 className={styles.statLabel}>Total Courses</h3>
            <p className={styles.statValue}>{courses.length}</p>
          </Box>

          <Box padding="lg">
            <h3 className={styles.statLabel}>Total Students</h3>
            <p className={styles.statValue}>{totalUsers}</p>
          </Box>

          <Box padding="lg">
            <h3 className={styles.statLabel}>Accessible Courses</h3>
            <p className={styles.statValue}>{accessibleCoursesCount}</p>
          </Box>
        </Grid>

        <section>
          <Stack gap="md">
            <div>
              <h2 className={styles.sectionTitle}>Courses</h2>
              <p className={styles.sectionSubtitle}>
                Control chapter progress and registration for each course.
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
                  actionLabel="Manage"
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
