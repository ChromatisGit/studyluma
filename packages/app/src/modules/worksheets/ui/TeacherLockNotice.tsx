import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import "./teacher-lock-notice.css";

/** For teachers: this page is locked for students, who cannot open it yet. */
export function TeacherLockNotice({ children }: { children: ReactNode }) {
  return (
    <p className="lock-notice" role="note">
      <Lock className="icon" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
