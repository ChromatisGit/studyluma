"use client";

import clsx from "clsx";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import type { CourseId } from "@schema/courseTypes";
import { Button } from "@components/Button";
import { Grid } from "@components/Grid";
import { useDemoOverrides } from "@ui/demo/DemoOverrideContext";
import { postAdminAction } from "./routeActions";
import styles from "./RegistrationControl.module.css";
import ADMIN_TEXT from "./admin.de.json";

type RegistrationControlProps = {
  courseId: CourseId;
};

export function RegistrationControl({ courseId }: RegistrationControlProps) {
  const { isDemoMode, getOverride, setRegistrationOpen: setDemoRegistration } = useDemoOverrides();

  const [isOpen, setIsOpen] = useState(false);
  const [openUntil, setOpenUntil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Load initial status
  useEffect(() => {
    if (isDemoMode) {
      // Read from demo override store (populated after localStorage loads)
      const override = getOverride(courseId);
      const open = override.registrationOpen ?? false;
      setIsOpen(open);
      if (open) {
        setOpenUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      }
      return;
    }
    startTransition(async () => {
      const result = await postAdminAction<{ isOpen: boolean; openUntil: string | null }>({
        intent: "registration-status",
        courseId,
      });
      if (result.ok) {
        setIsOpen(Boolean(result.data?.isOpen));
        setOpenUntil(result.data?.openUntil ?? null);
      } else {
        toast.error(result.error);
      }
    });
    // isDemoMode is stable (never changes mid-session); getOverride intentionally excluded
    // to avoid re-firing the status check on every unrelated store mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isDemoMode]);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen || !openUntil) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const until = new Date(openUntil).getTime();
      const diff = until - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        setIsOpen(false);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, openUntil]);

  const handleOpen = () => {
    if (isDemoMode) {
      setDemoRegistration(courseId, true);
      setIsOpen(true);
      setOpenUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      toast.success(ADMIN_TEXT.courseDetail.registration.openSuccessMessage);
      return;
    }
    startTransition(async () => {
      const result = await postAdminAction<{ openUntil: string | null }>({
        intent: "open-registration",
        courseId,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setIsOpen(true);
      setOpenUntil(result.data?.openUntil ?? null);
      toast.success(ADMIN_TEXT.courseDetail.registration.openSuccessMessage);
    });
  };

  const handleClose = () => {
    if (isDemoMode) {
      setDemoRegistration(courseId, false);
      setIsOpen(false);
      setOpenUntil(null);
      toast.success(ADMIN_TEXT.courseDetail.registration.closeSuccessMessage);
      return;
    }
    startTransition(async () => {
      const result = await postAdminAction<{ openUntil: string | null }>({
        intent: "close-registration",
        courseId,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setIsOpen(false);
      setOpenUntil(null);
      toast.success(ADMIN_TEXT.courseDetail.registration.closeSuccessMessage);
    });
  };

  return (
    <div className={styles.container}>
      {/* Status Display */}
      <div className={clsx(styles.statusCard, isOpen ? styles.statusOpen : styles.statusClosed)}>
        <div className={styles.statusHeader}>
          <div className={styles.statusIndicator}>
            <span className={clsx(styles.statusDot, isOpen ? styles.dotOpen : styles.dotClosed)} />
            <span className={styles.statusLabel}>
              {isOpen ? ADMIN_TEXT.courseDetail.registration.statusOpen : ADMIN_TEXT.courseDetail.registration.statusClosed}
            </span>
          </div>
          {isOpen && timeRemaining && (
            <span className={styles.timer}>{timeRemaining}</span>
          )}
        </div>

        {isOpen && openUntil && (
          <p className={styles.statusText}>
            {ADMIN_TEXT.courseDetail.registration.openMessage}{" "}
            {new Date(openUntil).toLocaleTimeString()}
          </p>
        )}

        {!isOpen && (
          <p className={styles.statusText}>
            {ADMIN_TEXT.courseDetail.registration.closedMessage}
          </p>
        )}
      </div>

      {/* Control Buttons */}
      <Grid minItemWidth={180}>
        <Button
          onClick={handleOpen}
          disabled={isPending || isOpen}
          variant="primary"
        >
          {isPending && !isOpen ? ADMIN_TEXT.courseDetail.registration.opening : ADMIN_TEXT.courseDetail.registration.openButton}
        </Button>

        <Button
          onClick={handleClose}
          disabled={isPending || !isOpen}
          variant="secondary"
        >
          {isPending && isOpen ? ADMIN_TEXT.courseDetail.registration.closing : ADMIN_TEXT.courseDetail.registration.closeButton}
        </Button>
      </Grid>
    </div>
  );
}
