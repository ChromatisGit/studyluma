"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./Navbar.module.css";

type NavbarDropdownProps = {
  trigger: ((isOpen: boolean) => ReactNode) | ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
};

export function NavbarDropdown({
  trigger,
  children,
  align = "left",
  className = "",
}: NavbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClickOpen, setIsClickOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsClickOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    const next = !isClickOpen;
    setIsClickOpen(next);
    setIsOpen(next);
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (!isClickOpen) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isClickOpen) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  const renderedTrigger = typeof trigger === "function" ? trigger(isOpen) : trigger;

  return (
    <div
      className={clsx(styles.dropdown, className)}
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleClick} aria-expanded={isOpen}>
        {renderedTrigger}
      </div>
      {isOpen ? (
        <div className={clsx(styles.dropdownMenu, align === "right" && styles.dropdownMenuRight)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
