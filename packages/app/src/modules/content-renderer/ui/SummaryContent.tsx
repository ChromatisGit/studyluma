import type { RichNode } from "../domain/rich";
import { Merkkarte, MerkkarteBeispiel } from "./Merkkarte";
import { MerkkartenGruppe } from "./MerkkartenGruppe";
import { RichContent } from "./RichContent";

export type StructuredSummary = {
  title: string;
  content: (
    { type: "content"; content: RichNode[] } | { type: "merkkarte"; id: string }
  )[];
  merkkarten: {
    id: string;
    title: string;
    anchor: string;
    rule: RichNode[];
    examples: RichNode[][];
  }[];
};

type Block =
  { kind: "content"; nodes: RichNode[] } | { kind: "cards"; ids: string[] };

/** Consecutive cards form one block, shown two per row where there is room. */
function toBlocks(items: StructuredSummary["content"]): Block[] {
  const blocks: Block[] = [];
  for (const item of items) {
    const last = blocks.at(-1);
    if (item.type === "content" && item.content.length === 0) {
      continue;
    }
    if (item.type === "content") {
      blocks.push({ kind: "content", nodes: item.content });
    } else if (last?.kind === "cards") {
      last.ids.push(item.id);
    } else {
      blocks.push({ kind: "cards", ids: [item.id] });
    }
  }
  return blocks;
}

/** Summary cards use the established card layout with compiled rich nodes. */
export function SummaryContent({ summary }: { summary: StructuredSummary }) {
  const card = (id: string) => {
    const found = summary.merkkarten.find((candidate) => candidate.id === id);
    return found ? (
      <Merkkarte key={found.id} id={found.anchor} title={found.title}>
        <RichContent nodes={found.rule} />
        {found.examples.length > 0 && (
          <MerkkarteBeispiel>
            {found.examples.map((example, i) => (
              <RichContent key={i} nodes={example} />
            ))}
          </MerkkarteBeispiel>
        )}
      </Merkkarte>
    ) : null;
  };
  return (
    <div className="zusammenfassung">
      {toBlocks(summary.content).map((block, index) => {
        if (block.kind === "content") {
          return <RichContent key={index} nodes={block.nodes} />;
        }
        return block.ids.length > 1 ? (
          <MerkkartenGruppe key={index}>{block.ids.map(card)}</MerkkartenGruppe>
        ) : (
          card(block.ids[0] ?? "")
        );
      })}
    </div>
  );
}
