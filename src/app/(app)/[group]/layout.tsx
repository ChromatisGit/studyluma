import type { ReactNode } from "react";

type GroupLayoutProps = {
  children: ReactNode;
};

export default function GroupLayout({ children }: GroupLayoutProps) {
  return <>{children}</>;
}
