import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ViewProps } from "@studyluma/component-api/view";
import {
  ComponentBlock,
  ComponentFieldContext,
  ComponentViewsContext,
  LoadedComponent,
} from "./Component";
import type { ComponentView } from "./Component";

type Props = { word: string };
type State = { count: number };

const view: ComponentView = {
  initialState: (props) => ({ count: (props as Props).word.length }),
  default: ({
    props,
    state,
    placement,
    interactive,
    title,
    kit,
  }: ViewProps<unknown, unknown>) => (
    <kit.Frame
      placement={placement}
      controls={
        <kit.Button onClick={() => {}} disabled={!interactive}>
          +
        </kit.Button>
      }
    >
      <p data-title={title}>
        {(props as Props).word}:{(state as State).count}:{placement}:
        {String(interactive)}
      </p>
    </kit.Frame>
  ),
};
const use = { name: "probe", title: "Probe", props: { word: "hallo" } };

describe("components", () => {
  test("a loaded view gets its props, its initial state and the kit", () => {
    const html = renderToStaticMarkup(
      <LoadedComponent
        view={view}
        use={use}
        placement="text"
        state={undefined}
        onState={() => {}}
      />,
    );
    expect(html).toContain("hallo:5:text:true");
    expect(html).toContain('data-title="Probe"');
    expect(html).toContain("component-frame--text");
  });

  test("without onState the view only shows, with the state it is given", () => {
    const html = renderToStaticMarkup(
      <LoadedComponent
        view={view}
        use={use}
        placement="folie"
        state={{ count: 9 }}
      />,
    );
    expect(html).toContain("hallo:9:folie:false");
    expect(html).toContain("component-frame--folie");
    expect(html).toContain("disabled");
  });

  test("setState passes the next state, also as a function of the current one", () => {
    let set: ViewProps<unknown, unknown>["setState"] = () => {};
    const capture: ComponentView = {
      ...view,
      default: (props) => {
        set = props.setState;
        return null;
      },
    };
    const updates: unknown[] = [];
    renderToStaticMarkup(
      <LoadedComponent
        view={capture}
        use={use}
        placement="folie"
        state={undefined}
        onState={(update) =>
          updates.push(update(undefined), update({ count: 1 }))
        }
      />,
    );
    set((current: unknown) => ({ count: (current as State).count + 1 }));
    set({ count: 0 });
    expect(updates).toEqual([
      { count: 6 },
      { count: 2 },
      { count: 0 },
      { count: 0 },
    ]);
  });
});

describe("the function field", () => {
  test("the view types functions into the field the host provides", () => {
    const field: ComponentView = {
      ...view,
      default: ({ kit, interactive }: ViewProps<unknown, unknown>) => (
        <kit.FunctionField
          row={[]}
          label="Funktion"
          fixed={!interactive}
          onChange={() => {}}
        />
      ),
    };
    const render = (withProvider: boolean) => {
      const component = (
        <LoadedComponent
          view={field}
          use={use}
          placement="folie"
          state={undefined}
        />
      );
      return renderToStaticMarkup(
        withProvider ? (
          <ComponentFieldContext.Provider
            value={({ label, fixed }) => (
              <input aria-label={label} readOnly={fixed} />
            )}
          >
            {component}
          </ComponentFieldContext.Provider>
        ) : (
          component
        ),
      );
    };
    expect(render(true)).toContain('<input aria-label="Funktion" readOnly=""');
    expect(render(false)).toContain('aria-label="Funktion"');
    expect(render(false)).not.toContain("<input");
  });
});

describe("components in text", () => {
  test("text shows a placeholder with the description while the view loads", () => {
    const html = renderToStaticMarkup(
      <ComponentViewsContext.Provider value={() => new Promise(() => {})}>
        <ComponentBlock use={use} />
      </ComponentViewsContext.Provider>,
    );
    expect(html).toContain('aria-label="Probe"');
    expect(html).toContain("component--loading");
  });
});
