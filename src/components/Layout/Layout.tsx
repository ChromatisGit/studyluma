"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useRouteContext } from "@/client/contexts/RouteContext";
import type { SidebarDTO } from "@domain/sidebarDTO";

import styles from "./Layout.module.css";
import { useIsMobile } from "@/client/lib/useMediaQuery";
import { Breadcrumbs } from "./Breadcrumbs/Breadcrumbs";
import { Navbar } from "./Navbar/Navbar";
import { Sidebar } from "./Sidebar/Sidebar";

type LayoutProps = {
  children: ReactNode;
  sidebarData: SidebarDTO;
  isAdmin: boolean;
  activeCourseLabel?: string | null;
  logoutAction: () => Promise<void>;
  fullWidth?: boolean;
};

export function Layout({
  children,
  sidebarData,
  isAdmin,
  activeCourseLabel,
  logoutAction,
  fullWidth = false,
}: LayoutProps) {
  const { hasTopicContext, topic } = useRouteContext();
  const isMobile = useIsMobile();

  const sidebarExists = isMobile || hasTopicContext;

  const getSidebarDefaultState = useCallback((): boolean => {
    if (isMobile) return false;
    if (!hasTopicContext || !topic) return false;

    const currentTopicStatus = sidebarData.topics.find(
      (entry) => entry.topicId === topic
    )?.status;

    return currentTopicStatus === "finished";
  }, [hasTopicContext, isMobile, sidebarData.topics, topic]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(getSidebarDefaultState);
  const [hasEverInteracted, setHasEverInteracted] = useState(false);
  const prevMobileRef = useRef(isMobile);
  const prevTopicRef = useRef(topic);

  useEffect(() => {
    const mobileChanged = prevMobileRef.current !== isMobile;
    const topicChanged = prevTopicRef.current !== topic;
    prevMobileRef.current = isMobile;
    prevTopicRef.current = topic;

    if (mobileChanged || topicChanged) {
      setHasEverInteracted(true);
      setIsSidebarOpen(getSidebarDefaultState());
    }
  }, [getSidebarDefaultState, isMobile, topic]);

  const toggleSidebar = () => {
    setHasEverInteracted(true);
    setIsSidebarOpen((prev) => !prev);
  };

  if (fullWidth) {
    return (
      <div className={styles.layout}>
        <Navbar
          onSidebarToggle={toggleSidebar}
          sidebarExists={sidebarExists}
          isSidebarOpen={isSidebarOpen}
          data={sidebarData}
          isAdmin={isAdmin}
          activeCourseLabel={activeCourseLabel}
          logoutAction={logoutAction}
        />

        {sidebarExists && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            data={sidebarData}
          />
        )}

        {children}
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Navbar
        onSidebarToggle={toggleSidebar}
        sidebarExists={sidebarExists}
        isSidebarOpen={isSidebarOpen}
        data={sidebarData}
        isAdmin={isAdmin}
        activeCourseLabel={activeCourseLabel}
        logoutAction={logoutAction}
      />

      <div className={styles.container}>
        {sidebarExists && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            data={sidebarData}
          />
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
            {hasTopicContext ? <Breadcrumbs data={sidebarData} /> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
