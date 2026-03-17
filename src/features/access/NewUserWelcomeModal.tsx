"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearNewUserCodeAction } from "@actions/accessActions";
import { AccessCodeModal } from "./AccessCodeModal";

type NewUserWelcomeModalProps = {
  accessCode: string;
  activeQuizExists: boolean;
};

export function NewUserWelcomeModal({ accessCode, activeQuizExists }: NewUserWelcomeModalProps) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const handleConfirm = () => {
    clearNewUserCodeAction().catch(() => {});
    setOpen(false);
    if (activeQuizExists) {
      router.push("/quiz");
    }
  };

  return <AccessCodeModal accessCode={accessCode} isOpen={open} onConfirm={handleConfirm} />;
}
