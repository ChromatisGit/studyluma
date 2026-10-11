import { createElement, useContext, type ReactNode } from "react";
import type { RichInline, RichNode } from "../domain/rich";
import { Graphic } from "./Graphic";
import { RichReferenceContext } from "./RichReferenceContext";

export type RichContentProps = {
  nodes: RichNode[];
  renderGap?: ((id: string, index: number) => ReactNode) | undefined;
  merkkarteHref?: ((id: string) => string) | undefined;
  className?: string;
};

export function RichInlineContent({
  nodes,
  renderGap,
  merkkarteHref,
}: Pick<RichContentProps, "renderGap" | "merkkarteHref"> & {
  nodes: RichInline[];
}) {
  const targets = useContext(RichReferenceContext);
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <span key={index}>{node.value}</span>;
      case "code":
        return <code key={index}>{node.value}</code>;
      case "strong":
      case "emphasis":
      case "highlight": {
        const tag =
          node.type === "strong"
            ? "strong"
            : node.type === "emphasis"
              ? "em"
              : "mark";
        return createElement(
          tag,
          { key: index },
          <RichInlineContent
            nodes={node.children}
            renderGap={renderGap}
            merkkarteHref={merkkarteHref}
          />,
        );
      }
      case "math":
        return (
          <span
            key={index}
            className="math-inline"
            dangerouslySetInnerHTML={{ __html: node.display }}
          />
        );
      case "link":
        return (
          <a key={index} href={node.url}>
            <RichInlineContent
              nodes={node.children}
              renderGap={renderGap}
              merkkarteHref={merkkarteHref}
            />
          </a>
        );
      case "image":
        return (
          <img
            key={index}
            src={`/content/assets/${encodeURIComponent(node.assetId)}`}
            alt={node.alt}
            className={`rich-img rich-img--${node.fit}`}
            style={{ objectFit: node.fit }}
          />
        );
      case "gap":
        return (
          <span key={node.id}>{renderGap?.(node.id, index) ?? "____"}</span>
        );
      case "merkkarteRef":
        return (
          <a
            key={index}
            href={
              merkkarteHref?.(node.targetId) ??
              targets[node.targetId] ??
              `#${node.targetId}`
            }
          >
            {node.title}
          </a>
        );
    }
  });
}

export function RichContent({
  nodes,
  renderGap,
  merkkarteHref,
  className,
}: RichContentProps) {
  const targets = useContext(RichReferenceContext);
  const resolvedHref =
    merkkarteHref ?? ((id: string) => targets[id] ?? `#${id}`);
  const inline = (items: RichInline[]) => (
    <RichInlineContent
      nodes={items}
      renderGap={renderGap}
      merkkarteHref={resolvedHref}
    />
  );
  return (
    <div className={["md prose", className].filter(Boolean).join(" ")}>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "paragraph":
            return <p key={index}>{inline(node.children)}</p>;
          case "heading":
            return createElement(
              `h${Math.min(Math.max(node.depth ?? 2, 1), 6)}`,
              { key: index },
              inline(node.children),
            );
          case "list": {
            const Tag = node.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {node.items.map((item, i) => (
                  <li key={i}>
                    <RichContent
                      nodes={item}
                      renderGap={renderGap}
                      merkkarteHref={merkkarteHref}
                    />
                  </li>
                ))}
              </Tag>
            );
          }
          case "table":
            return (
              <div key={index} className="table-wrap md-table">
                <table className="table">
                  <tbody>
                    {node.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{inline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return (
              <pre key={index}>
                <code>{node.value}</code>
              </pre>
            );
          case "math":
            return (
              <div
                key={index}
                className="math-display"
                dangerouslySetInnerHTML={{ __html: node.display }}
              />
            );
          case "graphic":
            return (
              <Graphic key={index} graphic={node.graphic} title={node.title} />
            );
          case "writingArea":
            return (
              <div key={index} className="lf-zone">
                <span className="lf-zone__label">{node.label}</span>
              </div>
            );
        }
      })}
    </div>
  );
}
