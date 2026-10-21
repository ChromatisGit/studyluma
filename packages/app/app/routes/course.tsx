import { useLoaderData, useLocation } from "react-router";
import {
  CoursePage,
  courseContentPath,
  coursePath,
  courseStructurePath,
} from "../../src/modules/courses";
import {
  CurrentLesson,
  Inhalte,
  LernwegControl,
  Unterricht,
} from "../../src/modules/classroom";
import { LessonStart, OpenSlides } from "../../src/modules/lessons";
import { CatalogContext } from "../../src/modules/catalog";
import type { loader } from "./course.server";

export default function Course() {
  const { course, viewer, catalog, currentSheets } =
    useLoaderData<typeof loader>();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "");
  const activeTab =
    path === coursePath(course.id)
      ? "student"
      : path === courseStructurePath(course.id)
        ? "course-structure"
        : path === courseContentPath(course.id)
          ? "content"
          : "overview";
  return (
    <CatalogContext.Provider value={catalog}>
      <CoursePage
        course={course}
        teacher={viewer === "teacher"}
        currentLesson={<CurrentLesson course={course} sheets={currentSheets} />}
        teachingControls={
          <Unterricht
            course={course}
            start={
              <LessonStart
                course={course}
                chapterId={course.currentChapterId ?? ""}
              />
            }
          />
        }
        structureControls={<LernwegControl course={course} />}
        contents={
          <Inhalte
            course={course}
            openSlides={(target) => <OpenSlides course={course} {...target} />}
          />
        }
        activeTab={activeTab}
      />
    </CatalogContext.Provider>
  );
}
