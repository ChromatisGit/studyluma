"use client";

import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { UsernameModal } from "./UsernameModal";

type NewUserWelcomeModalProps = {
  username: string;
  activeQuizExists: boolean;
};

export function NewUserWelcomeModal({ username, activeQuizExists }: NewUserWelcomeModalProps) {
  const [open, setOpen] = useState(true);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleConfirm = () => {
    void fetcher.submit({ intent: "clear-new-user-username" }, { method: "post", action: "/access" });
    setOpen(false);
    if (activeQuizExists) {
      void navigate("/quiz");
    }
  };

  return <UsernameModal username={username} isOpen={open} onConfirm={handleConfirm} />;
}
