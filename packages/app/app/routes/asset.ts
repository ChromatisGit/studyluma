import type { LoaderFunctionArgs } from "react-router";
import { assetBytes } from "../../src/modules/catalog/server/catalog.server";

export function loader({ params }: LoaderFunctionArgs) {
  const asset = assetBytes(params.assetId ?? "");
  if (!asset) {
    throw new Response(null, { status: 404 });
  }
  return new Response(new Uint8Array(asset.bytes).buffer, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
