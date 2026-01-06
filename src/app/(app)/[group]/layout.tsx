import type { ReactNode } from "react";

// TODO: you need to be logged in and have the permission to access this group (by being part of the group or admin)
// When you are on the course layer you also need access to the course as well
// Otherwise redirect to /access
export default function GroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
