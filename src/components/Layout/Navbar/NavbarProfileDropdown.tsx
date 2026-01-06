"use client";

import { ChevronDown, LogOut, Shield, User } from "lucide-react";

import { NavbarDropdown } from "./NavbarDropdown";
import styles from "./Navbar.module.css";

type NavbarProfileDropdownProps = {
  onLogout: () => void;
  isMobile: boolean;
  userName?: string;
  isAdmin?: boolean;
};

export function NavbarProfileDropdown({
  onLogout,
  isMobile,
  userName,
  isAdmin,
}: NavbarProfileDropdownProps) {
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
      {isAdmin ? (
        <div className={styles.dropdownItem} style={{ cursor: "default", opacity: 0.7 }}>
          <Shield size={16} />
          <span>Admin User</span>
        </div>
      ) : null}
      <button className={styles.dropdownItem} onClick={onLogout}>
        <LogOut size={16} />
        <span>Log out</span>
      </button>
    </NavbarDropdown>
  );
}
