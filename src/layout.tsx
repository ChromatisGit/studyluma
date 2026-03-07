import type { ReactNode } from "react";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@ui/contexts/ThemeContext";
import "@styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable}>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
