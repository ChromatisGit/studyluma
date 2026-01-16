import { themes } from "prism-react-renderer";
import type { PrismTheme } from "prism-react-renderer";

// Shared Prism theme with a transparent background so it can sit behind overlays.
export const transparentCodeTheme: PrismTheme = {
  ...themes.vsDark,
  plain: {
    ...themes.vsDark.plain,
    backgroundColor: "transparent",
  },
};

export const codeTheme = transparentCodeTheme;
