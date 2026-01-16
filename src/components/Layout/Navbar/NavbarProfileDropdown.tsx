"use client";

import { ChevronDown, Key, LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { NavbarDropdown } from "./NavbarDropdown";
import styles from "./Navbar.module.css";

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
        <button className={styles.profileButton} aria-label="Profile menu">
          <User size={18} />
          {!isMobile ? <span>{userName || "Profile"}</span> : null}
          <ChevronDown
            size={14}
            className={`${styles.dropdownIcon} ${
              isOpen ? styles.dropdownIconOpen : ""
            }`.trim()}
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
          <span>Admin Panel</span>
        </button>
      ) : null}
      <button className={styles.dropdownItem} onClick={onLogout}>
        <LogOut size={16} />
        <span>Log out</span>
      </button>
    </NavbarDropdown>
  );
}
