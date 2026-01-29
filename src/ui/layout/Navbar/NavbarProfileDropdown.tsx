"use client";

import clsx from "clsx";
import { ChevronDown, Key, LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { NavbarDropdown } from "./NavbarDropdown";
import styles from "./Navbar.module.css";
import LAYOUT_TEXT from "../layout.de.json";

type NavbarProfileDropdownProps = {
  onLogout: () => void;
  isMobile: boolean;
  userName?: string;
  isAdmin?: boolean;
  adminPanelLink?: string;
  accessCode?: string;
};

export function NavbarProfileDropdown({
  onLogout,
  isMobile,
  userName,
  isAdmin,
  adminPanelLink,
  accessCode,
}: NavbarProfileDropdownProps) {
  const router = useRouter();

  return (
    <NavbarDropdown
      trigger={(isOpen) => (
        <button className={styles.profileButton} aria-label={LAYOUT_TEXT.navbar.profileMenu}>
          <User size={18} />
          {!isMobile ? <span>{userName || LAYOUT_TEXT.navbar.profile}</span> : null}
          <ChevronDown
            size={14}
            className={clsx(styles.dropdownIcon, isOpen && styles.dropdownIconOpen)}
          />
        </button>
      )}
      align="right"
    >
      {accessCode ? (
        <div className={styles.dropdownItem}>
          <Key size={16} />
          <span>{accessCode}</span>
        </div>
      ) : null}
      {isAdmin ? (
        <button
          className={styles.dropdownItem}
          onClick={() => router.push(adminPanelLink || "/admin")}
        >
          <Shield size={16} />
          <span>{LAYOUT_TEXT.navbar.adminPanel}</span>
        </button>
      ) : null}
      <button className={styles.dropdownItem} onClick={onLogout}>
        <LogOut size={16} />
        <span>{LAYOUT_TEXT.navbar.logOut}</span>
      </button>
    </NavbarDropdown>
  );
}
