import type { ComponentProps } from "react";
import DocCard from "@theme/DocCard";
import React from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";

type DocCardItem = ComponentProps<typeof DocCard>["item"];

export default function DocCardSmartLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) {
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
      <DocCard item={item} />
    </div>
  );
}