import type { ReactNode } from "react";
import { Link } from "react-router";
import type { NavigationItem } from "@chromatis/base/ui";

export interface ChapterSection {
  label: string;
  to: string;
  render: (onNavigate?: () => void) => ReactNode;
}

export function containsPath(item: NavigationItem, path: string): boolean {
  return (
    item.to === path ||
    !!item.children?.some((child) => containsPath(child, path))
  );
}

export function ChildLinks({
  items,
  path,
  parentPath,
  onNavigate,
}: {
  items: readonly NavigationItem[];
  path: string;
  parentPath?: string | undefined;
  onNavigate?: () => void;
}) {
  return (
    <ul className="study-sidebar__children-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            className="study-sidebar__child"
            to={item.to}
            aria-current={
              path === item.to
                ? "page"
                : parentPath === item.to
                  ? "true"
                  : undefined
            }
            onClick={onNavigate}
          >
            {item.label}
          </Link>
          {!!item.children?.length && (
            <ChildLinks
              items={item.children}
              path={path}
              parentPath={parentPath}
              {...(onNavigate ? { onNavigate } : {})}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
