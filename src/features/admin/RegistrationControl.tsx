"use client";

import clsx from "clsx";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseId } from "@services/courseService";
import {
  closeRegistrationAction,
  getRegistrationStatusAction,
  openRegistrationAction,
} from "@actions/registrationActions";
import { Button } from "@components/Button";
import { Grid } from "@components/Grid";
import styles from "./RegistrationControl.module.css";
import ADMIN_TEXT from "./admin.de.json";

type RegistrationControlProps = {
  courseId: CourseId;
};

export function RegistrationControl({ courseId }: RegistrationControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUntil, setOpenUntil] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const router = useRouter();

  // Load initial status
  useEffect(() => {
    startTransition(async () => {
      const result = await getRegistrationStatusAction(courseId);
      if (result.ok) {
        setIsOpen(result.isOpen);
        setOpenUntil(result.openUntil);
      } else {
        toast.error(result.error);
      }
    });
  }, [courseId]);

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
    startTransition(async () => {
      const result = await openRegistrationAction(courseId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setIsOpen(true);
      setOpenUntil(result.openUntil);
      toast.success(ADMIN_TEXT.courseDetail.registration.openSuccessMessage);
      router.refresh();
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeRegistrationAction(courseId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setIsOpen(false);
      setOpenUntil(null);
      toast.success(ADMIN_TEXT.courseDetail.registration.closeSuccessMessage);
      router.refresh();
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

