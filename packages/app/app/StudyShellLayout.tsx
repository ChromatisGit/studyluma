import { useCallback, type ReactNode } from "react";
import type { loader } from "./routes/shell";
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useParams,
} from "react-router";
import { House, Map, UserRound } from "lucide-react";
import type { NavigationItem } from "@chromatis/base/ui";
import { shellLinks } from "../src/modules/shell";
import {
  courseOverviewPath,
  coursePath,
  findChapter,
} from "../src/modules/courses";
import {
  LiveQuizProvider,
  useSite,
  type Target,
  type ViewerRole,
} from "../src/modules/classroom";
import {
  ChapterNav,
  type CurrentView,
  type SheetsData,
} from "../src/modules/worksheets";
import { StudyShell, courseIcon } from "./StudyShell";
import { worksheetLinks } from "./worksheetLinks";
import TEXT from "./app.de.json";

const quizPath = (courseId: string) => `${coursePath(courseId)}/quiz`;

/** Where the worksheet the teacher sent lives: in the session's course, else in any that teaches it. */
function useSheetPath() {
  const site = useSite();
  return useCallback(
    (target: Target, courseId: string | null) => {
      const teaching = site.courses.filter((course) =>
        findChapter(course, target.chapterId),
      );
      const course =
        teaching.find((item) => item.id === courseId) ?? teaching[0];
      const chapter = course && findChapter(course, target.chapterId);
      const sheet = site.index.worksheets[target.chapterId]?.find(
        (item) => item.id === target.id,
      );
      return course && chapter && sheet
        ? worksheetLinks(course.id, chapter.slug).sheet(sheet.slug)
        : null;
    },
    [site],
  );
}

/** The live quiz and the worksheets the teacher sends, for students. */
function StudentLive({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const sheetPath = useSheetPath();
  return (
    <LiveQuizProvider
      enabled={enabled}
      quizPath={quizPath}
      sheetPath={sheetPath}
    >
      {children}
    </LiveQuizProvider>
  );
}

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
  viewer: ViewerRole;
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

/** What the sidebar highlights for the open page. */
function currentView(
  chapter: SheetsData | null,
  { chapterSlug, sheetSlug }: Readonly<Record<string, string | undefined>>,
  pathname: string,
): CurrentView {
  const sheet = chapter?.sheets.find((item) => item.slug === sheetSlug);
  if (sheet) {
    return { kind: "sheet", sheetId: sheet.id };
  }
  if (pathname.endsWith("/challenges")) {
    return { kind: "challenges" };
  }
  return chapterSlug ? { kind: "summary" } : { kind: "course" };
}

/** Pages inside the StudyLuma shell; the lesson views have none. */
export default function ShellLayout() {
  const {
    viewer,
    shell,
    courses,
    worksheetChapter,
    sidebarChapterSlug,
    hasSummary,
    summaryUnlocked,
  } = useLoaderData<typeof loader>();
  const site = useSite();
  // The instance's extra entries and account link; else the login button.
  const extra = shellLinks(shell);
  const { courseId, chapterSlug, sheetSlug } = useParams();
  const location = useLocation();
  const activeChapterSlug = chapterSlug ?? sidebarChapterSlug ?? undefined;
  const links =
    courseId && activeChapterSlug
      ? worksheetLinks(courseId, activeChapterSlug)
      : undefined;
  const current = currentView(
    worksheetChapter,
    { chapterSlug, sheetSlug },
    location.pathname,
  );
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
              summaryUnlocked={
                site.localReleases
                  ? site.releasedSummaries.includes(worksheetChapter.id)
                  : summaryUnlocked
              }
              {...(onNavigate ? { onNavigate } : {})}
            />
          ),
        }
      : undefined;
  const navigation: NavigationItem[] = [
    ...shell.navigation.map((entry, index): NavigationItem => ({
      id: `shell-${index}`,
      label: entry.label,
      to: entry.href,
      icon:
        entry.icon === "house" ? (
          <House aria-hidden="true" />
        ) : entry.icon === "map" ? (
          <Map aria-hidden="true" />
        ) : undefined,
    })),
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
  const accountLabel = extra.account.label;
  const accountTo = extra.account.to;
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
      <StudentLive enabled={viewer === "student"}>
        <Outlet />
      </StudentLive>
    </StudyShell>
  );
}
