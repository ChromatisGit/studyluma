import { z } from "@chromatis/base/module";

/** An internal path: starts with one `/`, no scheme, no spaces. */
const internalPath = z.string().regex(/^\/(?!\/)[^\s\\]*$/, {
  message: "must be an internal path starting with /",
});

const label = z.string().trim().min(1).max(40).describe("Link text.");

const link = z
  .object({
    label,
    href: internalPath.describe("Internal path, such as /legal."),
    icon: z.enum(["house", "map"]).optional().describe("Sidebar icon."),
  })
  .strict();

/**
 * `config/shell.toml`: what an instance adds to the shell. Without the file
 * the shell has no extra navigation and its account slot is the login button.
 */
export const shellConfigSchema = z
  .object({
    /** Extra sidebar entries, shown above the courses (for example a landing page). */
    navigation: z
      .array(link)
      .default([])
      .describe(
        "Extra sidebar entries, shown above the courses (for example a landing page).",
      ),
    /** When set, replaces the login button in the account slot with this link. */
    account: link
      .optional()
      .describe(
        "When set, replaces the login button in the account slot with this link.",
      ),
  })
  .strict();

export type ShellConfig = z.output<typeof shellConfigSchema>;

/** The login button, used while an instance configures no account link. */
const LOGIN = { label: "Login", to: "/login" } as const;

/** What the shell renders from the configuration: sidebar entries and the account slot link. */
export function shellLinks(config: ShellConfig): {
  navigation: {
    id: string;
    label: string;
    to: string;
    icon?: "house" | "map";
  }[];
  account: { label: string; to: string };
} {
  return {
    navigation: config.navigation.map((entry, index) => ({
      id: `shell-${index}`,
      label: entry.label,
      to: entry.href,
      ...(entry.icon ? { icon: entry.icon } : {}),
    })),
    account: config.account
      ? { label: config.account.label, to: config.account.href }
      : LOGIN,
  };
}
