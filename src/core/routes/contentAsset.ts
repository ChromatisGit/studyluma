import { getAsset } from "@core/assets.server";

const ASSET_KEY_PATTERN = /^[a-f0-9]{64}\.[a-z0-9]+$/;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function loader({ params }: { params: { key?: string } }) {
  const key = params.key ?? "";
  if (!ASSET_KEY_PATTERN.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const asset = await getAsset(key);
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(toArrayBuffer(asset.bytes), {
    headers: {
      "Content-Type": asset.contentType,
      // Content-addressed key - the bytes for a given key never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
