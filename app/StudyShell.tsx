import { useEffect, useId, useState, type ReactNode } from "react";
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
      <div className="study-sidebar__appearance">
        <span className="study-sidebar__appearance-label">
          {TEXT.colorMode.label}
        </span>
        <button
          type="button"
          className="study-sidebar__theme-button"
          aria-label={dark ? TEXT.colorMode.toLight : TEXT.colorMode.toDark}
          title={dark ? TEXT.colorMode.toLight : TEXT.colorMode.toDark}
          onClick={() => setMode(dark ? "light" : "dark")}
        >
          {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
      </div>
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
          title={collapsed ? section.label : undefined}
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
                    title={collapsed ? item.label : undefined}
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
                    title={collapsed ? item.label : undefined}
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
  const [collapsed, setCollapsed] = useState(false);
  const [animateSidebar, setAnimateSidebar] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(sidebarStorageKey) === "closed");
    } catch {
      // The open sidebar remains usable when storage is unavailable.
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setAnimateSidebar(true);
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarStorageKey, next ? "closed" : "open");
    } catch {
      // Keep the selected state for this session.
    }
  }

  function expandSidebar() {
    setAnimateSidebar(true);
    setCollapsed(false);
    try {
      localStorage.setItem(sidebarStorageKey, "open");
    } catch {
      // Keep the expanded state for this session.
    }
  }

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
