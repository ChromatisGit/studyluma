"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseId } from "@/server/data/courses";
import {
  openRegistrationAction,
  closeRegistrationAction,
  getRegistrationStatusAction,
} from "@/server/admin/registrationActions";
import { Button } from "@components/Button";
import { Grid } from "@components/Grid";
import styles from "./RegistrationControl.module.css";

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
      setOpenUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      toast.success("Registration window opened (15 minutes)");
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
      toast.success("Registration window closed");
      router.refresh();
    });
  };

  return (
    <div className={styles.container}>
      {/* Status Display */}
      <div className={`${styles.statusCard} ${isOpen ? styles.statusOpen : styles.statusClosed}`}>
        <div className={styles.statusHeader}>
          <div className={styles.statusIndicator}>
            <span className={`${styles.statusDot} ${isOpen ? styles.dotOpen : styles.dotClosed}`} />
            <span className={styles.statusLabel}>
              {isOpen ? "Registration Open" : "Registration Closed"}
            </span>
          </div>
          {isOpen && timeRemaining && (
            <span className={styles.timer}>{timeRemaining}</span>
          )}
        </div>

        {isOpen && openUntil && (
          <p className={styles.statusText}>
            Students can join this course without an access code until{" "}
            {new Date(openUntil).toLocaleTimeString()}
          </p>
        )}

        {!isOpen && (
          <p className={styles.statusText}>
            Students need an access code to join this course
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
          {isPending && !isOpen ? "Opening..." : "Open Registration (15 min)"}
        </Button>

        <Button
          onClick={handleClose}
          disabled={isPending || !isOpen}
          variant="secondary"
        >
          {isPending && isOpen ? "Closing..." : "Close Registration"}
        </Button>
      </Grid>
    </div>
  );
}
