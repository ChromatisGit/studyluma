# Component API

`@studyluma/component-api` is the public surface of a StudyLuma **component**: an interactive building block an instance brings along and authors embed with `::komponente [name](datei.toml)` or as a whole slide with `::komponentenfolie [name](datei.toml)` (Autorenhandbuch 2.9 and 12.10). It stays deliberately small and depends on the contract only (for the `Graphic` and math-row types).

A component is a folder in the instance, `src/components/<name>/`, listed in the instance's `config/components.toml`:

| File        | Loaded by                   | Imports                                                               |
| ----------- | --------------------------- | --------------------------------------------------------------------- |
| `index.ts`  | the compiler, at build time | `@studyluma/component-api`; never React                               |
| `view.tsx`  | the browser, on demand      | React and `@studyluma/component-api/view` (types); never compile code |
| `README.md` | people                      | the component's keys and what it shows                                |

`scripts/check-boundaries.ts` enforces the split.

## Build side (`@studyluma/component-api`)

`defineComponent({ name, version?, placements, keys?, graphic?, compile, description })`:

- `name` — lowercase, unique in the instance, equal to the folder name; it is what authors write in the brackets.
- `placements` — `"text"` (chapter content, worksheets, tips, ordinary slides) and/or `"folie"` (`::komponentenfolie`). Using a component where it has no placement is `COMPONENT_PLACEMENT`.
- `keys` — the component's own top-level keys in its file; `graphic: true` also allows the Grafik blocks `[achsen]`, `[[graph]]`, `[[parameter]]`, `[[punkt]]`. Any other key is `COMPONENT_KEY`.
- `compile(file, context)` — turns the parsed TOML into the view's props (plain JSON, stored in the catalog). `context.graphic(file)` reads the Grafik blocks exactly like a Grafik file (same parser, same errors); `context.error` and `context.warn` report at the directive's line; `context.placement` says where it stands.
- `description(props)` — what a screen reader says; it becomes the node's `title`.
- `version` (default `"1"`) — recorded in `catalog.meta.json`.

## View side (`@studyluma/component-api/view`)

`view.tsx` default-exports a React component taking `ViewProps` and exports `initialState(props)`:

- `props`, `placement`, `title`, and `interactive` (false on the projector and in previews).
- `state` / `setState` — JSON state owned by the host. On a Komponentenfolie it belongs to the slide, follows the teacher to the projector and freezes with it; in text it stays on the device. Animations run locally on every device, started by a state change; frames are never mirrored.
- `kit` — the app's drawing means: `Plane` (coordinate system with function and parametric curves; `fill` on a slide), `Slider`, `Button`, `FunctionField` (`y =` and the math entry of the worksheets, with its keypad; `fixed` on the projector), `Frame` (controls below the drawing in text, beside it on a slide), `curveOf(row, values)` and `startValues(graphic)`.

`bun run check` runs typecheck, format and tests.
