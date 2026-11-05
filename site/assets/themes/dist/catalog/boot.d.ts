/**
 * Catalog pages before first paint: the configuration, the stored theme and
 * the first stamp, for pages that offer external themes beside the built-in
 * families.
 *
 * A catalog configuration is a family configuration (`family-core.ts`:
 * `designMode` and `families` are required) plus `external`:
 *
 * - `fallback`: a built-in theme id the page shows when an external theme
 *   cannot be. Always explicit, even beside an external default, so a failed
 *   external default never falls back to itself.
 * - `static`: themes whose compiled stylesheet the page links or inlines in
 *   `<head>` itself, so it is present at first paint. Each is pinned by id,
 *   version, modes and build (`staticThemeEntry` writes one from a
 *   manifest).
 * - `catalog`: the one trusted catalog the page discovers further themes
 *   from: its id, URL (`https:`, or `http:` on a loopback host), credentials
 *   mode and layer.
 * - `discovery`: `"on-create"` or `"manual"`; there is no default.
 *
 * `defaultTheme` may name a static external theme. Every check runs before
 * storage is read or the document touched, as `boot-core.ts` does.
 *
 * Resolution of the stored theme:
 *
 * - A built-in value resolves exactly as on a family page.
 * - A static external id is applied at first paint: its stylesheet is in
 *   `<head>`.
 * - Any other external id cannot be: its stylesheet is not known before
 *   discovery. The page boots on the built-in `external.fallback`, and the
 *   id is kept as `restoring`; storage is not touched. The controller restores it after
 *   discovery unless the person chooses first.
 *
 * Like `boot-core.ts`, every function in `catalogBootParts` is
 * self-contained: it calls only functions listed in `bootParts`,
 * `modeParts`, `familyParts` and `catalogBootParts`, because the generated
 * pre-paint script is assembled from their source text. Beyond what the
 * family script uses they need only the `URL` parser, so that a catalog URL
 * is validated as the browser will read it.
 *
 * External themes are offered on family pages only: `designMode` and
 * `families` are required. Pages without families keep the existing
 * controllers, which are unchanged.
 */
import { type ThemeId } from "../boot-core.ts";
import { type ExternalThemeId } from "../external/id.ts";
import { type DesignModeConfig, type DesignModePreference } from "../mode-core.ts";
import { type FamilyHost, type ResolvedFamilyBoot, type ThemeFamiliesConfig, type ThemeScheme } from "../family-core.ts";
import type { ThemeConfig } from "../boot-core.ts";
export type AnyThemeId = ThemeId | ExternalThemeId;
/** A theme whose compiled stylesheet the page delivers itself, in `<head>`. */
export interface StaticExternalTheme {
    id: ExternalThemeId;
    label: string;
    version: string;
    modes: DesignModePreference[];
    build: string;
    delivery: "linked" | "inline";
}
/** The one catalog a page trusts, chosen by the consumer. */
export interface CatalogSource {
    id: string;
    url: string;
    credentials: "omit" | "same-origin" | "include";
    layer: string | null;
}
export interface ExternalThemesConfig {
    fallback: ThemeId;
    static?: readonly StaticExternalTheme[];
    catalog?: CatalogSource;
    discovery: "on-create" | "manual";
}
/** A catalog page's configuration: a family configuration with `external`. */
export interface ThemeCatalogConfig extends Omit<ThemeConfig, "defaultTheme" | "designMode" | "families"> {
    defaultTheme?: ThemeId | ExternalThemeId;
    designMode: DesignModeConfig;
    families: ThemeFamiliesConfig;
    external: ExternalThemesConfig;
}
export interface ResolvedExternal {
    fallback: ThemeId;
    statics: StaticExternalTheme[];
    catalog: CatalogSource | null;
    discovery: "on-create" | "manual";
    defaultExternal: ExternalThemeId | null;
}
export interface ResolvedCatalogBoot {
    family: ResolvedFamilyBoot;
    external: ResolvedExternal;
}
/** One stamped state: a family page's, with an external id possible as theme and family. */
export interface CatalogAppearanceState {
    readonly theme: AnyThemeId;
    readonly family: string;
    readonly mode: DesignModePreference;
    readonly effectiveMode: DesignModePreference;
    readonly scheme: ThemeScheme;
}
/** What the pre-paint script leaves for the module controller: the configuration, the state it stamped, the restore. */
export interface CatalogBootRecord {
    readonly kind: "atomicstrata-theme-catalog-boot";
    readonly config: unknown;
    readonly state: CatalogAppearanceState;
    readonly restoring: ExternalThemeId | null;
}
/** Check a catalog configuration completely: the family part with the existing resolvers, then `external`. */
export declare function resolveCatalogBoot(raw: unknown): ResolvedCatalogBoot;
/** The complete state for a family entry (built-in or external), a preference and the system's scheme. */
export declare function catalogAppearance(entry: {
    id: string;
    modes: DesignModePreference[];
}, preference: DesignModePreference, prefersDark: boolean): CatalogAppearanceState;
/** Check everything, read both preferences, stamp the first state and leave the boot record. */
export declare function bootCatalog(raw: unknown, host: FamilyHost): CatalogBootRecord;
/** The functions a catalog classic script adds after `bootParts()`, `modeParts()` and `familyParts()`. */
export declare function catalogBootParts(): Array<(...args: never[]) => unknown>;
