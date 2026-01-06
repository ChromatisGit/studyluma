import { JSX, ReactNode } from 'react';
import { Highlight } from 'prism-react-renderer';
import styles from './CodeBlock.module.css';
import { transparentCodeTheme } from './codeTheme';

function renderInlineMarkdown(text: string, keyPrefix?: string): ReactNode[] {
  const segments = text.split(/(`[^`]*`)/g);
  return segments.map((segment, index) => {
    const isCode = segment.startsWith('`') && segment.endsWith('`');
    const key = keyPrefix ? `${keyPrefix}-${index}` : index;
    if (isCode) {
      return (
        <code key={key} className={styles.inlineCode}>
          {segment.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{segment}</span>;
  });
}

/**
 * Lightweight markdown renderer for worksheet text fields (paragraphs + fenced/inline code).
 * Supports:
 * - Paragraphs separated by blank lines
 * - Inline code with backticks
 * - Fenced code blocks with ```
 */
export function parseTextWithCode(text: string, textClassName?: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let isInCodeBlock = false;
  let codeLines: string[] = [];
  let paragraphLines: string[] = [];

  const pushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const children: ReactNode[] = [];
    paragraphLines.forEach((line, idx) => {
      children.push(...renderInlineMarkdown(line, `line-${idx}`));
      if (idx < paragraphLines.length - 1) children.push(<br key={`br-${idx}`} />);
    });
    elements.push(
      <div key={`text-${elements.length}`} className={textClassName}>
        {children}
      </div>
    );
    paragraphLines = [];
  };

  const pushCodeBlock = () => {
    if (codeLines.length === 0) return;

    const codeContent = codeLines.join('\n');

    elements.push(
      <Highlight
        key={`code-${elements.length}`}
        theme={transparentCodeTheme}
        code={codeContent}
        language="tsx"
      >
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className={styles.codeBlock}>
            {tokens.map((line, lineIndex) => {
              const lineProps = getLineProps({ line });
              const mergedClassName = [styles.codeLine, lineProps.className]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={lineIndex} {...lineProps} className={mergedClassName}>
                  {line.length === 0
                    ? '\u00A0'
                    : line.map((token, tokenIndex) => {
                        // Preserve inline markdown for backtick segments inside code
                        if (token.content.startsWith('`') && token.content.endsWith('`')) {
                          return (
                            <code key={tokenIndex} className={styles.inlineCode}>
                              {token.content.slice(1, -1)}
                            </code>
                          );
                        }
                        return <span key={tokenIndex} {...getTokenProps({ token })} />;
                      })}
                </div>
              );
            })}
          </div>
        )}
      </Highlight>
    );
    codeLines = [];
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine;
    const isFence = line.trim().startsWith('```');

    if (isFence) {
      if (isInCodeBlock) {
        pushCodeBlock();
      } else {
        pushParagraph();
      }
      isInCodeBlock = !isInCodeBlock;
      continue;
    }

    if (isInCodeBlock) {
      codeLines.push(line);
    } else if (line.trim() === '') {
      pushParagraph();
    } else {
      paragraphLines.push(line);
    }
  }

  if (isInCodeBlock) {
    pushCodeBlock();
  } else {
    pushParagraph();
  }

  return elements;
}

export { renderInlineMarkdown };
