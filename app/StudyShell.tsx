import { type ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { Select, SiteShell, useColorMode } from "@chromatis/base/ui";

const storageKey = "studyluma:color-mode";

const navigationIcons: Record<string, ReactNode> = {
  courses: <BookOpen className="icon" aria-hidden="true" />,
  roadmap: <Map className="icon" aria-hidden="true" />,
};

function ThemeControl() {
  const [mode, choose] = useColorMode(storageKey);
  return (
    <Select
      label="Farbschema"
      visuallyHiddenLabel
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Hell" },
        { value: "dark", label: "Dunkel" },
      ]}
      value={mode}
      onChange={(event) =>
        choose(event.target.value as "system" | "light" | "dark")
      }
    />
  );
}

export function StudyShell({
  children,
  coursesPath = "/",
  navigation = [{ id: "courses", label: "Meine Kurse", to: coursesPath }],
}: {
  children: ReactNode;
  coursesPath?: string;
  navigation?: { id: string; label: string; to: string; icon?: ReactNode }[];
}) {
  const navigationWithIcons = navigation.map((item) => ({
    ...item,
    icon: item.icon ?? navigationIcons[item.id],
  }));

  return (
    <SiteShell
      brand={<strong>StudyLuma</strong>}
      brandTo="/"
      brandLabel="StudyLuma Startseite"
      navigation={navigationWithIcons}
      bottomNavigation={navigationWithIcons}
      labels={{
        skipToContent: "Zum Inhalt springen",
        navigation: "Hauptnavigation",
        bottomNavigation: "Schnellzugriff",
        menu: "Menü öffnen",
        closeMenu: "Menü schließen",
        showSidebar: "Navigation ausklappen",
        hideSidebar: "Navigation einklappen",
        pagesIn: (section) => `Seiten in ${section}`,
      }}
      icons={{
        menu: <Menu aria-hidden="true" />,
        close: <X aria-hidden="true" />,
        expand: <ChevronDown aria-hidden="true" />,
        sidebarOpen: <PanelLeftClose aria-hidden="true" />,
        sidebarClosed: <PanelLeftOpen aria-hidden="true" />,
      }}
      settings={{ compact: <ThemeControl />, full: <ThemeControl /> }}
      sidebarStorageKey="studyluma:sidebar"
    >
      {children}
    </SiteShell>
  );
}
