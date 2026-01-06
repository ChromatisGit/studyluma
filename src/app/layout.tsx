import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@styles/globals.css";
import { getSession } from "@/server/auth/auth";
import { Providers } from "./providers";

const themeInitScript = `
(function () {
  try {
    var theme = "light";
    var stored = localStorage.getItem("sn-theme");
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: "StudyNode",
  description: "Lernplattform mit Next.js Komponenten",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers initialSession={session}>{children}</Providers>
      </body>
    </html>
  );
}
