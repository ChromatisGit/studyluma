import type { DocCardResource } from "./DocCard";

export const resourcesToMdx = (resources: DocCardResource[]) =>
  `<div className="row">
${resources
  .map(
    r => `  <DocCardLink
    href="${r.href}"
    label="${r.label}"
    description="${r.description}"
  />`
  )
  .join('\n')}
</div>`;