import { Eraser, MousePointer2, SquarePlus, Undo2 } from "lucide-react";
import type { InkTool } from "./InkLayer";
import TEXT from "./lessons.de.json";

const TOOLS: { id: InkTool; label: string; separator?: boolean }[] = [
  { id: "cursor", label: TEXT.tools.cursor },
  { id: "laser", label: TEXT.tools.laser },
  { id: "graphit", label: TEXT.tools.graphit, separator: true },
  { id: "violett", label: TEXT.tools.violett },
  { id: "signal", label: TEXT.tools.signal },
  { id: "eraser", label: TEXT.tools.eraser, separator: true },
];

function ToolIcon({ tool }: { tool: InkTool }) {
  switch (tool) {
    case "cursor":
      return <MousePointer2 aria-hidden="true" />;
    case "laser":
      return <span className="lt-tool__laser" aria-hidden="true" />;
    case "eraser":
      return <Eraser aria-hidden="true" />;
    default:
      return (
        <span
          className={`lt-tool__pen lt-tool__pen--${tool}`}
          aria-hidden="true"
        />
      );
  }
}

/**
 * Exactly one active tool decides whether the teacher operates, points,
 * writes or erases. Undo and a new blank surface are actions, not tools.
 */
export function Toolbar({
  tool,
  onTool,
  onUndo,
  undoRemovesBlank,
  onBlank,
}: {
  tool: InkTool;
  onTool: (tool: InkTool) => void;
  onUndo: () => void;
  undoRemovesBlank: boolean;
  onBlank: () => void;
}) {
  const undoLabel = undoRemovesBlank ? TEXT.tools.undoBlank : TEXT.tools.undo;
  return (
    <div
      className="lt-tools"
      role="toolbar"
      aria-label={TEXT.tools.label}
      aria-orientation="vertical"
    >
      {TOOLS.map((item) => (
        <div key={item.id} className="lt-tools__slot">
          {item.separator && <span className="lt-tools__sep" />}
          <button
            type="button"
            className="lt-tool"
            aria-label={item.label}
            title={item.label}
            aria-pressed={tool === item.id}
            onClick={() => onTool(item.id)}
          >
            <ToolIcon tool={item.id} />
          </button>
        </div>
      ))}
      <span className="lt-tools__fill" />
      <button
        type="button"
        className="lt-tool lt-tool--action"
        aria-label={undoLabel}
        title={undoLabel}
        onClick={onUndo}
      >
        <Undo2 aria-hidden="true" />
      </button>
      <button
        type="button"
        className="lt-tool lt-tool--action"
        aria-label={TEXT.tools.blank}
        title={TEXT.tools.blank}
        onClick={onBlank}
      >
        <SquarePlus aria-hidden="true" />
      </button>
    </div>
  );
}
