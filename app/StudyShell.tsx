import type { ReactNode } from "react";
import {
  ChevronDown,
  GraduationCap,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import {
  Select,
  SiteShell,
  useColorMode,
  type ColorMode,
  type NavigationItem,
  type ShellActionSlot,
} from "@chromatis/base/ui";
import { fill } from "../src/helper/text";
import TEXT from "./app.de.json";

const colorModeKey = "studyluma:color-mode";

export const studyColorModeKey = colorModeKey;

function ColorModeControl() {
  const [mode, setMode] = useColorMode(colorModeKey);
  return (
    <Select
      label={TEXT.colorMode.label}
      visuallyHiddenLabel
      value={mode}
      onChange={(event) => setMode(event.target.value as ColorMode)}
      options={(["system", "light", "dark"] as const).map((value) => ({
        value,
        label: TEXT.colorMode[value],
      }))}
    />
  );
}

export interface StudyShellProps {
  children: ReactNode;
  navigation: readonly NavigationItem[];
  /** Pinned to the bottom of the sidebar, e.g. the view switch. */
  sidebarFooter?: ShellActionSlot | undefined;
  /** Phone masthead controls; repeat the sidebar footer control here. */
  quickActions?: ReactNode;
  currentParentTo?: string | undefined;
}

/** The StudyLuma frame around every page except the lesson views. */
export function StudyShell({
  children,
  navigation,
  sidebarFooter,
  quickActions,
  currentParentTo,
}: StudyShellProps) {
  return (
    <SiteShell
      brand={
        <>
          <img className="brand__logo" src="/favicon.svg" alt="" />
          <span className="brand__name">{TEXT.brand}</span>
        </>
      }
      brandTo="/"
      brandLabel={TEXT.brandLabel}
      navigation={navigation}
      labels={{
        ...TEXT.shell,
        pagesIn: (section) => fill(TEXT.shell.pagesIn, { section }),
      }}
      icons={{
        menu: <Menu aria-hidden="true" />,
        close: <X aria-hidden="true" />,
        expand: <ChevronDown aria-hidden="true" />,
        sidebarOpen: <PanelLeftClose aria-hidden="true" />,
        sidebarClosed: <PanelLeftOpen aria-hidden="true" />,
      }}
      settings={{ compact: <ColorModeControl />, full: <ColorModeControl /> }}
      {...(sidebarFooter ? { sidebarFooter } : {})}
      {...(currentParentTo ? { currentParentTo } : {})}
      quickActions={quickActions}
      sidebarStorageKey="studyluma:sidebar"
    >
      {children}
    </SiteShell>
  );
}

export const courseIcon = <GraduationCap aria-hidden="true" />;
