"use client";

import clsx from "clsx";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: never;
  };

type ButtonAsLink = ButtonBaseProps & {
  href: string;
  disabled?: never;
  type?: never;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  href,
  ...props
}: ButtonProps) {
  const buttonClass = clsx(
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    fullWidth && styles.fullWidth,
    className
  );

  if (href) {
    // Use regular anchor for hash links, Next.js Link for routes
    if (href.startsWith("#")) {
      return (
        <a href={href} className={buttonClass}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={buttonClass}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClass} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
