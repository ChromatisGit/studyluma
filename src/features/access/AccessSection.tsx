import { useEffect, useState, type FormEvent } from "react";
import { useFetcher, useNavigate } from "react-router";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { Stack } from "@components/Stack";
import { IconBox } from "@components/IconBox";
import styles from "./AccessSection.module.css";
import ACCESS_TEXT from "./access.de.json";

type AccessSectionProps = {
  showRegister: boolean;
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  courseName: string;
  isRegistrationOpen: boolean;
  currentUserUsername: string | null;
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
  currentUserUsername,
  from,
}: AccessSectionProps) {
  // Default to "register" tab when joining a course (new students land here first)
  const [activeTab, setActiveTab] = useState<Tab>(showRegister ? "register" : "login");
  const [username, setUsername] = useState(currentUserUsername ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const fetcher = useFetcher<{ ok: false; error: string; redirectTo?: string }>();
  const isPending = fetcher.state !== "idle";
  const navigate = useNavigate();

  useEffect(() => {
    if (!fetcher.data) return;
    setError(fetcher.data.error);
    toast.error(fetcher.data.error);
    if (fetcher.data.redirectTo) void navigate(fetcher.data.redirectTo);
  }, [fetcher.data, navigate]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError("");
    setPin("");
    setPinConfirm("");
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (activeTab === "register" && pin !== pinConfirm) {
      setError(ACCESS_TEXT.section.pinMismatchError);
      return;
    }

    const submittedUsername = activeTab === "register" ? "" : username;

    void fetcher.submit({
      intent: "continue",
      username: submittedUsername,
      pin,
      isCourseJoin: String(isCourseJoin),
      groupKey: groupKey ?? "",
      courseId: courseId ?? "",
      courseRoute: courseRoute ?? "",
      isRegistrationOpen: String(isRegistrationOpen),
      from: from ?? "",
    }, {
      method: "post",
      action: "/access",
    });
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
                label={ACCESS_TEXT.section.usernameLabel}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={ACCESS_TEXT.section.usernamePlaceholder}
                disabled={isPending || !!currentUserUsername}
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
              onClick={() => navigate("/")}
              disabled={isPending}
            >
              {ACCESS_TEXT.section.backToHome}
            </Button>
          </Stack>
        </form>

        <p className={styles.footer}>{ACCESS_TEXT.section.helpText}</p>
      </div>
    </div>
  );
}
