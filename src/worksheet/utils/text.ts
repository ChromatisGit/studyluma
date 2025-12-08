const NEWLINE_REGEX = /\r?\n/;

export function stripSharedIndentation(text: string): string {
  const lines = text.split(NEWLINE_REGEX);
  let minIndent = Number.POSITIVE_INFINITY;

  for (const line of lines) {
    if (!(line.trim())) continue;
    const match = /^(\s*)\S/.exec(line);
    if (!match) continue;
    minIndent = Math.min(minIndent, match[1].length);
  }

  if (!Number.isFinite(minIndent)) return text;

  return lines
    .map((line) => (line.length >= minIndent ? line.slice(minIndent) : line))
    .join("\n")
    .trim();
}

const FENCED_BLOCK_REGEX = /```([^\n`]*)\r?\n([\s\S]*?)```/g;

export function dedentFencedCodeBlocks(text: string): string {
  return text.replace(FENCED_BLOCK_REGEX, (_, lang, body) => {
    const language = (lang ?? "").trim();
    const dedentedBody = stripSharedIndentation(body);
    const langPrefix = language ? `${language}\n` : "\n";
    return `\`\`\`${langPrefix}${dedentedBody}\n\`\`\``;
  });
}
