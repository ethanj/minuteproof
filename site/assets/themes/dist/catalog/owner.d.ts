/**
 * The catalog controller's owner: its state and every transition.
 *
 * Invariants:
 *
 * - **One decision.** Whether a theme's stylesheet is ready, must be
 *   verified, must be loaded or is unavailable is decided by `decide`
 *   (`readiness.ts`), from the applied asset (complete identity: build plus
 *   URL and integrity, or a verified static delivery) and the page's static
 *   readiness. Selection and restore go through `pursue`; upgrade and
 *   adoption use the same identity check.
 * - **Latest intent wins.** Every theme selection, and a restore, takes the
 *   next `generation`. Work that completes later commits only if its
 *   generation is still the newest and its stylesheet is still the one on
 *   offer. A built-in selection commits at once. A mode choice supersedes a
 *   pending restore (the startup network must not override the person) but
 *   not an explicit external selection, which then commits with the mode in
 *   force.
 * - **Nothing shown before it is ready.** Root attributes are stamped,
 *   storage written and the stylesheet activated in one synchronous commit,
 *   after the decision says ready. Storage keeps the preference itself,
 *   never the effective mode, and is never written by a restore, an upgrade,
 *   a fallback or an operating-system change.
 * - **Callback boundaries.** Every `publish` calls subscribers, which may
 *   dispose the controller or choose again; after each, nothing creates a
 *   resource or commits without re-checking disposal and generation.
 * - **Ownership.** Only links the controller created are removed, and
 *   disposal cancels loads and waits so every promise settles at once.
 */
import { type FamilyHost, type MediaListLike } from "../family-core.ts";
import { type DesignModePreference } from "../mode-core.ts";
import { type ExternalThemeId } from "../external/id.ts";
import { type AppliedAsset, type CatalogDocument, type LinkLike, type StylesheetLoad } from "./assets.ts";
import { type CatalogAppearanceState, type ResolvedCatalogBoot, type StaticExternalTheme } from "./boot.ts";
import type { FetchLike } from "./discovery.ts";
import type { OfferEntry } from "./offer.ts";
import { type ProbeHost, type StaticReadiness } from "./readiness.ts";
import { type CatalogSettled, type ThemeCatalogError, type ThemeCatalogState, type ThemeSelectionOutcome } from "./state.ts";
/** The window a catalog controller runs in. */
export interface CatalogHost extends FamilyHost {
    document: FamilyHost["document"] & CatalogDocument & ProbeHost["document"];
    fetch?: FetchLike;
    getComputedStyle?(element: unknown): {
        getPropertyValue(name: string): string;
    };
    addEventListener?(type: "load", listener: () => void): void;
    removeEventListener?(type: "load", listener: () => void): void;
    __atomicstrataThemeCatalog?: unknown;
}
export interface Pending {
    generation: number;
    id: string;
    kind: "select" | "restore";
}
export interface Owner {
    readonly host: CatalogHost;
    readonly boot: ResolvedCatalogBoot;
    readonly media: MediaListLike;
    readonly builtIns: Array<{
        id: string;
        label: string;
        modes: DesignModePreference[];
    }>;
    appearance: CatalogAppearanceState;
    offer: OfferEntry[];
    /** The theme in force when the offer no longer lists it (its applied entry). */
    retired: OfferEntry | null;
    /** What the current choice list was built from, so an unchanged offer keeps the same frozen list. */
    choicesFrom: {
        offer: OfferEntry[] | null;
        retired: OfferEntry | null;
        applied: number;
        family: string | null;
    };
    /** Increases whenever an applied asset changes. */
    appliedVersion: number;
    catalog: ThemeCatalogState["catalog"];
    /** The index last applied, as text, to refuse the same revision with other content. */
    indexText: string | null;
    previews: LinkLike | null;
    /** The newest preview-sheet load, the only one allowed to replace the sheet. */
    previewsLoad: StylesheetLoad | null;
    applied: Map<string, AppliedAsset>;
    /** The readiness of each static theme's own delivery. */
    staticReadiness: Map<string, StaticReadiness>;
    /** Loads in flight and loaded inactive links, by load key (URL and integrity). */
    loading: Map<string, StylesheetLoad>;
    staged: Map<string, LinkLike>;
    pending: Pending | null;
    restoring: ExternalThemeId | null;
    generation: number;
    lastError: ThemeCatalogError | null;
    listeners: Array<(state: ThemeCatalogState) => void>;
    state: ThemeCatalogState;
    disposed: boolean;
    /** Undo functions: listeners on the window and media list, and waits to settle on disposal. */
    cleanups: Array<() => void>;
    abort: {
        abort(): void;
    } | null;
    discovery: Promise<CatalogSettled> | null;
    /** Index fetches run one after another (`lifecycle.ts`). */
    fetchChain: Promise<unknown>;
}
/**
 * Rebuild the frozen state and notify; a notification in progress stops at
 * a newer one. The choice list is rebuilt only when the offer, the retired
 * theme or an applied asset changed, so renderers can compare it by identity.
 */
