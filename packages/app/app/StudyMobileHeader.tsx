import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavigationItem } from "@chromatis/base/ui";
import {
  ChildLinks,
  containsPath,
  type ChapterSection,
} from "./StudyNavigationLinks";
import TEXT from "./app.de.json";

// The phone menu keeps the global and contextual links in one panel.
// eslint-disable-next-line max-lines-per-function
export function StudyMobileHeader({
  navigation,
  chapterSection,
  currentParentTo,
  quickActions,
  settings,
  accountControl,
}: {
  navigation: readonly NavigationItem[];
  chapterSection?: ChapterSection | undefined;
  currentParentTo?: string | undefined;
  quickActions?: ReactNode;
  settings: ReactNode;
  accountControl?: ReactNode;
}) {
  const location = useLocation();
  const path = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [chapterOpen, setChapterOpen] = useState(true);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const locationLabel =
    navigation
      .flatMap((item) => item.children ?? [])
      .find((item) => item.to === currentParentTo)?.label ??
    chapterSection?.label;
  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);
  return (
    <header className="study-mobile-header" ref={headerRef}>
      <div className="study-mobile-header__bar">
        <Link
          className="study-mobile-header__brand"
          to="/"
          aria-label={TEXT.brandLabel}
        >
          <span className="study-mobile-mark" aria-hidden="true">
            S
          </span>
          <span>{TEXT.brand}</span>
        </Link>
        {locationLabel && (
          <span className="study-mobile-header__location" title={locationLabel}>
            {locationLabel}
          </span>
        )}
        <div className="study-mobile-header__actions">
          {quickActions}
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-btn"
            aria-label={menuOpen ? TEXT.shell.closeMenu : TEXT.shell.menu}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="study-mobile-header__panel" id={menuId}>
          <nav aria-label={TEXT.shell.navigation}>
            {chapterSection && (
              <div className="study-mobile-header__section study-mobile-header__section--chapter">
                <button
                  type="button"
                  className="study-mobile-header__section-link study-mobile-header__section-button"
                  aria-expanded={chapterOpen}
                  onClick={() => setChapterOpen((previous) => !previous)}
                >
                  {chapterSection.label}
                  <ChevronDown aria-hidden="true" />
                </button>
                {chapterOpen && chapterSection.render(() => setMenuOpen(false))}
              </div>
            )}
            {navigation.map((item) => (
              <div className="study-mobile-header__section" key={item.id}>
                <div className="study-mobile-header__section-row">
                  {item.children?.length ? (
                    <button
                      type="button"
                      className="study-mobile-header__section-link study-mobile-header__section-button"
                      aria-expanded={
                        expanded[item.id] ??
                        containsPath(item, currentParentTo ?? path)
                      }
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [item.id]: !(
                            previous[item.id] ??
                            containsPath(item, currentParentTo ?? path)
                          ),
                        }))
                      }
                    >
                      {item.label}
                      <ChevronDown aria-hidden="true" />
                    </button>
                  ) : (
                    <Link
                      className="study-mobile-header__section-link"
                      to={item.to}
                      aria-current={path === item.to ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
                {!!item.children?.length &&
                  (expanded[item.id] ??
                    containsPath(item, currentParentTo ?? path)) && (
                    <ChildLinks
                      items={item.children}
                      path={path}
                      parentPath={currentParentTo}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  )}
              </div>
            ))}
          </nav>
          <div className="study-mobile-header__settings">{settings}</div>
          {accountControl && (
            <div className="study-mobile-header__account">{accountControl}</div>
          )}
        </div>
      )}
    </header>
  );
}
