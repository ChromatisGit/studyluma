"use client";

import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, ArrowLeftRight, User, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { AppLink } from "@components/AppLink";
import styles from "./MobileNav.module.css";

type MobileNavProps = {
  isAuthenticated: boolean;
  primaryCourseHref: string | null;
  isAdmin: boolean;
  enrolledCoursesCount: number;
};

export function MobileNav({ isAuthenticated, primaryCourseHref, isAdmin, enrolledCoursesCount }: MobileNavProps) {
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  const courseHref = primaryCourseHref ?? "/practice";

  const navItems = [
    { href: "/practice", icon: BookOpen, label: "Practice" },
    { href: courseHref, icon: GraduationCap, label: "Kurs" },
    ...(enrolledCoursesCount >= 2 ? [{ href: "/courses", icon: ArrowLeftRight, label: "Wechseln" }] : []),
    ...(isAdmin ? [{ href: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
    { href: "/profile", icon: User, label: "Profil" },
  ];

  const isActive = (href: string) => {
    if (href === "/profile") return pathname === "/profile";
    if (href === "/practice") return pathname.startsWith("/practice");
    if (href === "/admin") return pathname.startsWith("/admin");
    if (href === "/courses") return pathname === "/courses";
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      {navItems.map(({ href, icon: Icon, label }) => (
        <AppLink
          key={href}
          href={href}
          className={clsx(styles.tab, isActive(href) && styles.active)}
          aria-label={label}
        >
          <Icon size={22} aria-hidden />
          <span className={styles.label}>{label}</span>
        </AppLink>
      ))}
    </nav>
  );
}
