import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  Select,
  SiteShell,
  useColorMode,
  type ColorMode,
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

function ColorModeControl() {
  const [mode, setMode] = useColorMode(colorModeKey);
  return (
    <Select
      label={TEXT.colorMode.label}
      visuallyHiddenLabel
      value={mode}
      onChange={(event) => setMode(event.target.value as ColorMode)}
      options={(["system", "light", "dark"] as const).map((value) => ({
        value,
        label: TEXT.colorMode[value],
      }))}
    />
  );
}

function CompactColorModeControl() {
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
  return (
    <button
      type="button"
      className="study-sidebar__theme-button"
      aria-label={TEXT.colorMode.label}
      title={TEXT.colorMode.label}
      onClick={() => setMode(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function DesktopChapterSection({
  section,
  collapsed,
  flyout,
  setFlyout,
  panelId,
}: {
  section: ChapterSection;
  collapsed: boolean;
  flyout: string | null;
  setFlyout: (value: string | null) => void;
  panelId: string;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), [section.to]);
  return (
    <div className="study-sidebar__section study-sidebar__section--chapter">
      <div className="study-sidebar__section-row">
        <button
          type="button"
          className="study-sidebar__rail-section"
          aria-label={section.label}
          aria-expanded={flyout === "chapter"}
          aria-controls={`${panelId}-flyout`}
          onClick={() => setFlyout(flyout === "chapter" ? null : "chapter")}
        >
          <span aria-hidden="true">
            <BookOpen />
          </span>
        </button>
        <Link
          className="study-sidebar__section-link"
          to={section.to}
          data-active="true"
        >
          <span className="study-sidebar__section-icon" aria-hidden="true">
            <BookOpen />
          </span>
          <span className="study-sidebar__section-label">{section.label}</span>
        </Link>
        <button
          type="button"
          className="study-sidebar__disclosure"
          aria-label={fill(TEXT.shell.pagesIn, { section: section.label })}
          aria-expanded={open}
          aria-controls={`${panelId}-chapter`}
          onClick={() => setOpen((previous) => !previous)}
        >
          <ChevronDown aria-hidden="true" />
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

// The desktop navigation owns disclosure, rail, and flyout state in one place.
// eslint-disable-next-line max-lines-per-function
function DesktopSidebar({
  navigation,
  chapterSection,
  currentParentTo,
  sidebarFooter,
  collapsed,
  onToggle,
}: {
  navigation: readonly NavigationItem[];
  chapterSection?: ChapterSection | undefined;
  currentParentTo?: string | undefined;
  sidebarFooter?: ShellActionSlot | undefined;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const path = useLocation().pathname.replace(/\/+$/, "") || "/";
  const selected = currentParentTo ?? path;
  const activeSection = navigation.find((item) => containsPath(item, selected));
  const activeSectionId = activeSection?.id;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [flyout, setFlyout] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const navigationId = useId();

  useEffect(() => {
    setExpanded(activeSectionId ? { [activeSectionId]: true } : {});
    setFlyout(null);
  }, [activeSectionId, path]);

  useEffect(() => {
    if (!flyout) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFlyout(null);
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setFlyout(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [flyout]);

  return (
    <aside
      ref={sidebarRef}
      className="study-sidebar"
      aria-label={TEXT.shell.navigation}
    >
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
                {hasChildren && (
                  <button
                    type="button"
                    className="study-sidebar__rail-section"
                    aria-label={fill(TEXT.shell.pagesIn, {
                      section: item.label,
                    })}
                    aria-expanded={flyout === item.id}
                    aria-controls={`${navigationId}-flyout`}
                    onClick={() =>
                      setFlyout(flyout === item.id ? null : item.id)
                    }
                  >
                    <span aria-hidden="true">
                      {item.icon ?? item.label.charAt(0)}
                    </span>
                  </button>
                )}
                <Link
                  className="study-sidebar__section-link"
                  to={item.to}
                  aria-current={path === item.to ? "page" : undefined}
                  data-active={sectionActive || undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setFlyout(null)}
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
                {hasChildren && (
                  <button
                    type="button"
                    className="study-sidebar__disclosure"
                    aria-label={fill(TEXT.shell.pagesIn, {
                      section: item.label,
                    })}
                    aria-controls={panelId}
                    aria-expanded={open}
                    onClick={() =>
                      setExpanded((previous) => ({
                        ...previous,
                        [item.id]: !open,
                      }))
                    }
                  >
                    <ChevronDown aria-hidden="true" />
                  </button>
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
            flyout={flyout}
            setFlyout={setFlyout}
            panelId={navigationId}
          />
        )}
      </nav>
      <div className="study-sidebar__footer">
        {sidebarFooter && (
          <div className="study-sidebar__footer-action">
            {collapsed ? sidebarFooter.compact : sidebarFooter.full}
          </div>
        )}
        <div className="study-sidebar__settings">
          <ColorModeControl />
        </div>
        <div className="study-sidebar__settings-compact">
          <CompactColorModeControl />
        </div>
      </div>
      {collapsed && flyout && (
        <div className="study-sidebar__flyout" id={`${navigationId}-flyout`}>
          {flyout === "chapter" && chapterSection && (
            <div>
              <Link
                className="study-sidebar__flyout-title"
                to={chapterSection.to}
                onClick={() => setFlyout(null)}
              >
                {chapterSection.label}
              </Link>
              {chapterSection.render(() => setFlyout(null))}
            </div>
          )}
          {navigation
            .filter((item) => item.id === flyout)
            .map((item) => (
              <div key={item.id}>
                <Link
                  className="study-sidebar__flyout-title"
                  to={item.to}
                  onClick={() => setFlyout(null)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <ChildLinks
                    items={item.children}
                    path={path}
                    parentPath={currentParentTo}
                    onNavigate={() => setFlyout(null)}
                  />
                )}
              </div>
            ))}
        </div>
      )}
    </aside>
  );
}

export interface StudyShellProps {
  children: ReactNode;
  navigation: readonly NavigationItem[];
  chapterSection?: ChapterSection | undefined;
  sidebarFooter?: ShellActionSlot | undefined;
  quickActions?: ReactNode;
  currentParentTo?: string | undefined;
}

/** The StudyLuma frame around every page except the lesson views. */
export function StudyShell({
  children,
  navigation,
  chapterSection,
  sidebarFooter,
  quickActions,
  currentParentTo,
}: StudyShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(sidebarStorageKey) === "closed");
    } catch {
      // The open sidebar remains usable when storage is unavailable.
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarStorageKey, next ? "closed" : "open");
    } catch {
      // Keep the selected state for this session.
    }
  }

  return (
    <div className={`study-shell${collapsed ? " study-shell--collapsed" : ""}`}>
      <DesktopSidebar
        navigation={navigation}
        chapterSection={chapterSection}
        currentParentTo={currentParentTo}
        sidebarFooter={sidebarFooter}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />
      <StudyMobileHeader
        navigation={navigation}
        chapterSection={chapterSection}
        quickActions={quickActions}
        settings={<ColorModeControl />}
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
      >
        {children}
      </SiteShell>
    </div>
  );
}

export const courseIcon = <GraduationCap aria-hidden="true" />;
