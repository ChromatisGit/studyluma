import type { ReactNode } from "react";
import type { FunctionFieldProps } from "@studyluma/component-api/view";
import {
  ComponentFieldContext,
  ComponentViewsContext,
  type ComponentView,
} from "../../content-renderer";
import { MathEntry } from "../../worksheets";

let views: Record<string, () => Promise<ComponentView>> | undefined;
const loading = new Map<string, Promise<ComponentView>>();

/**
 * The view of a component of this instance, loaded on first use. Vite finds
 * every `src/components/<name>/view.tsx` of the instance (the pattern starts at
 * the instance root) and gives each its own chunk, so no view lands in the
 * main bundle. Only activated components reach the catalog: the build and
 * the server check that.
 */
export function loadComponentView(
  name: string,
): Promise<ComponentView> | undefined {
  // Read on the first call, so that importing this file outside Vite (tests) is harmless.
  views ??= import.meta.glob<ComponentView>("/src/components/*/view.tsx");
  const load = views[`/src/components/${name}/view.tsx`];
  if (!load) {
    return undefined;
  }
  let pending = loading.get(name);
  if (!pending) {
    pending = load();
    loading.set(name, pending);
  }
  return pending;
}

/** `y =` and the math entry of the worksheets, with its keypad. */
function FunctionField({
  row,
  onChange,
  label,
  fixed = false,
}: FunctionFieldProps) {
  return (
    <span className="component-function">
      <span className="component-function__y">
        <i>y</i> =
      </span>
      <MathEntry
        row={row}
        label={label}
        variable="x"
        locked={fixed}
        onChange={onChange}
      />
    </span>
  );
}

/** Makes the instance's component views and their function field available to every page. */
export function ComponentViewsProvider({ children }: { children: ReactNode }) {
  return (
    <ComponentViewsContext.Provider value={loadComponentView}>
      <ComponentFieldContext.Provider value={FunctionField}>
        {children}
      </ComponentFieldContext.Provider>
    </ComponentViewsContext.Provider>
  );
}
