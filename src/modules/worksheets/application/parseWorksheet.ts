export type Exercise = {
  id: string;
  section: string;
  kind: "gap" | "input" | "single-choice" | "mcq" | "task";
  prompt: string;
  hint: string;
  why: string;
  options: string[];
  gaps: string[][];
  inputType: string;
};

/** The legacy worksheet format is Markdown with exercise headings and metadata. */
export function parseWorksheet(body: string): Exercise[] {
  const lines = body
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .split(/\r?\n/);
  const exercises: Exercise[] = [];
  let section = "Aufgaben";
  let current: Exercise | undefined;
  let field: "prompt" | "hint" | "why" | "answer" = "prompt";
  let buffer: string[] = [];

  function flushField() {
    if (!current) {
      return;
    }
    const value = buffer.join("\n").trim();
    if (field === "answer") {
      current.inputType =
        value.match(/^(number|fraction|vector):/)?.[1] ?? "text";
    } else {
      current[field] = value;
    }
    buffer = [];
  }

  function flushExercise() {
    flushField();
    if (!current) {
      return;
    }
    if (current.kind === "single-choice" || current.kind === "mcq") {
      current.options = [
        ...current.prompt.matchAll(/^- \([ xX]\) (.+)$/gm),
      ].map((match) => match[1] ?? "");
      current.prompt = current.prompt
        .replace(/^- \([ xX]\) .+$(\n)?/gm, "")
        .trim();
    }
    if (current.kind === "gap") {
      current.gaps = [...current.prompt.matchAll(/\(\(([\s\S]*?)\)\)/g)].map(
        (match) => (match[1] ?? "").split("|").map((option) => option.trim()),
      );
      let index = 0;
      current.prompt = current.prompt.replace(
        /\(\(([\s\S]*?)\)\)/g,
        () => `\uFFFE${index++}\uFFFE`,
      );
    }
    exercises.push(current);
    current = undefined;
  }

  for (const line of lines) {
    if (/^---\s*$/.test(line)) {
      flushExercise();
    } else if (/^# [^#]/.test(line)) {
      flushExercise();
      section = line.slice(2).trim();
    } else if (/^## (gap|input|single-choice|mcq|task)\s*$/.test(line)) {
      flushExercise();
      current = {
        id: String(exercises.length),
        section,
        kind: line.slice(3).trim() as Exercise["kind"],
        prompt: "",
        hint: "",
        why: "",
        options: [],
        gaps: [],
        inputType: "text",
      };
      field = "prompt";
    } else if (/^### (answer|hint|why)\s*$/.test(line) && current) {
      flushField();
      field = line.slice(4).trim() as typeof field;
    } else if (line.startsWith("@")) {
      // Print layout and section markers do not affect the web exercise.
      continue;
    } else if (current) {
      buffer.push(line);
    }
  }
  flushExercise();
  return exercises;
}