export declare function publish(owner: Owner): void;
/** The page's static descriptor for an id. */
export declare function declaredStatic(owner: Owner, id: string): StaticExternalTheme | undefined;
export interface CommitOptions {
    persist: boolean;
    /** Whether this commit is the pending intent's own (it then clears `pending` and `restoring`). */
    resolves: boolean;
    error?: ThemeCatalogError;
    /** Keep the last error (an upgrade's commit is not the person's action). */
    keepError?: boolean;
}
/** Stamp the complete state for `id` and `preference`, store it if asked, and notify once. */
export declare function commit(owner: Owner, id: string, preference: DesignModePreference, options: CommitOptions): void;
/** Load (or reuse) the staged stylesheet of an offer entry; loads are shared by URL and integrity. */
export declare function stage(owner: Owner, entry: OfferEntry): Promise<LinkLike>;
/** Make a loaded link the applied stylesheet of its theme, activating it. Part of a commit. */
export declare function applyOwned(owner: Owner, entry: OfferEntry, link: LinkLike): void;
/**
 * Whether the page's own stylesheet for `theme` is in force: the sentinel
 * read on a probe now, or, if absent while the window is still loading,
 * after its `load`. Disposal settles the wait with false.
 */
export declare function staticReady(owner: Owner, theme: StaticExternalTheme): Promise<boolean>;
/**
 * Record what a probe found about a static delivery: the one place that
 * reacts to it. If it is missing and the theme in force is shown from it,
 * the page moves to `external.fallback` at once, writing nothing, and
 * without taking a generation: a pending intent goes on (to rescue the theme
 * from the catalog, or to fail).
 */
export declare function settleStaticReadiness(owner: Owner, theme: StaticExternalTheme, ready: boolean): void;
/** Start an intent for `entry` as the newest of `kind`: decide; announce it unless ready at once; go on. */
export declare function pursue(owner: Owner, entry: OfferEntry, kind: Pending["kind"]): Promise<ThemeSelectionOutcome>;
/** A person's theme choice: built-in at once, external once its stylesheet is ready. Cancels a pending restore. */
export declare function select(owner: Owner, value: unknown): Promise<ThemeSelectionOutcome>;
/** A person's mode choice: applied at once to the theme in force, and stored as the preference. */
export declare function selectMode(owner: Owner, value: unknown): DesignModePreference;
/** The operating system's scheme changed: re-resolve and notify if the page changes. Never writes storage. */
export declare function followSystem(owner: Owner): void;
/**
 * Release everything: later work, loads and waits (settled at once),
 * listeners, owned links (except the applied stylesheet of the theme in
 * force, left marked for a successor to adopt or remove) and the two root
 * attributes only this owner stamps. Idempotent.
 */
export declare function dispose(owner: Owner): void;
