import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import type { NavigationItem } from "@chromatis/base/ui";
import { fill } from "../src/helper/text";
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
  quickActions,
  settings,
}: {
  navigation: readonly NavigationItem[];
  chapterSection?: ChapterSection | undefined;
  quickActions?: ReactNode;
  settings: ReactNode;
}) {
  const path = useLocation().pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
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
            {navigation.map((item) => (
              <div className="study-mobile-header__section" key={item.id}>
                <div className="study-mobile-header__section-row">
                  <Link
                    className="study-mobile-header__section-link"
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {!!item.children?.length && (
                    <button
                      type="button"
                      className="study-mobile-header__disclosure"
                      aria-label={fill(TEXT.shell.pagesIn, {
                        section: item.label,
                      })}
                      aria-expanded={
                        expanded[item.id] ??
                        (!chapterSection && containsPath(item, path))
                      }
                      onClick={() =>
                        setExpanded((previous) => ({
                          ...previous,
                          [item.id]: !(
                            previous[item.id] ??
                            (!chapterSection && containsPath(item, path))
                          ),
                        }))
                      }
                    >
                      <ChevronDown aria-hidden="true" />
                    </button>
                  )}
                </div>
                {!!item.children?.length &&
                  (expanded[item.id] ??
                    (!chapterSection && containsPath(item, path))) && (
                    <ChildLinks
                      items={item.children}
                      path={path}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  )}
              </div>
            ))}
            {chapterSection && (
              <div className="study-mobile-header__section study-mobile-header__section--chapter">
                <Link
                  className="study-mobile-header__section-link"
                  to={chapterSection.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {chapterSection.label}
                </Link>
                {chapterSection.render(() => setMenuOpen(false))}
              </div>
            )}
          </nav>
          <div className="study-mobile-header__settings">{settings}</div>
        </div>
      )}
    </header>
  );
}
