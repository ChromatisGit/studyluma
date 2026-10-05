import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useParams } from "react-router";
import type { NavigationItem } from "@chromatis/base/ui";
import { listCourses, coursePath } from "../../src/modules/courses";
import { LiveQuizProvider } from "../../src/modules/quiz";
import { readViewer, ViewerSwitch } from "../../src/modules/viewer";
import {
  ChapterNav,
  getWorksheetChapter,
  type CurrentView,
} from "../../src/modules/worksheets";
import { StudyShell, courseIcon } from "../StudyShell";
import { worksheetLinks } from "../worksheetLinks";
import TEXT from "../app.de.json";

const quizPath = (courseId: string) => `${coursePath(courseId)}/quiz`;

export function loader({ request, params }: LoaderFunctionArgs) {
  const viewer = readViewer(request);
  return {
    viewer,
    courses: listCourses().map(({ id, title }) => ({ id, title })),
    worksheetChapter: params.chapterId
      ? (getWorksheetChapter(params.chapterId, viewer) ?? null)
      : null,
  };
}

export interface ShellLayoutProps {
  /** Consumer-owned main sections, such as Demo public pages. */
  extraNavigation?: readonly NavigationItem[];
}

/** Pages inside the StudyLuma shell; the lesson views have none. */
export default function ShellLayout({
  extraNavigation = [],
}: ShellLayoutProps) {
  const { viewer, courses, worksheetChapter } = useLoaderData<typeof loader>();
  const { courseId, chapterId, sheetId } = useParams();
  const location = useLocation();
  const links =
    courseId && chapterId ? worksheetLinks(courseId, chapterId) : undefined;
  const current: CurrentView = sheetId
    ? { kind: "sheet", sheetId }
    : location.pathname.endsWith("/challenges")
      ? { kind: "challenges" }
      : { kind: "summary" };
  const chapterSection =
    worksheetChapter && links
      ? {
          label: `Kapitel ${worksheetChapter.number}`,
          to: links.chapter,
          render: (onNavigate?: () => void) => (
            <ChapterNav
              chapter={worksheetChapter}
              viewer={viewer}
              links={links}
              current={current}
              {...(onNavigate ? { onNavigate } : {})}
            />
          ),
        }
      : undefined;
  const navigation: NavigationItem[] = [
    ...extraNavigation,
    {
      id: "courses",
      label: TEXT.navigation.courses,
      to: "/courses",
      icon: courseIcon,
      children: courses.map((course) => ({
        id: course.id,
        label: course.title,
        to: coursePath(course.id),
      })),
    },
  ];
  const switchControl = (compact: boolean) => (
    <ViewerSwitch role={viewer} action="/viewer" compact={compact} />
  );
  return (
    <StudyShell
      navigation={navigation}
      chapterSection={chapterSection}
      currentParentTo={
        courseId && !chapterSection ? coursePath(courseId) : undefined
      }
      sidebarFooter={{
        compact: switchControl(true),
        full: switchControl(false),
      }}
      quickActions={switchControl(true)}
    >
      <LiveQuizProvider enabled={viewer === "student"} quizPath={quizPath}>
        <Outlet />
      </LiveQuizProvider>
    </StudyShell>
  );
}
