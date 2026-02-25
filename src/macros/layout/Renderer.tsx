// Layout macro is metadata only — filtered out before rendering in SlideRenderer.
// This renderer is a no-op fallback (layout macros should never reach here in slides).
export default function LayoutRenderer() {
  return null;
}
