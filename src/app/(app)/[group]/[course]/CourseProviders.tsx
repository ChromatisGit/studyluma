"use client";

import type { ReactNode } from "react";
import { TsWorkerProvider } from "@features/contentpage";

type CourseProvidersProps = {
  children: ReactNode;
};

export function CourseProviders({ children }: CourseProvidersProps) {
  return <TsWorkerProvider>{children}</TsWorkerProvider>;
}
