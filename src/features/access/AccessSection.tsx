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
import { useMockAuth } from "@ui/contexts/MockAuthContext";
import { continueAccessAction } from "@actions/accessActions";
import { AccessCodeModal } from "./AccessCodeModal";
import ACCESS_TEXT from "./access.de.json";

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
            {isCourseJoin ? ACCESS_TEXT.section.joinTitle.replace("{courseName}", courseName) : ACCESS_TEXT.section.welcomeTitle}
          </h1>
          <p className={styles.subtitle}>
            {isCourseJoin
              ? ACCESS_TEXT.section.joinSubtitle
              : ACCESS_TEXT.section.loginSubtitle}
          </p>
        </header>

        <form onSubmit={handleContinue}>
          <Stack gap="md">
            <Input
              label={ACCESS_TEXT.section.accessCodeLabel}
              hint={isCourseJoin && !currentUserAccessCode ? ACCESS_TEXT.section.accessCodeOptional : undefined}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder={
                isCourseJoin && !currentUserAccessCode
                  ? ACCESS_TEXT.section.accessCodePlaceholderJoin
                  : ACCESS_TEXT.section.accessCodePlaceholder
              }
              disabled={isPending || !!currentUserAccessCode}
              helperText={
                isCourseJoin && !currentUserAccessCode
                  ? ACCESS_TEXT.section.accessCodeHelper
                  : undefined
              }
            />

            <Input
              label={ACCESS_TEXT.section.pinLabel}
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder={ACCESS_TEXT.section.pinPlaceholder}
              disabled={isPending}
            />

            {error ? <div className={styles.message}>{error}</div> : null}

            <Button type="submit" variant="primary" fullWidth disabled={isPending}>
              {isPending ? ACCESS_TEXT.section.processing : ACCESS_TEXT.section.continueButton}
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => router.push("/")}
              disabled={isPending}
            >
              {ACCESS_TEXT.section.backToHome}
            </Button>
          </Stack>
        </form>

        <p className={styles.footer}>{ACCESS_TEXT.section.helpText}</p>
      </div>

      <AccessCodeModal
        accessCode={newAccessCode ?? ""}
        isOpen={!!newAccessCode}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
