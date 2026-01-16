export function extractLineCol(msg: string): { line?: number; col?: number } {
  const m1 = msg.match(/line\s+(\d+)[^\d]+column\s+(\d+)/i);
  if (m1) return { line: Number(m1[1]), col: Number(m1[2]) };

  const m2 = msg.match(/\((\d+):(\d+)\)/);
  if (m2) return { line: Number(m2[1]), col: Number(m2[2]) };

  return {};
}
