"use client";

import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { isExternalHref, isHashHref, normalizeHref, resolveLinkRel } from "@ui/lib/links";

export type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
  active?: boolean;
  activeClassName?: string;
};

export function AppLink({
  href,
  target,
  rel,
  prefetch,
  children,
  active,
  activeClassName,
  className,
  ...rest
}: AppLinkProps) {
  const normalizedHref = normalizeHref(href);
  const useAnchorElement = isExternalHref(normalizedHref) || isHashHref(normalizedHref);
  const resolvedRel = resolveLinkRel(target, rel);
  const finalClassName = clsx(
    className,
    active ? activeClassName ?? "navbar__link--active" : null
  );

  if (useAnchorElement) {
    return (
      <a
        href={normalizedHref}
        target={target}
        rel={resolvedRel}
        aria-current={active ? "page" : undefined}
        className={finalClassName}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={normalizedHref}
      prefetch={prefetch}
      target={target}
      rel={resolvedRel}
      aria-current={active ? "page" : undefined}
      className={finalClassName}
      {...rest}
    >
      {children}
    </Link>
  );
}
