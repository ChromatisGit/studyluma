import { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import { defineMacro } from "@pipeline/pageParser/macros/macroDefinition";
import { Markdown } from "@schema/page";
import { parseRawText } from "@pipeline/pageParser/macros/parseRawText";

export type TableMacro = {
    type: "table",
    headers: Markdown[],
    rows: Markdown[][]
}

export const tableMacro = defineMacro({
    type: "table",
    parser
});

function parser(node: RawMacro): TableMacro {
    if (!node.content) {
        throw new Error("#table requires a [ ... ]")
    }

    const lines = node.content.rawText
        .split(NEWLINE_REGEX)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        throw new Error("#table requires at least one row.")
    }

    const parsedRows = lines.map((line) =>
        splitCells(line).map((cell) => parseRawText({ rawText: cell }, node.protectedBlocks))
    );
    const headers = parsedRows[0];

    if (headers.length === 0) {
        throw new Error("#table requires at least one column.")
    }

    const columnCount = headers.length;
    for (let i = 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.length !== columnCount) {
            throw new Error(
                `#table row ${i + 1} has ${row.length} columns; expected ${columnCount}.`
            )
        }
    }

    return {
        type: "table",
        headers,
        rows: parsedRows.slice(1)
    }
}

const NEWLINE_REGEX = /\r?\n/;

function splitCells(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let i = 0;

    while (i < line.length) {
        const ch = line[i];
        if (ch === "\\") {
            const next = line[i + 1];
            if (next === "," || next === "\\") {
                current += next;
                i += 2;
                continue;
            }
        }

        if (ch === ",") {
            cells.push(current.trim());
            current = "";
            i++;
            continue;
        }

        current += ch;
        i++;
    }

    if (current.length > 0) {
        cells.push(current.trim());
    }

    return cells;
}
