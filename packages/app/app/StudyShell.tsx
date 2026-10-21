import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
} from "lucide-react";
import {
  SiteShell,
  useColorMode,
  type NavigationItem,
  type ShellActionSlot,
} from "@chromatis/base/ui";
import { fill } from "../src/helper/text";
import TEXT from "./app.de.json";
import { StudyMobileHeader } from "./StudyMobileHeader";
import {
  ChildLinks,
  containsPath,
  type ChapterSection,
} from "./StudyNavigationLinks";

const colorModeKey = "studyluma:color-mode";
const sidebarStorageKey = "studyluma:sidebar";

export const studyColorModeKey = colorModeKey;

/**
 * From this width the open sidebar stays docked beside the content. Below it
 * only the rail is reserved and the open sidebar overlays the content.
 * Keep in step with the media queries in study-shell.css.
 */
const dockedQuery = "(min-width: 1100px)";

function useDocked(): boolean {
  const [docked, setDocked] = useState(true);
  useLayoutEffect(() => {
    const query = window.matchMedia(dockedQuery);
    const update = () => setDocked(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return docked;
}

function ColorModeControl({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useColorMode(colorModeKey);
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const dark = mode === "dark" || (mode === "system" && systemDark);
  if (!compact) {
    return (
      <button
        type="button"
        className="study-sidebar__appearance"
        title={dark ? TEXT.colorMode.toLight : TEXT.colorMode.toDark}
        onClick={() => setMode(dark ? "light" : "dark")}
      >
        <span className="study-sidebar__appearance-label">
          {TEXT.colorMode.label}
        </span>
        <span className="study-sidebar__appearance-icon" aria-hidden="true">
          {dark ? <Sun /> : <Moon />}
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="study-sidebar__theme-button"
      aria-label={dark ? TEXT.colorMode.toLight : TEXT.colorMode.toDark}
      title={dark ? TEXT.colorMode.toLight : TEXT.colorMode.toDark}
      onClick={() => setMode(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function DesktopChapterSection({
  section,
  collapsed,
  onExpand,
  panelId,
}: {
  section: ChapterSection;
  collapsed: boolean;
  onExpand: () => void;
  panelId: string;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), [section.to]);
  return (
    <div className="study-sidebar__section study-sidebar__section--chapter">
      <div className="study-sidebar__section-row">
        <button
          type="button"
          className="study-sidebar__section-link study-sidebar__section-button"
          aria-expanded={open}
          aria-controls={`${panelId}-chapter`}
          title={section.label}
          onClick={() => {
            if (collapsed) {
              setOpen(true);
              onExpand();
            } else {
              setOpen((previous) => !previous);
            }
          }}
        >
          <span className="study-sidebar__section-icon" aria-hidden="true">
            <BookOpen />
          </span>
          <span className="study-sidebar__section-label">{section.label}</span>
          <ChevronDown className="study-sidebar__chevron" aria-hidden="true" />
        </button>
      </div>
      <div
        className="study-sidebar__children"
        id={`${panelId}-chapter`}
        data-open={open || undefined}
        aria-hidden={collapsed || !open}
        inert={collapsed || !open}
      >
        <div className="study-sidebar__children-inner">{section.render()}</div>
      </div>
    </div>
  );
}

// The desktop navigation owns its accordion state in one place.
// eslint-disable-next-line max-lines-per-function
function DesktopSidebar({
  navigation,
  chapterSection,
  currentParentTo,
  sidebarFooter,
  collapsed,
  onToggle,
  onExpand,
}: {
  navigation: readonly NavigationItem[];
  chapterSection?: ChapterSection | undefined;
  currentParentTo?: string | undefined;
  sidebarFooter?: ShellActionSlot | undefined;
  collapsed: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const selected = currentParentTo ?? path;
  const activeSection = navigation.find((item) => containsPath(item, selected));
  const activeSectionId = activeSection?.id;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const navigationId = useId();

  useEffect(() => {
    setExpanded(activeSectionId ? { [activeSectionId]: true } : {});
  }, [activeSectionId, path]);

  return (
    <aside className="study-sidebar" aria-label={TEXT.shell.navigation}>
      <div className="study-sidebar__brand-row">
        <Link
          className="study-sidebar__brand"
          to="/"
          aria-label={TEXT.brandLabel}
        >
          <span className="study-sidebar__mark" aria-hidden="true">
            S
          </span>
          <span className="study-sidebar__brand-name">{TEXT.brand}</span>
        </Link>
        <button
          type="button"
          className="study-sidebar__toggle"
          onClick={onToggle}
          aria-label={
            collapsed ? TEXT.shell.showSidebar : TEXT.shell.hideSidebar
          }
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight aria-hidden="true" />
          ) : (
            <ChevronLeft aria-hidden="true" />
          )}
        </button>
      </div>
      <nav
        className="study-sidebar__navigation"
        aria-label={TEXT.shell.navigation}
      >
        {navigation.map((item) => {
          const hasChildren = !!item.children?.length;
          const sectionActive = containsPath(item, selected);
          const open = expanded[item.id] ?? sectionActive;
          const panelId = `${navigationId}-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          return (
            <div className="study-sidebar__section" key={item.id}>
              <div className="study-sidebar__section-row">
                {hasChildren ? (
                  <button
                    type="button"
                    className="study-sidebar__section-link study-sidebar__section-button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    title={item.label}
                    onClick={() => {
                      if (collapsed) {
                        setExpanded((previous) => ({
                          ...previous,
                          [item.id]: true,
                        }));
                        onExpand();
                      } else {
                        setExpanded((previous) => ({
                          ...previous,
                          [item.id]: !open,
                        }));
                      }
                    }}
                  >
                    <span
                      className="study-sidebar__section-icon"
                      aria-hidden="true"
                    >
                      {item.icon ?? item.label.charAt(0)}
                    </span>
                    <span className="study-sidebar__section-label">
                      {item.label}
                    </span>
                    <ChevronDown
                      className="study-sidebar__chevron"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <Link
                    className="study-sidebar__section-link"
                    to={item.to}
                    aria-current={path === item.to ? "page" : undefined}
                    title={item.label}
                  >
                    <span
                      className="study-sidebar__section-icon"
                      aria-hidden="true"
                    >
                      {item.icon ?? item.label.charAt(0)}
                    </span>
                    <span className="study-sidebar__section-label">
                      {item.label}
                    </span>
                  </Link>
                )}
              </div>
              {hasChildren && (
                <div
                  className="study-sidebar__children"
                  id={panelId}
                  data-open={open || undefined}
                  aria-hidden={collapsed || !open}
                  inert={collapsed || !open}
                >
                  <div className="study-sidebar__children-inner">
                    <ChildLinks
                      items={item.children ?? []}
                      path={path}
                      parentPath={currentParentTo}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {chapterSection && (
          <DesktopChapterSection
            section={chapterSection}
            collapsed={collapsed}
            onExpand={onExpand}
            panelId={navigationId}
          />
        )}
      </nav>
      <div className="study-sidebar__footer">
        <div className="study-sidebar__settings">
          <ColorModeControl />
        </div>
        <div className="study-sidebar__settings-compact">
          <ColorModeControl compact />
        </div>
        {sidebarFooter && (
          <div className="study-sidebar__footer-action">
            {collapsed ? sidebarFooter.compact : sidebarFooter.full}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Whether the sidebar is collapsed, and how it changes in each mode. */
function useSidebarState() {
  // The stored choice only applies while the sidebar is docked; as an overlay
  // it is open for one interaction and never stored.
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [animateSidebar, setAnimateSidebar] = useState(false);
  const docked = useDocked();
  const collapsed = docked ? pinnedCollapsed : !overlayOpen;
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    try {
      setPinnedCollapsed(localStorage.getItem(sidebarStorageKey) === "closed");
    } catch {
      // The open sidebar remains usable when storage is unavailable.
    }
  }, []);

  useEffect(() => setOverlayOpen(false), [pathname, docked]);

  useEffect(() => {
    if (docked || !overlayOpen) {
      return;
    }
    const close = () => {
      setAnimateSidebar(true);
      setOverlayOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".study-sidebar")) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [docked, overlayOpen]);

  function setSidebarCollapsed(next: boolean) {
    setAnimateSidebar(true);
    if (!docked) {
      setOverlayOpen(!next);
      return;
    }
    setPinnedCollapsed(next);
    try {
      localStorage.setItem(sidebarStorageKey, next ? "closed" : "open");
    } catch {
      // Keep the selected state for this session.
    }
  }

  return {
    collapsed,
    animateSidebar,
    toggleSidebar: () => setSidebarCollapsed(!collapsed),
    expandSidebar: () => setSidebarCollapsed(false),
  };
}

export interface StudyShellProps {
  children: ReactNode;
  navigation: readonly NavigationItem[];
  pageWidth?: "default" | "wide";
  chapterSection?: ChapterSection | undefined;
  sidebarFooter?: ShellActionSlot | undefined;
  quickActions?: ReactNode;
  currentParentTo?: string | undefined;
  footer?: ReactNode;
}

/** The StudyLuma frame around every page except the lesson views. */
export function StudyShell({
  children,
  navigation,
  pageWidth = "default",
  chapterSection,
  sidebarFooter,
  quickActions,
  currentParentTo,
  footer,
}: StudyShellProps) {
  const { collapsed, animateSidebar, toggleSidebar, expandSidebar } =
    useSidebarState();

  return (
    <div
      className={`study-shell${collapsed ? " study-shell--collapsed" : ""}${animateSidebar ? " study-shell--animate-sidebar" : ""}`}
      data-page-width={pageWidth}
    >
      <DesktopSidebar
        navigation={navigation}
        chapterSection={chapterSection}
        currentParentTo={currentParentTo}
        sidebarFooter={sidebarFooter}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        onExpand={expandSidebar}
      />
      <StudyMobileHeader
        navigation={navigation}
        chapterSection={chapterSection}
        currentParentTo={currentParentTo}
        quickActions={quickActions}
        settings={<ColorModeControl />}
        accountControl={sidebarFooter?.full}
      />
      <SiteShell
        brand={
          <>
            <span className="study-mobile-mark" aria-hidden="true">
              S
            </span>
            <span className="brand__name">{TEXT.brand}</span>
          </>
        }
        brandTo="/"
        brandLabel={TEXT.brandLabel}
        navigation={navigation}
        labels={{
          ...TEXT.shell,
          pagesIn: (section) => fill(TEXT.shell.pagesIn, { section }),
        }}
        icons={{
          menu: <Menu aria-hidden="true" />,
          close: <X aria-hidden="true" />,
          expand: <ChevronDown aria-hidden="true" />,
          sidebarOpen: <PanelLeftClose aria-hidden="true" />,
          sidebarClosed: <PanelLeftOpen aria-hidden="true" />,
        }}
        sidebarStorageKey={sidebarStorageKey}
        footer={footer}
      >
        {children}
      </SiteShell>
    </div>
  );
}

export const courseIcon = <GraduationCap aria-hidden="true" />;
