"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { Stack } from "@components/Stack";
import { IconBox } from "@components/IconBox";
import styles from "./AccessSection.module.css";
import { useMockAuth } from "@/client/contexts/MockAuthContext";
import { continueAccessAction } from "@/server/auth/accessAction";
import { AccessCodeModal } from "./AccessCodeModal";

type AccessSectionProps = {
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  courseName: string;
  isRegistrationOpen: boolean;
  currentUserAccessCode: string | null;
};

export default function AccessSection({
  isCourseJoin,
  groupKey,
  courseId,
  courseRoute,
  courseName,
  isRegistrationOpen,
  currentUserAccessCode,
}: AccessSectionProps) {
  const [accessCode, setAccessCode] = useState(currentUserAccessCode ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const router = useRouter();
  const auth = useMockAuth();

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

      auth.setSession(result.session);

      // If this is a new registration, show the access code modal before redirecting
      if (result.accessCode) {
        setNewAccessCode(result.accessCode);
        setPendingRedirect(result.redirectTo);
      } else {
        // Hard navigation to ensure fresh server data (session cookie changed)
        window.location.href = result.redirectTo;
      }
    });
  };

  const handleModalConfirm = () => {
    setNewAccessCode(null);
    if (pendingRedirect) {
      // Hard navigation to ensure fresh server data (session cookie changed)
      window.location.href = pendingRedirect;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <IconBox icon={BookOpen} color="purple" size="lg" />
          <h1 className={styles.title}>
            {isCourseJoin ? `Join ${courseName}` : "Welcome to StudyNode"}
          </h1>
          <p className={styles.subtitle}>
            {isCourseJoin
              ? "Enter your credentials to join this course."
              : "Enter your credentials to continue."}
          </p>
        </header>

        <form onSubmit={handleContinue}>
          <Stack gap="md">
            <Input
              label="Access Code"
              hint={isCourseJoin && !currentUserAccessCode ? "(Optional)" : undefined}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder={
                isCourseJoin && !currentUserAccessCode
                  ? "Enter access code if you have one"
                  : "Enter your access code"
              }
              disabled={isPending || !!currentUserAccessCode}
              helperText={
                isCourseJoin && !currentUserAccessCode
                  ? "If registration is open, you can use only your PIN."
                  : undefined
              }
            />

            <Input
              label="PIN"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter your PIN"
              disabled={isPending}
            />

            {error ? <div className={styles.message}>{error}</div> : null}

            <Button type="submit" variant="primary" fullWidth disabled={isPending}>
              {isPending ? "Processing..." : "Continue"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => router.push("/")}
              disabled={isPending}
            >
              Back to home
            </Button>
          </Stack>
        </form>

        <p className={styles.footer}>Need help? Contact your instructor.</p>
      </div>

      <AccessCodeModal
        accessCode={newAccessCode ?? ""}
        isOpen={!!newAccessCode}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
