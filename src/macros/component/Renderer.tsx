import type { ComponentMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import type { ComponentType } from "react";
import PasswordBruteForce from "./components/passwordBruteForce";
import styles from "./styles.module.css";

// ─── Component Sub-Registry ───────────────────────────────────────────────────
// To add a new component:
// 1. Create components/[name]/index.tsx
// 2. Import it below and add an entry to the registry

const componentRegistry: Record<string, ComponentType> = {
  passwordBruteForce: PasswordBruteForce,
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

type Props = MacroComponentProps<ComponentMacro>;

export default function ComponentRenderer({ macro }: Props) {
  const Component = componentRegistry[macro.name];

  if (!Component) {
    return (
      <div className={styles.unknown}>
        Unbekannte Komponente: <code>{macro.name}</code>
      </div>
    );
  }

  return <Component />;
}
