import type { ComponentProps } from "react";
import React from "react";
import ThemeDocCard from "@theme/DocCard";
import useBaseUrl from "@docusaurus/useBaseUrl";

type DocCardItem = ComponentProps<typeof ThemeDocCard>["item"];

export type DocCardResource = {href: string, label: string, description?: string}

export default function DocCard({
  href,
  label,
  description,
}: DocCardResource) {
  const isExternal = /^(https?:|mailto:|tel:)/.test(href);
  const isFile = /\.(pdf|zip)$/.test(href);

  let resolved: string;
  switch (true) {
    case isExternal:
      resolved = href;
      break;

    case isFile:
      resolved = window.location.origin + useBaseUrl(href);
      break;

    default:
      resolved = useBaseUrl(href);
      break;
  }

  const item: DocCardItem = { type: "link", href: resolved, label, description, };
  return (
    <div className={"col col--6"} style={{ marginBottom: "1rem" }}>
      <ThemeDocCard item={item} />
    </div>
  );
}