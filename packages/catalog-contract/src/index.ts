/**
 * The contract between the compiler and the app: the shape of a compiled
 * catalog, its format version and the checks both sides share. This package
 * depends on nothing (no Chromatis, no other StudyLuma package) and its
 * results are plain objects.
 */
export type * from "./types";
export { CATALOG_FORMAT_VERSION } from "./version";
export {
  CATALOG_FILE,
  CATALOG_META_FILE,
  catalogMetaErrors,
  checkCatalogCompatibility,
  isBuildId,
  serializeCatalogMeta,
} from "./meta";
export type { CatalogArtifactMeta, CheckResult } from "./meta";
export { catalogShapeErrors } from "./shape";
export { computeCatalogBuildId } from "./buildId";
export { validateCatalogArtifact } from "./validate";

export {
  boxKeys,
  char,
  childRows,
  cloneRow,
  isBox,
  isMathRow,
  splitTop,
} from "./mathNodes";
export type {
  MathChar,
  MathFrac,
  MathNode,
  MathRow,
  MathSqrt,
  MathSup,
} from "./mathNodes";
export { typstToRow } from "./typstToRow";
export {
  decimalCommas,
  germanDecimals,
  prepareTypstMath,
  splitOperation,
} from "./prepareTypstMath";
