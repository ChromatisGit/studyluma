import type { Macro } from "./macroTypes";

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

export type RawText = {
    rawText: string
}

export type Markdown = {
    markdown: string
}
