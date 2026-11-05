/**
 * The one interface the appearance UI reads: the native family and mode
 * selects (`select.ts`), the compact appearance switch
 * (`appearance-switch.ts`) and, through it, the React component.
 *
 * Two controllers provide it:
 *
 * - a family page's theme controller (`family-core.ts`), adapted here;
 * - a catalog page's controller (`@atomicstrata/themes/catalog`), whose
 *   `appearance` member is one.
 *
 * So both kinds of page render with the same code, and a renderer never
 * learns which it has. Ids are plain strings here: a catalog page's families
 * include external ids, which the closed `ThemeFamilyId` union does not and
 * must not.
 *
 * `view()` returns one frozen object per state, the same object until the
 * state changes, so React's `useSyncExternalStore` can use it directly.
 * `families` is the same array until the choices change: a renderer
 * rebuilds its rows when it gets a different one. Selections are fire and
 * forget: a catalog page's are asynchronous, and their progress (`pending`)
 * and failure (`error`) arrive as later views.
 *
 * This file holds types only, so importing it adds no module to a page: the
 * two functions that build sources (`appearanceSourceOf`, `capabilitiesOf`)
 * live in `select.ts`, which the module entry already loads.
 */
import type { DesignModePreference } from "./mode-core.ts";
/** One family a person can choose. */
export interface AppearanceFamily {
    readonly id: string;
    readonly label: string;
    readonly modes: readonly DesignModePreference[];
    /** False for a retired theme: shown while it is in force, never chosen again. */
    readonly selectable: boolean;
}
/** Everything a renderer shows. */
export interface AppearanceView {
    readonly theme: string;
    readonly family: string;
    readonly mode: DesignModePreference;
    readonly effectiveMode: DesignModePreference;
    readonly scheme: "light" | "dark";
    readonly families: readonly AppearanceFamily[];
    /** The family being loaded, or null. */
    readonly pending: string | null;
    /** A sentence about the last failure, or null. */
    readonly error: string | null;
}
export interface AppearanceSource {
    view(): AppearanceView;
    subscribe(listener: () => void): () => void;
    selectFamily(id: string): void;
    selectMode(mode: string): void;
}
/** A source's family labels and modes, in the shape the switch's model and the mode note read. */
export interface FamilyCapabilities {
    readonly labels: Readonly<Record<string, string>>;
    modes(id: string): readonly DesignModePreference[];
}
