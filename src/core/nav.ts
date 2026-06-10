import { BookOpen, Settings, User } from "lucide-react";
import type { NavItem } from "@chromatis/base";

export const mainNavItems: readonly NavItem[] = [
  { path: "/", label: "Kurse", icon: BookOpen },
];

export const profileNavItem: NavItem = { path: "/profile", label: "Profil", icon: User };

export const adminNavItem: NavItem = { path: "/admin", label: "Admin", icon: Settings };
