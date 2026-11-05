/**
 * External themes at run time (`@atomicstrata/themes/catalog`).
 *
 * A catalog page offers the built-in families and external themes, the
 * page's static ones and those its one configured catalog publishes,
 * through one controller. It is a separate controller, not a subtype of
 * `ThemeController`: its ids include external ids, which the closed
 * `ThemeId` union does not, and its selections are asynchronous. A page
 * uses either kind, never both:
 *
 * - `getThemeCatalogController()` adopts the state the catalog pre-paint
 *   script (`prepaintCatalogSource`) stamped, once.
 * - `createThemeCatalogController(config)` checks the configuration and the
 *   host completely, then releases any previous owner (a catalog
 *   controller, or a family page's theme controller), stamps and returns a
 *   new controller. `createThemeController` releases a catalog controller
 *   the same way, so either kind replaces the other.
 *
 * The controller's state is one frozen `ThemeCatalogState` per transition.
 * `select(id)` resolves with an outcome and never rejects: `applied`,
 * `superseded` (a newer intent won), `failed` (nothing changed) or
 * `rejected`. Its `appearance` member drives the shared UI
 * (`bindThemeSelect`, `mountAppearanceSwitch`, React's `AppearanceSwitch`).
 *
 * Importing this module touches no global; the network is used only by
 * discovery and refresh, and only for the configured catalog and the
 * assets its index names.
 */
import { type DesignModeController } from "../mode-core.ts";
import type { AppearanceSource } from "../appearance-source.ts";
import { type ThemeCatalogConfig } from "./boot.ts";
import { type CatalogHost } from "./owner.ts";
import type { CatalogSettled, ThemeCatalogState, ThemeSelectionOutcome } from "./state.ts";
export type { AnyThemeId, CatalogSource, ExternalThemesConfig, StaticExternalTheme, ThemeCatalogConfig, } from "./boot.ts";
export type { CatalogHost } from "./owner.ts";
export type { CatalogSettled, ThemeCatalogError, ThemeCatalogErrorKind, ThemeCatalogState, ThemeChoice, ThemeSelectionOutcome, } from "./state.ts";
export { isExternalThemeId, type ExternalThemeId } from "../external/id.ts";
export interface ThemeCatalogController {
    snapshot(): ThemeCatalogState;
    subscribe(listener: (state: ThemeCatalogState) => void): () => void;
    /** Choose a family: a built-in family id or an external theme id. */
    select(id: unknown): Promise<ThemeSelectionOutcome>;
    /** The System/Light/Dark preference, as on a family page. */
    readonly mode: DesignModeController;
    /** Fetch the catalog (once; `discovery: "on-create"` starts it at creation). */
    discover(): Promise<CatalogSettled>;
    /** Fetch the catalog again and apply a newer revision. */
    refresh(): Promise<CatalogSettled>;
    /** Release listeners, loads and owned links; later selections are rejected. */
    dispose(): void;
    /** The shared UI's view of this controller. */
    readonly appearance: AppearanceSource;
}
/**
 * Check `config` and the host, release any previous owner, stamp the stored
 * or default state and return the controller.
 */
export declare function createThemeCatalogController(config: ThemeCatalogConfig, host?: CatalogHost): ThemeCatalogController;
/** The controller of a page whose catalog pre-paint script ran: adopted from its boot record once, then the same. */
export declare function getThemeCatalogController(host?: CatalogHost): ThemeCatalogController;
