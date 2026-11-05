/**
 * Public module entry of @atomicstrata/themes.
 *
 * A page that ran a pre-paint script asks for the controller it left behind
 * (`getThemeController`), so configuration is stated once. A page with no
 * pre-paint script, and tests, create one (`createThemeController`), which
 * runs the same resolver. Nothing here depends on a framework, and nothing
 * here imports the external-theme catalog: a catalog controller on the page
 * is released through its own `dispose`, found on the window.
 */
import { type ThemeConfig, type ThemeController, type ThemeHost } from "./boot-core.ts";
import { type FamilyHost } from "./family-core.ts";
export type { CanonicalThemeId, ThemeConfig, ThemeController, ThemeHost, ThemeId } from "./boot-core.ts";
export type { DesignModeConfig, DesignModeController, DesignModePreference } from "./mode-core.ts";
export type { FamilyHost, ThemeAppearanceState, ThemeFamiliesConfig, ThemeFamilyController, ThemeFamilyId, ThemeFamilyThemeController, ThemeScheme, } from "./family-core.ts";
export { bindThemeSelect, modeNote } from "./select.ts";
export { CANONICAL_THEME_IDS, CANONICAL_THEME_LABELS, CONTRACT_VERSION, PRODUCT_THEME_ID, SYSTEM_SCHEME_THEME_ID, THEME_PREVIEW_ATTRIBUTE, } from "./registry.ts";
export { SOFT_FILL_PAIRS, STATUS_TOKENS, SURFACE_TOKENS, TEXT_TOKENS, TOKEN_NAMES } from "./tokens.ts";
/**
 * Check `config`, apply the stored or default theme (and, with `designMode`,
 * the mode preference; with `families`, the family) to the document, and
 * return the controller. A family controller already on the host is
 * disposed only after the new configuration has been checked.
 */
export declare function createThemeController(config: ThemeConfig, host?: ThemeHost | FamilyHost): ThemeController;
/** The controller a pre-paint script left on the page. Throws when none ran. */
export declare function getThemeController(host?: ThemeHost): ThemeController;
