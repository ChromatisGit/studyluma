import type {
  Catalog,
  CourseDefinition,
  Foliensatz as CatalogFoliensatz,
  Graphic,
  Location,
  RichInline,
  SourceEntry as CatalogSourceEntry,
} from "@studyluma/catalog-contract";

/**
 * The compiler writes the catalog defined by `@studyluma/catalog-contract`.
 * These are the contract's types under the names the compiler has always
 * used, plus the types only the compiler needs (diagnostics).
 */
export type {
  Answer,
  Asset,
  ChallengePool,
  Chapter,
  Location,
  Placement,
  Quiz,
  RichNode,
  StructureLevel,
  Summary,
  Task,
  TaskPart,
  Topic,
  Worksheet,
} from "@studyluma/catalog-contract";
/** The compiler always knows where an entry was written. */
export type SourceEntry = CatalogSourceEntry & { location: Location };
export type Foliensatz = Omit<CatalogFoliensatz, "entries"> & {
  entries: SourceEntry[];
};
export type Inline = RichInline;
export type GraphicSpec = Graphic;
export type Course = CourseDefinition;
export type Bundle = Catalog;

export type Diagnostic = Location & {
  severity: "error" | "warning";
  code: string;
  message: string;
  inclusionChain?: string[];
};
