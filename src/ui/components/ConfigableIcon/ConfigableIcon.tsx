"use client";

import { useEffect, useState } from "react";
import { BookOpen, type LucideIcon, type LucideProps } from "lucide-react";

import dynamicIconImports from "lucide-react/dynamicIconImports";

const courseIconCache = new Map<string, LucideIcon>();
export type IconName = keyof typeof dynamicIconImports;

type ConfigableIconProps = {
  iconKey: IconName;
} & LucideProps;

export function ConfigableIcon({ iconKey, ...iconProps }: ConfigableIconProps) {
  const [Icon, setIcon] = useState<LucideIcon>(() => {
    return courseIconCache.get(iconKey) ?? BookOpen;
  });

  useEffect(() => {
    if (!iconKey) return;

    const cached = courseIconCache.get(iconKey);
    if (cached) {
      setIcon(() => cached);
      return;
    }

    let cancelled = false;

    const importer = dynamicIconImports[iconKey];

    if (!importer) return;

    importer().then(({ default: Loaded }) => {
      if (cancelled) return;
      courseIconCache.set(iconKey, Loaded);
      setIcon(() => Loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [iconKey]);

  return <Icon aria-hidden {...iconProps} />;
}
