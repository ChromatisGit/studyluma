"use client";

import { usePathname } from "next/navigation";
import { Home, BookOpen, Brain, GraduationCap, User, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { AppLink } from "@components/AppLink";
import styles from "./MobileNav.module.css";

type MobileNavProps = {
  isAuthenticated: boolean;
  lastCourseHref: string | null;
  isAdmin: boolean;
};

export function MobileNav({ isAuthenticated, lastCourseHref, isAdmin }: MobileNavProps) {
  const pathname = usePathname();

  if (!isAuthenticated) return null;

  const courseHref = lastCourseHref ?? "/home";

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/practice", icon: BookOpen, label: "Practice" },
    isAdmin
      ? { href: "/admin", icon: ShieldCheck, label: "Admin" }
      : { href: "/quiz", icon: Brain, label: "Quiz" },
    { href: courseHref, icon: GraduationCap, label: "Course" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home";
    if (href === "/profile") return pathname === "/profile";
    if (href === "/practice") return pathname.startsWith("/practice");
    if (href === "/quiz") return pathname.startsWith("/quiz");
    if (href === "/admin") return pathname.startsWith("/admin");
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
