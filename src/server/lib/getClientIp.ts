import "server-only";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = headerList.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "unknown";
}
