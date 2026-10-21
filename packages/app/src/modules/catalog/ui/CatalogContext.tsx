import { createContext, useContext } from "react";
import type { PublicCatalog } from "../domain/types";

/**
 * The catalog of the chapters the open page shows, as its route loaded it.
 * Pages never receive the whole catalog: a component reads only what its
 * route put here, so the route decides which chapters that is.
 */
export const CatalogContext = createContext<PublicCatalog | null>(null);

export function useCatalog(): PublicCatalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) {
    throw new Error("This page's route loaded no catalog");
  }
  return catalog;
}
