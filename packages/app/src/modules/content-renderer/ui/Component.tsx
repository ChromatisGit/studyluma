import {
  Component as ReactComponent,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import type { ComponentUse, JsonValue } from "@studyluma/catalog-contract";
import type {
  ComponentViewModule,
  FunctionFieldProps,
  Placement,
} from "@studyluma/component-api/view";
import { componentKit } from "./ComponentKit";
import TEXT from "./content.de.json";

export type ComponentView = ComponentViewModule<unknown, unknown>;

/** Loads the view of a component by name; undefined when the build has none. */
export type LoadComponentView = (
  name: string,
) => Promise<ComponentView> | undefined;

/**
 * Where the views come from. The app's root provides the instance's
 * components (`components` module); without a provider no view is known.
 */
export const ComponentViewsContext = createContext<LoadComponentView>(
  () => undefined,
);

/** Without the math entry (tests, previews) the field shows only that it is there. */
function NoFunctionField({ label }: FunctionFieldProps) {
  return (
    <span className="component-function" aria-label={label}>
      <i>y</i> =
    </span>
  );
}

/**
 * The field components type functions into. The `components` module provides
 * the worksheets' math entry; the content renderer cannot import it.
 */
export const ComponentFieldContext =
  createContext<ComponentType<FunctionFieldProps>>(NoFunctionField);

/** A state change as the view asks for it: a value, or a function of the current state. */
export type ComponentStateUpdate = (current: unknown) => unknown;

type Loaded =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; view: ComponentView };

function useComponentView(name: string): Loaded {
  const load = useContext(ComponentViewsContext);
  const [loaded, setLoaded] = useState<{ name: string; result: Loaded }>();
  useEffect(() => {
    let current = true;
    const pending = load(name);
    if (!pending) {
      setLoaded({ name, result: { status: "missing" } });
      return;
    }
    pending.then(
      (view) =>
        current && setLoaded({ name, result: { status: "ready", view } }),
      () => current && setLoaded({ name, result: { status: "missing" } }),
    );
    return () => {
      current = false;
    };
  }, [load, name]);
  return loaded?.name === name ? loaded.result : { status: "loading" };
}

function Missing({ use }: { use: ComponentUse }) {
  return (
    <div className="component component--missing" role="note">
      {TEXT.component.missing.replace("{name}", use.name)}
    </div>
  );
}

/** A view that throws shows the notice instead of taking the page down. */
class ViewBoundary extends ReactComponent<
  { use: ComponentUse; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <Missing use={this.props.use} />
    ) : (
      this.props.children
    );
  }
}

type HostProps = {
  use: ComponentUse;
  placement: Placement;
  /** Undefined: the view's initial state. */
  state: JsonValue | undefined;
  /** Absent: the view only shows (projector, previews). */
  onState?: ((update: ComponentStateUpdate) => void) | undefined;
};

/**
 * One use of a component: loads its view and hands it the props, the state
 * and the kit. The state belongs to the caller.
 */
export function ComponentHost(props: HostProps) {
  const loaded = useComponentView(props.use.name);
  if (loaded.status === "loading") {
    return (
      <div
        className={`component component--loading component--${props.placement}`}
        role="img"
        aria-label={props.use.title}
      />
    );
  }
  if (loaded.status === "missing") {
    return <Missing use={props.use} />;
  }
  return <LoadedComponent view={loaded.view} {...props} />;
}

/** A component whose view is loaded. */
export function LoadedComponent({
  view,
  use,
  placement,
  state,
  onState,
}: HostProps & { view: ComponentView }) {
  const FunctionField = useContext(ComponentFieldContext);
  const kit = useMemo(
    () => ({ ...componentKit, FunctionField }),
    [FunctionField],
  );
  const initial = () => view.initialState(use.props);
  const View = view.default;
  return (
    <ViewBoundary use={use}>
      <View
        props={use.props}
        state={state ?? initial()}
        setState={(next) =>
          onState?.((current) => {
            const base = current ?? initial();
            return typeof next === "function"
              ? (next as ComponentStateUpdate)(base)
              : next;
          })
        }
        placement={placement}
        interactive={!!onState}
        title={use.title}
        kit={kit}
      />
    </ViewBoundary>
  );
}

/** `::komponente` in text: the state stays in this view on this device. */
export function ComponentBlock({ use }: { use: ComponentUse }) {
  const [state, setState] = useState<unknown>();
  return (
    <div className="component component--text">
      <ComponentHost
        use={use}
        placement="text"
        state={state as JsonValue | undefined}
        onState={setState}
      />
    </div>
  );
}
