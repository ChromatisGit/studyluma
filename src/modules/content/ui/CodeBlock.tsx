import { useState, type ReactNode } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";
import TEXT from "./content.de.json";

const theme = {
  ...themes.vsDark,
  plain: { ...themes.vsDark.plain, backgroundColor: "transparent" },
};

export interface CodeBlockProps {
  code: string;
  language: string;
  /** ```lang copy: offer a copy button. */
  copy?: boolean;
  /** Replaces gap placeholders inside the code, e.g. with inputs. */
  renderGap?: ((index: number) => ReactNode) | undefined;
}

const GAP = /￾(\d+)￾/;

function Highlighted({ code, language }: { code: string; language: string }) {
  return (
    <Highlight theme={theme} code={code} language={language as Language}>
      {({ tokens, getTokenProps }) =>
        tokens.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 && "\n"}
            {line.map((token, tokenIndex) => (
              <span key={tokenIndex} {...getTokenProps({ token })} />
            ))}
          </span>
        ))
      }
    </Highlight>
  );
}

export function CodeBlock({ code, language, copy, renderGap }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const segments = renderGap ? code.split(GAP) : [code];
  return (
    <div className="code-block">
      {copy && (
        <button
          type="button"
          className="code-block__copy"
          onClick={() => {
            navigator.clipboard
              .writeText(code)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? (
            <Check className="icon icon--sm" aria-hidden="true" />
          ) : (
            <Copy className="icon icon--sm" aria-hidden="true" />
          )}
          {copied ? TEXT.code.copied : TEXT.code.copy}
        </button>
      )}
      <pre className="code-block__pre">
        <code>
          {segments.map((segment, index) =>
            index % 2 === 1 ? (
              <span key={index}>{renderGap?.(Number(segment))}</span>
            ) : (
              segment && (
                <Highlighted key={index} code={segment} language={language} />
              )
            ),
          )}
        </code>
      </pre>
    </div>
  );
}
