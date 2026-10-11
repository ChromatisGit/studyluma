import type { RichNode } from "../domain/rich";
import { Merkkarte, MerkkarteBeispiel } from "./Merkkarte";
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

/** Summary cards use the established card layout with compiled rich nodes. */
export function SummaryContent({ summary }: { summary: StructuredSummary }) {
  return (
    <div className="zusammenfassung">
      {summary.content.map((item, index) => {
        if (item.type === "content") {
          return <RichContent key={index} nodes={item.content} />;
        }
        const card = summary.merkkarten.find(
          (candidate) => candidate.id === item.id,
        );
        return card ? (
          <Merkkarte key={card.id} id={card.anchor} title={card.title}>
            <RichContent nodes={card.rule} />
            {card.examples.length > 0 && (
              <MerkkarteBeispiel>
                {card.examples.map((example, i) => (
                  <RichContent key={i} nodes={example} />
                ))}
              </MerkkarteBeispiel>
            )}
          </Merkkarte>
        ) : null;
      })}
    </div>
  );
}
