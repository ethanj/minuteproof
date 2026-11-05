/**
 * The catalog controller's public state, and the pure functions that build
 * it: one frozen `ThemeCatalogState` per transition, its frozen choices, and
 * its errors.
 *
 * Choices, in order: the built-in families as the family configuration
 * offers them, then the external themes on offer (`offer.ts`), then, when
 * the theme in force is no longer offered (a later index withdrew it), that
 * theme as a retired choice. A retired theme stays in force until the
 * person leaves it, and cannot be chosen again.
 *
 * The state separates what is shown (`theme`, `family`, `mode`,
 * `effectiveMode`, `scheme`, `applied`) from what is wanted but not yet
 * shown (`pending`, a selection being loaded; `restoring`, a stored theme
 * awaiting discovery) and from what is on offer (`choices`, `catalog`).
 */
import type { ExternalThemeId } from "../external/id.ts";
import type { DesignModePreference } from "../mode-core.ts";
import type { CatalogAppearanceState } from "./boot.ts";
import type { OfferEntry } from "./offer.ts";
import type { AppliedAsset } from "./assets.ts";
export interface ThemeChoice {
    readonly id: string;
    readonly label: string;
    readonly modes: readonly DesignModePreference[];
    readonly origin: "built-in" | "static" | "catalog";
    readonly version: string | null;
    readonly build: string | null;
    readonly retired: boolean;
}
export type ThemeCatalogErrorKind = "load-failed" | "discovery-failed" | "unavailable" | "static-css-missing" | "conflict" | "previews-failed" | "stale-revision";
export interface ThemeCatalogError {
    readonly kind: ThemeCatalogErrorKind;
    readonly id: string | null;
    readonly message: string;
}
export interface ThemeCatalogState extends CatalogAppearanceState {
    readonly choices: readonly ThemeChoice[];
    readonly pending: string | null;
    readonly restoring: ExternalThemeId | null;
    readonly catalog: {
        readonly status: "none" | "idle" | "loading" | "ready" | "failed";
        readonly revision: number | null;
    };
    readonly lastError: ThemeCatalogError | null;
    /** The external stylesheet in effect for the theme in force: its build, or null for a built-in theme. */
    readonly applied: {
        readonly id: ExternalThemeId;
        readonly build: string;
    } | null;
}
export type ThemeSelectionOutcome = {
    readonly status: "applied";
    readonly state: ThemeCatalogState;
} | {
    readonly status: "superseded";
} | {
    readonly status: "failed";
    readonly error: ThemeCatalogError;
} | {
    readonly status: "rejected";
    readonly reason: "unknown-id" | "retired" | "disposed";
};
/** How discovery (or a refresh) settled. */
export interface CatalogSettled {
    readonly status: "ready" | "failed" | "no-catalog" | "disposed";
    readonly revision: number | null;
}
/** A frozen error. */
export declare function catalogFailure(kind: ThemeCatalogErrorKind, id: string | null, message: string): ThemeCatalogError;
interface BuiltInFamily {
    id: string;
    label: string;
    modes: DesignModePreference[];
}
/**
 * The frozen choice list. `retiredEntry` is the theme in force when the
 * offer no longer lists it.
 */
export declare function choicesOf(builtIns: readonly BuiltInFamily[], offer: readonly OfferEntry[], retiredEntry: OfferEntry | null): readonly ThemeChoice[];
export interface StateParts {
    appearance: CatalogAppearanceState;
    choices: readonly ThemeChoice[];
    pending: string | null;
    restoring: ExternalThemeId | null;
    catalog: ThemeCatalogState["catalog"];
    lastError: ThemeCatalogError | null;
    applied: AppliedAsset | undefined;
}
/** One frozen state from its parts. */
export declare function stateOf(parts: StateParts): ThemeCatalogState;
export {};
