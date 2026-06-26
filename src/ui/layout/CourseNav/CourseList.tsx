import { Link, useLocation } from "react-router";
import clsx from "clsx";
import type { SidebarCourseDTO } from "@schema/courseTypes";
import { ConfigableIcon, type IconName } from "@components/ConfigableIcon";

type Props = {
  courses: SidebarCourseDTO[];
};

export function CourseList({ courses }: Props) {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col gap-0.5">
      {courses.map((course) => {
        const isActive = pathname.startsWith(course.href);
        const iconKey = (course.icon ?? "book-open") as IconName;
        return (
          <Link
            key={course.id}
            to={course.href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm no-underline transition-colors",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <ConfigableIcon iconKey={iconKey} size={16} className="flex-shrink-0" />
            <span className="truncate">{course.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
