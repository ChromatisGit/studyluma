import { Macro } from "./macroTypes"

export type Page = {
    title: string,
    content?: Section[]
}

export type Section = {
    header: string,
    content: Node[]
}

export type Node = Macro | MacroGroup | RawText

export type MacroGroup = {
    type: "group",
    intro?: RawText
    macros: Macro[]
}

export type RawText = {
    rawText: string
}