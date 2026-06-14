# StudyLuma Style Architecture

## Layers (import order)

1. `foundation/` - document/base element defaults that extend the framework base
2. `content/` - rich content rendering (`.content-markdown`, code blocks)
3. `utilities/` - small utility classes
4. `integrations/` - third-party library overrides (KaTeX, Prism, Sonner)

`app/app.css` is the stylesheet entrypoint. Project-level theme overrides live in `app/theme.project.css` and use the framework token names.

## Rules for Refactors

- Add new theme variables to the framework first when they are generally useful.
- Add StudyLuma-specific theme values only in `app/theme.project.css`.
- Do not hardcode colors/sizes when token alternatives exist.
- Put component-specific styles in component CSS modules, not here.
- Keep integration overrides isolated in `integrations/`.
- Prefer adding a new file + include it in that layer's `index.css`.
