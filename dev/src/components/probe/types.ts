import type { Graphic } from "@studyluma/component-api";

/** What `compile` writes into the catalog; shared by index.ts and view.tsx. */
export type ProbeProps = { graphic: Graphic; start: number };
