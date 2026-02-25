export const worksheetFormatEnum = ["web", "pdf", "pdfSolution"] as const;
export type WorksheetFormat = typeof worksheetFormatEnum[number];

export type Topic = {
    topicId: string;
    label: string;
    href: string;
    chapters: Chapter[]
};

export type Chapter = {
    chapterId: string;
    label: string;
    href: string;
    worksheets: WorksheetRef[];
};


export type WorksheetRef = {
    worksheetId: string;
    label: string;
    href: string;
    worksheetFormat: WorksheetFormat;
    sourceFilename?: string;
}
