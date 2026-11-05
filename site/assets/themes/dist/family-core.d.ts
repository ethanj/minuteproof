/**
 * The optional theme families (Clay, Minimal, Nebula and the product's own),
 * with one System/Light/Dark preference shared by all of them.
 *
 * A configuration opts in with `families` beside `designMode`. The person
 * then chooses a family and, separately, a mode; switching family keeps the
 * mode. The resolver turns the pair into the existing root contract:
 *
 * - `data-theme` stays a canonical id or `product`. Nebula resolves to
 *   `nebula-light` or `nebula-dark`, so no new theme id exists.
 * - `data-theme-scheme` (new, only on family pages) is the scheme resolved
 *   from the mode and, for "system", from `prefers-color-scheme`. Clay's dark
 *   palette and Minimal's explicit modes are keyed on it; a page without
 *   families never carries it, so its stylesheets render exactly as before.
 * - `data-design-mode` is the mode in force (`mode-core.ts`), so explicit-mode
 *   design systems under `product` keep following the same preference.
 *
 * Each family supports a set of modes. Clay and Minimal support all three;
 * Nebula supports what its offered ids allow; the product declares its own
 * (`productModes`), so a single-mode system reports one mode honestly and the
 * preference is kept, unapplied, for the families that can show it.
 *
 * State: the theme key keeps holding a canonical id (the family is derived
 * from it; selections write the resolved id, so a page without families on
 * the same key still reads a valid id) and the mode key keeps the preference
 * itself. An operating-system change re-resolves and notifies but never
 * writes storage. Every transition computes the complete state, stamps it,
 * then notifies, so subscribers never see a partial state.
 *
 * Like `boot-core.ts` and `mode-core.ts`, every function in `familyParts` is
 * self-contained: it may call functions listed in `bootParts`, `modeParts`
 * and `familyParts`, and nothing else from module scope, because the
 * classic scripts are assembled from their source text.
 */
import { type ResolvedConfig, type ScriptLike, type ThemeController, type ThemeHost, type ThemeId } from "./boot-core.ts";
import { type DesignModeController, type DesignModePreference, type ResolvedModeConfig } from "./mode-core.ts";
export type ThemeFamilyId = "clay" | "minimal" | "nebula" | "product";
export type ThemeScheme = "light" | "dark";
/** The family opt-in. `productModes` is required exactly when `productTheme` is set. */
export interface ThemeFamiliesConfig {
    /** The modes the product's palette can show; the first is used when the preference is not one of them. */
    productModes?: readonly DesignModePreference[];
    /** Explicit, one-time migration of the mode preference from a stored theme id (see `migratedMode`). */
    migrateMode?: "from-theme";
}
/** The complete resolved state, one frozen object per transition. */
export interface ThemeAppearanceState {
    readonly theme: ThemeId;
    readonly family: ThemeFamilyId;
    /** The person's preference, as stored. */
    readonly mode: DesignModePreference;
    /** The preference if the family supports it, else the family's first mode. */
    readonly effectiveMode: DesignModePreference;
    readonly scheme: ThemeScheme;
}
export interface ThemeFamilyController {
    readonly ids: readonly ThemeFamilyId[];
    readonly labels: Readonly<Record<string, string>>;
    readonly defaultFamily: ThemeFamilyId;
    current(): ThemeFamilyId;
    select(value: unknown): ThemeFamilyId;
    modes(family: ThemeFamilyId): readonly DesignModePreference[];
    snapshot(): ThemeAppearanceState;
    subscribe(listener: (state: ThemeAppearanceState) => void): () => void;
    /** Stop following the operating system and remove `data-theme-scheme`. Selections then throw. */
    dispose(): void;
}
/** A theme controller from a family configuration: `mode` and `family` are always present. */
export interface ThemeFamilyThemeController extends ThemeController {
    readonly mode: DesignModeController;
    readonly family: ThemeFamilyController;
}
export interface MediaListLike {
    readonly matches: boolean;
    addEventListener(type: "change", listener: () => void): void;
    removeEventListener(type: "change", listener: () => void): void;
}
/** A host for families also answers `matchMedia`. */
export interface FamilyHost extends ThemeHost {
    matchMedia?(query: string): MediaListLike;
}
export interface FamilyEntry {
    id: ThemeFamilyId;
    label: string;
    modes: DesignModePreference[];
}
interface ResolvedFamilies {
    entries: FamilyEntry[];
    migrate: boolean;
}
/** A completely checked family configuration. */
export interface ResolvedFamilyBoot {
    theme: ResolvedConfig;
    mode: ResolvedModeConfig;
    families: ResolvedFamilies;
}
/** The family a theme id belongs to. */
export declare function familyOfTheme(theme: ThemeId): ThemeFamilyId;
/** The theme id a family shows in a resolved scheme. */
export declare function themeOfFamily(family: ThemeFamilyId, scheme: ThemeScheme): ThemeId;
/**
 * Check a family configuration completely: the theme part (`boot-core`), the
 * mode part (`mode-core`) and `families`. Migration needs both keys.
 */
export declare function resolveFamilyBoot(raw: unknown): ResolvedFamilyBoot;
/** The theme in force and whether it came from storage (directly or through `legacyPreference`). */
export declare function storedFamilyTheme(config: ResolvedConfig, host: ThemeHost): {
    theme: ThemeId;
    stored: boolean;
};
/**
 * The mode preference in force. A stored mode always wins; an unreadable or
 * invalid one is the default. Only a mode key read successfully as empty,
 * with `migrateMode` set and a theme that really came from storage, is
 * migrated: from what that theme showed before families existed.
 */
export declare function familyMode(config: ResolvedFamilyBoot, theme: {
    theme: ThemeId;
    stored: boolean;
}, host: ThemeHost): DesignModePreference;
/** Write the three root attributes of a state (a family page's, or a catalog page's with an external id). */
export declare function stampAppearance(host: ThemeHost, state: Pick<ThemeAppearanceState, "scheme" | "effectiveMode"> & {
    readonly theme: string;
}): void;
/**
 * The colour-scheme media list families follow "system" through. The host
 * must have `matchMedia` and the list change listeners; checked before
 * anything is read, released or stamped.
 */
export declare function schemeMediaOf(host: FamilyHost): MediaListLike;
/** Dispose a family controller already on the host, so a page never has two owners following the system. */
export declare function releasePreviousOwner(host: ThemeHost): void;
/**
 * Check everything, then release a previous owner, read both preferences,
 * stamp the complete state, follow the system, and leave the controller.
 */
export declare function bootWithFamilies(raw: unknown, host: FamilyHost): ThemeFamilyThemeController;
/**
 * The prebuilt family script's configuration: the mode script's, plus
 * optionally `data-product-modes` (space separated) and `data-migrate-mode`.
 * The tag itself was already required by the theme's reader.
 */
export declare function familyConfigFromScript(script: ScriptLike, config: Record<string, unknown>): Record<string, unknown>;
/** Whether a configuration asks for families. Not part of `familyParts`: the classic scripts never call it. */
export declare function asksForFamilies(config: unknown): boolean;
/** The functions a family classic script adds after `bootParts()` and `modeParts()`. */
export declare function familyParts(): Array<(...args: never[]) => unknown>;
export {};
