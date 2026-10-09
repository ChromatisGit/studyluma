import type { loader } from "./routes/shell";
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useParams,
} from "react-router";
import { UserRound } from "lucide-react";
import type { NavigationItem } from "@chromatis/base/ui";
import { courseOverviewPath, coursePath } from "../src/modules/courses";
import { LiveQuizProvider, type readViewer } from "../src/modules/classroom";
import {
  ChapterNav,
  type CurrentView,
  type SheetsData,
} from "../src/modules/worksheets";
import { StudyShell, courseIcon } from "./StudyShell";
import { worksheetLinks } from "./worksheetLinks";
import TEXT from "./app.de.json";

const quizPath = (courseId: string) => `${coursePath(courseId)}/quiz`;

function ChapterNavigation({
  chapter,
  viewer,
  links,
  current,
  onNavigate,
  hasSummary,
  summaryUnlocked,
}: {
  chapter: SheetsData;
  viewer: ReturnType<typeof readViewer>;
  links: ReturnType<typeof worksheetLinks>;
  current: CurrentView;
  onNavigate?: () => void;
  hasSummary: boolean;
  summaryUnlocked: boolean;
}) {
  return (
    <ChapterNav
      chapter={chapter}
      viewer={viewer}
      links={links}
      current={current}
      summaryUnlocked={summaryUnlocked}
      hasSummary={hasSummary}
      {...(onNavigate ? { onNavigate } : {})}
    />
  );
}

export interface ShellLayoutProps {
  /** Consumer-owned main sections, such as Demo public pages. */
  extraNavigation?: readonly NavigationItem[];
  /** Supplied by the host once an authenticated account is available. */
  accountName?: string | null;
}

function AccountLink({
  label,
  to,
  compact = false,
}: {
  label: string;
  to: string;
  compact?: boolean;
}) {
  return (
    <Link
      className="study-sidebar__account"
      to={to}
      aria-label={label}
      title={compact ? label : undefined}
    >
      <UserRound aria-hidden="true" />
      {!compact && <span>{label}</span>}
    </Link>
  );
}

/** Pages inside the StudyLuma shell; the lesson views have none. */
export default function ShellLayout({
  extraNavigation = [],
  accountName = null,
}: ShellLayoutProps) {
  const {
    viewer,
    courses,
    worksheetChapter,
    sidebarChapterId,
    hasSummary,
    summaryUnlocked,
  } = useLoaderData<typeof loader>();
  const { courseId, chapterId, sheetId } = useParams();
  const location = useLocation();
  const activeChapterId = chapterId ?? sidebarChapterId ?? undefined;
  const links =
    courseId && activeChapterId
      ? worksheetLinks(courseId, activeChapterId)
      : undefined;
  const current: CurrentView = sheetId
    ? { kind: "sheet", sheetId }
    : location.pathname.endsWith("/challenges")
      ? { kind: "challenges" }
      : !chapterId
        ? { kind: "course" }
        : { kind: "summary" };
  const chapterSection =
    worksheetChapter && links
      ? {
          label: worksheetChapter.title,
          to: links.chapter,
          render: (onNavigate?: () => void) => (
            <ChapterNavigation
              chapter={worksheetChapter}
              viewer={viewer}
              links={links}
              current={current}
              hasSummary={hasSummary}
              summaryUnlocked={summaryUnlocked}
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
        to:
          viewer === "teacher"
            ? courseOverviewPath(course.id)
            : coursePath(course.id),
      })),
    },
  ];
  const currentCoursePath = courseId
    ? viewer === "teacher"
      ? courseOverviewPath(courseId)
      : coursePath(courseId)
    : undefined;
  const accountLabel = accountName || "Login";
  const accountTo = accountName ? "/courses" : "/login";
  return (
    <StudyShell
      navigation={navigation}
      pageWidth="wide"
      chapterSection={chapterSection}
      currentParentTo={currentCoursePath}
      sidebarFooter={{
        full: <AccountLink label={accountLabel} to={accountTo} />,
        compact: <AccountLink label={accountLabel} to={accountTo} compact />,
      }}
    >
      <LiveQuizProvider enabled={viewer === "student"} quizPath={quizPath}>
        <Outlet />
      </LiveQuizProvider>
    </StudyShell>
  );
}
