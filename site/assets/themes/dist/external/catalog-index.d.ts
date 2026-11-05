/**
 * The validator of catalog indexes (`atomicstrata-theme-catalog/1`).
 *
 * A catalog index is the one mutable document a publisher hosts: it lists
 * the compiled themes on offer, each with its build id and the stylesheet
 * (with integrity) that pins it: the effective asset identity, apart from the
 * offer's label and version, and the preview sheet that paints palette swatches before
 * any theme is loaded. The compiler writes it, `check` re-reads it, and the
 * run time will fetch it. All three accept exactly this shape.
 *
 * Every `href` is an `ASSET_PATH`, relative to the index, so an index can
 * only point inside its own directory. Every asset carries SHA-384
 * integrity. Ids are external ids, unique in the index. The list may be
 * empty: a publisher withdraws its last theme by publishing an index with
 * none, whose `layer` still states the layer the catalog is published for. The contract version
 * must be this package's. Revisions are positive safe integers; comparing
 * two revisions is the run time's job, not this validator's.
 */
import { type CatalogIndex } from "./schema.ts";
/** The error every index problem throws. */
export declare function catalogError(message: string): Error;
/** Validate a parsed catalog index, returning it typed. Throws on the first problem. */
export declare function validateCatalogIndex(raw: unknown): CatalogIndex;
