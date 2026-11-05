/**
 * The external themes on offer: the page's static themes merged with the
 * catalog's latest index.
 *
 * The offer is what a person may choose next. It is not what the page is
 * showing: the stylesheet in effect for each theme (the applied asset,
 * `assets.ts`) is kept apart, so a newer offer never changes the page until
 * a load of it commits.
 *
 * Merging a static theme with a catalog entry of the same id. The authority
 * for an update is the accepted catalog revision (the controller accepts
 * only newer revisions), never the themes' own version numbers: every
 * compiler release changes every build while a source version may stay,
 * and a publisher rolling a theme back publishes a higher revision with the
 * older values.
 *
 * - The same build with the same offer (version, label, modes) is the same
 *   theme: one entry, which the page already delivers, with the catalog's
 *   stylesheet available too.
 * - The same build with a different offer is incoherent: the static entry
 *   stays, and the conflict is reported.
 * - Another build is the catalog's update: the offer takes it, and the
 *   controller stages it; the build in force stays until that load commits.
 * - A static theme the catalog does not list stays offered: the page
 *   delivers it, whatever the catalog holds.
 *
 * Catalog-only themes follow in index order.
 */
import type { CatalogIndex } from "../external/schema.ts";
import type { ExternalThemeId } from "../external/id.ts";
import type { DesignModePreference } from "../mode-core.ts";
import type { StaticExternalTheme } from "./boot.ts";
/** One external theme on offer, with where its stylesheet can be loaded from (null: only the page delivers it). */
export interface OfferEntry {
    readonly id: ExternalThemeId;
    readonly label: string;
    readonly version: string;
    readonly modes: readonly DesignModePreference[];
    readonly build: string;
    readonly css: {
        readonly href: string;
        readonly integrity: string;
    } | null;
    readonly origin: "static" | "catalog";
}
export interface MergedOffer {
    entries: OfferEntry[];
    /** Ids whose catalog entry was not taken: the static theme's build with a different offer. */
    conflicts: string[];
}
/** Merge the static themes with an index (or none); `hrefOf` resolves an index href to its absolute URL. */
export declare function mergeOffer(statics: readonly StaticExternalTheme[], index: CatalogIndex | null, hrefOf: (href: string) => string): MergedOffer;
