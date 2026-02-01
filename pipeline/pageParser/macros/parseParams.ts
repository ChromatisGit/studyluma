export type Params = Record<string, unknown>

export function parseParams(src: string): Params {
    const params: Params = {};
    let i = 0;
    const len = src.length;

    i = skipSeparators(src, i);

    // Handle a single positional argument (a quoted string with no key)
    if (i < len && (src[i] === '"' || src[i] === "'")) {
        const colon = src.indexOf(":", i);
        const quote = src[i];
        const closeQuote = src.indexOf(quote, i + 1);
        if (colon === -1 || (closeQuote !== -1 && closeQuote < colon)) {
            const { value } = readValue(src, i);
            return { _positional: value };
        }
    }

    while (i < len) {
        i = skipSeparators(src, i);
        if (i >= len) break;

        const keyStart = i;
        i = readUntil(src, i, ":");
        if (i >= len) break;
        const key = src.slice(keyStart, i).trim();
        i++; // skip ':'
        if (!key) continue;

        i = skipWhitespace(src, i);
        if (i >= len) break;

        const { value, nextIndex } = readValue(src, i);
        params[key] = value;
        i = nextIndex;
    }

    return params;
}

function readValue(src: string, start: number): { value: unknown; nextIndex: number } {
    const ch = src[start];
    if (ch === '"' || ch === "'") {
        const { value, end } = readQuotedString(src, start, ch);
        return { value, nextIndex: end };
    }

    const end = readUntil(src, start, ",");
    const raw = src.slice(start, end).trim();
    if (raw === "true") return { value: true, nextIndex: end };
    if (raw === "false") return { value: false, nextIndex: end };

    const num = Number(raw);
    const value = !Number.isNaN(num) && raw.length > 0 ? num : raw;
    return { value, nextIndex: end };
}

function readQuotedString(src: string, start: number, quote: string): { value: string; end: number } {
    let i = start + 1;
    let out = "";
    while (i < src.length) {
        const c = src[i++];
        if (c === "\\") {
            if (i < src.length) out += src[i++];
            continue;
        }
        if (c === quote) break;
        out += c;
    }
    return { value: out, end: i };
}

function readUntil(src: string, start: number, token: string): number {
    let i = start;
    while (i < src.length && src[i] !== token) i++;
    return i;
}

function skipWhitespace(src: string, start: number): number {
    let i = start;
    while (i < src.length && /\s/.test(src[i])) i++;
    return i;
}

function skipSeparators(src: string, start: number): number {
    let i = start;
    while (i < src.length && (src[i] === "," || /\s/.test(src[i]))) i++;
    return i;
}