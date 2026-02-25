"use client";

import { FancyGrid } from "@components/FancyGrid";
import { Stack } from "@components/Stack";
import { CourseCard } from "./CourseCard";
import styles from "@homepage/sections/CourseSection/CourseGroup.module.css";
import type { CourseDTO } from "@schema/courseTypes";

type CourseGroupProps = {
    title: string;
    courses: CourseDTO[];
    actionLabel: string;
    accessable: boolean
};

export function CourseGroup({ title, courses, accessable, actionLabel }: CourseGroupProps) {
    if (!courses.length) return null;

    return (
        <section>
            <Stack gap="sm">
                <h3 className={styles.groupTitle}>{title}</h3>

                <FancyGrid
                items={courses}
                minItemWidth={240}
                gap={16}
                maxCols={4}
                renderItem={(course) => {
                    const [, urlGroup, urlSubject] = course.slug.split('/');
                    const accessHref = `/access?groupKey=${urlGroup}&subjectKey=${urlSubject}`
                    const courseHref = course.slug;

                    return (
                        <CourseCard
                            key={course.id}
                            course={course}
                            href={accessable ? courseHref : accessHref}
                            actionLabel={actionLabel}
                        />
                    );
                }}
            />
            </Stack>
        </section>
    );
}

