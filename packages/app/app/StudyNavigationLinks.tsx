import { useId, useState, type ReactNode } from "react";
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
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <ul className="study-sidebar__children-list">
      {items.map((item) => (
        <ChildLinkItem
          key={item.id}
          item={item}
          path={path}
          parentPath={parentPath}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

function ChildLinkItem({
  item,
  path,
  parentPath,
  onNavigate,
}: {
  item: NavigationItem;
  path: string;
  parentPath?: string | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(containsPath(item, parentPath ?? path));
  const id = useId();
  const hasChildren = !!item.children?.length;
  return (
    <li>
      {hasChildren ? (
        <button
          type="button"
          className="study-sidebar__child study-sidebar__child-button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((previous) => !previous)}
        >
          {item.label}
        </button>
      ) : (
        <Link
          className="study-sidebar__child"
          to={item.to}
          aria-current={path === item.to ? "page" : undefined}
          data-parent={
            (parentPath === item.to && path !== item.to) || undefined
          }
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      )}
      {hasChildren && open && (
        <div id={id}>
          <ChildLinks
            items={item.children ?? []}
            path={path}
            parentPath={parentPath}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </li>
  );
}
