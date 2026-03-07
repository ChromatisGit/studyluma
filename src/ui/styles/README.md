# StudyNode Style Architecture

## Layers (import order)

1. `tokens/` - design tokens only (CSS variables, no selectors)
2. `foundation/` - reset + document/base element defaults
3. `content/` - rich content rendering (`.sn-markdown`, code blocks)
4. `utilities/` - small utility classes
5. `integrations/` - third-party library overrides (KaTeX, Prism, Sonner)

`globals.css` is the only entrypoint imported by Next.js.

## Rules for Refactors

- Add new variables only inside `tokens/`.
- Do not hardcode colors/sizes when token alternatives exist.
- Put component-specific styles in component CSS modules, not here.
- Keep integration overrides isolated in `integrations/`.
- Prefer adding a new file + include it in that layer's `index.css`.