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
import { continueAccessAction } from "@actions/accessActions";
import { AccessCodeModal } from "./AccessCodeModal";
import ACCESS_TEXT from "./access.de.json";

type AccessSectionProps = {
  showRegister: boolean;
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  courseName: string;
  isRegistrationOpen: boolean;
  currentUserAccessCode: string | null;
  from: string | null;
};

type Tab = "login" | "register";

export default function AccessSection({
  showRegister,
  isCourseJoin,
  groupKey,
  courseId,
  courseRoute,
  courseName,
  isRegistrationOpen,
  currentUserAccessCode,
  from,
}: AccessSectionProps) {
  // Default to "register" tab when joining a course (new students land here first)
  const [activeTab, setActiveTab] = useState<Tab>(showRegister ? "register" : "login");
  const [accessCode, setAccessCode] = useState(currentUserAccessCode ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const router = useRouter();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError("");
    setPin("");
    setPinConfirm("");
  };

  const handleContinue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (activeTab === "register" && pin !== pinConfirm) {
      setError(ACCESS_TEXT.section.pinMismatchError);
      return;
    }

    const submittedAccessCode = activeTab === "register" ? "" : accessCode;

    startTransition(async () => {
      const result = await continueAccessAction({
        accessCode: submittedAccessCode,
        pin,
        ctx: {
          isCourseJoin,
          groupKey,
          courseId,
          courseRoute,
          isRegistrationOpen,
          from,
        },
      });

      if (!result.ok) {
        setError(result.error);
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        toast.error(result.error);
        return;
      }

      if (result.accessCode) {
        setNewAccessCode(result.accessCode);
        setPendingRedirect(result.redirectTo);
      } else {
        window.location.href = result.redirectTo;
      }
    });
  };

  const handleModalConfirm = () => {
    setNewAccessCode(null);
    if (pendingRedirect) {
      window.location.href = pendingRedirect;
    }
  };

  const title = isCourseJoin
    ? ACCESS_TEXT.section.joinTitle.replace("{courseName}", courseName)
    : ACCESS_TEXT.section.welcomeTitle;

  const subtitle = isCourseJoin
    ? ACCESS_TEXT.section.joinSubtitle
    : ACCESS_TEXT.section.loginSubtitle;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <IconBox icon={BookOpen} color="purple" size="lg" />
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        {showRegister && (
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "register"}
              className={`${styles.tab} ${activeTab === "register" ? styles.tabActive : ""}`}
              onClick={() => handleTabChange("register")}
              disabled={isPending}
            >
              {ACCESS_TEXT.section.tabRegister}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "login"}
              className={`${styles.tab} ${activeTab === "login" ? styles.tabActive : ""}`}
              onClick={() => handleTabChange("login")}
              disabled={isPending}
            >
              {ACCESS_TEXT.section.tabLogin}
            </button>
          </div>
        )}

        <form onSubmit={handleContinue}>
          <Stack gap="md">
            {activeTab === "login" && (
              <Input
                label={ACCESS_TEXT.section.accessCodeLabel}
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder={ACCESS_TEXT.section.accessCodePlaceholder}
                disabled={isPending || !!currentUserAccessCode}
              />
            )}

            <Input
              label={
                activeTab === "register"
                  ? ACCESS_TEXT.section.pinLabelChoose
                  : ACCESS_TEXT.section.pinLabel
              }
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder={ACCESS_TEXT.section.pinPlaceholder}
              disabled={isPending}
            />

            {activeTab === "register" && (
              <Input
                label={ACCESS_TEXT.section.pinConfirmLabel}
                type="password"
                value={pinConfirm}
                onChange={(event) => setPinConfirm(event.target.value)}
                placeholder={ACCESS_TEXT.section.pinConfirmPlaceholder}
                disabled={isPending}
              />
            )}

            {error ? <div className={styles.message}>{error}</div> : null}

            <Button type="submit" variant="primary" fullWidth disabled={isPending}>
              {isPending
                ? ACCESS_TEXT.section.processing
                : activeTab === "login"
                  ? isCourseJoin
                    ? ACCESS_TEXT.section.joinButton
                    : ACCESS_TEXT.section.loginButton
                  : ACCESS_TEXT.section.registerJoinButton}
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
