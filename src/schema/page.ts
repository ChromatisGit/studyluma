import type { Macro } from "@macros/registry";

export type Page = {
    title: string,
    content?: Section[]
}

export type Section = {
    header: string,
    content: Node[]
}

export type Node = Macro | MacroGroup | Subheader | Markdown

export type MacroGroup = {
    type: "group",
    intro?: Markdown
    macros: Macro[]
}

export type Subheader = {
    type: "subheader",
    header: Markdown
}

/** Branded type for markdown content */
declare const MarkdownBrand: unique symbol;

export type Markdown = {
    markdown: string;
    readonly [MarkdownBrand]: never;
}

/** Create a Markdown branded type from a plain string */
export function createMarkdown(markdown: string): Markdown {
    return { markdown } as Markdown;
}
