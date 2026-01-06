const EXTERNAL_HREF_PROTOCOL_RE = /^(https?:|mailto:|tel:)/i;

export function isExternalHref(href: string): boolean {
  return EXTERNAL_HREF_PROTOCOL_RE.test(href);
}

export function isHashHref(href: string): boolean {
  return href.startsWith('#');
}

export function normalizeHref(href: string): string {
  if (!href) return href;
  if (isExternalHref(href)) return href;
  if (isHashHref(href)) return href;
  if (href.startsWith('/')) return href;
  return `/${href}`;
}

export function resolveLinkRel(
  target: string | undefined,
  rel: string | undefined
): string | undefined {
  if (rel) return rel;
  if (target === '_blank') return 'noreferrer noopener';
  return undefined;
}
