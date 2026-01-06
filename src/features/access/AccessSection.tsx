"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

import styles from "./AccessPage.module.css";
import { useMockAuth } from "@/client/contexts/MockAuthContext";
import type { User } from "@domain/userTypes";
import { isAdmin } from "@domain/userTypes";
import { continueAccessAction } from "@/server/auth/accessAction";

type AccessSectionProps = {
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  courseName: string;
  isRegistrationOpen: boolean;
};

function hasCourseAccessClient(user: User, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.groupKey !== groupKey) return false;
  return user.courseIds.includes(courseId);
}

export default function AccessSection({
  isCourseJoin,
  groupKey,
  courseId,
  courseRoute,
  courseName,
  isRegistrationOpen,
}: AccessSectionProps) {
  const [accessCode, setAccessCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const auth = useMockAuth();

  // If already logged in and already has access to the course, redirect directly
  useEffect(() => {
    if (
      !auth.isAuthenticated ||
      !auth.user ||
      !isCourseJoin ||
      !groupKey ||
      !courseId ||
      !courseRoute
    ) {
      return;
    }

    if (!hasCourseAccessClient(auth.user, groupKey, courseId)) return;
    router.push(courseRoute);
  }, [
    auth.isAuthenticated,
    auth.user,
    courseRoute,
    courseId,
    router,
    groupKey,
    isCourseJoin,
  ]);

  const handleContinue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await continueAccessAction({
        accessCode,
        pin,
        ctx: {
          isCourseJoin,
          groupKey,
          courseId,
          courseRoute,
          isRegistrationOpen,
        },
        currentUserId: auth.user?.id ?? null,
      });

      if (!result.ok) {
        setError(result.error);
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }

        toast.error(result.error);
        return;
      }

      // Update mock auth with the user that the server action decided on
      const needsLoginChange = !auth.user || auth.user.id !== result.session.user.id;

      if (needsLoginChange) {
        auth.setSession(result.session);
      }

      router.push(result.redirectTo);
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <BookOpen size={28} aria-hidden />
          </div>
          <h1 className={styles.title}>
            {isCourseJoin ? `Join ${courseName}` : "Welcome to StudyNode"}
          </h1>
          <p className={styles.subtitle}>
            {isCourseJoin
              ? "Enter your credentials to join this course."
              : "Enter your credentials to continue."}
          </p>
        </header>

        <form onSubmit={handleContinue} className={styles.form}>
          <div>
            <label htmlFor="accessCode" className={styles.labelRow}>
              Access Code
              {isCourseJoin ? <span className={styles.optional}>(Optional)</span> : null}
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              className={styles.input}
              placeholder={
                isCourseJoin ? "Enter access code if you have one" : "Enter your access code"
              }
              disabled={isPending}
            />
            {isCourseJoin ? (
              <p className={styles.helper}>If registration is open, you can use only your PIN.</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="pin" className={styles.labelRow}>
              PIN
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className={styles.input}
              placeholder="Enter your PIN"
              disabled={isPending}
            />
          </div>

          {error ? <div className={styles.message}>{error}</div> : null}

          <button
            type="submit"
            className={`${styles.submitButton} button button--primary`}
            disabled={isPending}
          >
            {isPending ? "Processing..." : "Continue"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className={styles.linkButton}
            disabled={isPending}
          >
            Back to home
          </button>
        </form>

        <p className={styles.footer}>Need help? Contact your instructor.</p>
      </div>
    </div>
  );
}
