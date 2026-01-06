"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useRouteContext } from "@/client/contexts/RouteContext";
import { useIsMobile } from "@lib/useMediaQuery";
import { Navbar } from "@layout/Navbar";
import { Sidebar } from "@layout/Sidebar";
import { Breadcrumbs } from "@layout/Breadcrumbs";
import styles from "./Layout.module.css";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const { hasTopicContext, pathname, worksheet } = useRouteContext();
  const isMobile = useIsMobile();

  const sidebarExists = isMobile || hasTopicContext;
  const isWorksheetRoute = pathname.startsWith("/worksheet") || Boolean(worksheet);

  const getSidebarDefaultState = useCallback((): boolean => {
    if (isMobile) return false;
    return !isWorksheetRoute;
  }, [isMobile, isWorksheetRoute]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(getSidebarDefaultState);
  const [hasEverInteracted, setHasEverInteracted] = useState(false);
  const prevWorksheetRef = useRef(isWorksheetRoute);
  const prevMobileRef = useRef(isMobile);

  useEffect(() => {
    const worksheetChanged = prevWorksheetRef.current !== isWorksheetRoute;
    const mobileChanged = prevMobileRef.current !== isMobile;
    prevWorksheetRef.current = isWorksheetRoute;
    prevMobileRef.current = isMobile;

    if (worksheetChanged || mobileChanged) {
      setHasEverInteracted(true);
      setIsSidebarOpen(getSidebarDefaultState());
    }
  }, [getSidebarDefaultState, isWorksheetRoute, isMobile]);

  const toggleSidebar = () => {
    setHasEverInteracted(true);
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className={styles.layout}>
      <Navbar
        onSidebarToggle={toggleSidebar}
        sidebarExists={sidebarExists}
        isSidebarOpen={isSidebarOpen}
      />

      <div className={styles.container}>
        {sidebarExists && (
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        )}

        <main
          className={[
            styles.main,
            sidebarExists ? styles.mainWithSidebar : "",
            isSidebarOpen ? styles.mainSidebarOpen : "",
            hasEverInteracted ? styles.mainAnimated : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.content}>
            {hasTopicContext ? <Breadcrumbs /> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
