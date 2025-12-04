export type WorksheetProcess = "web" | "pdf" | "pdfSolution";

export type WorksheetRef = {
  href: string;
  label: string;
  process: WorksheetProcess;
};

export type WorksheetLocation = {
  source: string;
  target: string;
  process: WorksheetProcess;
};
