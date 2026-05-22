"use client";

import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { AccessCodeModal } from "./AccessCodeModal";

type NewUserWelcomeModalProps = {
  accessCode: string;
  activeQuizExists: boolean;
};

export function NewUserWelcomeModal({ accessCode, activeQuizExists }: NewUserWelcomeModalProps) {
  const [open, setOpen] = useState(true);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleConfirm = () => {
    void fetcher.submit({ intent: "clear-new-user-code" }, { method: "post", action: "/access" });
    setOpen(false);
    if (activeQuizExists) {
      void navigate("/quiz");
    }
  };

  return <AccessCodeModal accessCode={accessCode} isOpen={open} onConfirm={handleConfirm} />;
}
