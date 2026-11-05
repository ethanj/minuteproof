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
import { bootCore, resolveConfig } from "./boot-core.js";
import { asksForFamilies, bootWithFamilies, releasePreviousOwner, resolveFamilyBoot, schemeMediaOf, } from "./family-core.js";
import { asksForMode, bootWithMode, checkModeRoot, resolveModeConfig, splitModeConfig } from "./mode-core.js";
export { bindThemeSelect, modeNote } from "./select.js";
export { CANONICAL_THEME_IDS, CANONICAL_THEME_LABELS, CONTRACT_VERSION, PRODUCT_THEME_ID, SYSTEM_SCHEME_THEME_ID, THEME_PREVIEW_ATTRIBUTE, } from "./registry.js";
export { SOFT_FILL_PAIRS, STATUS_TOKENS, SURFACE_TOKENS, TEXT_TOKENS, TOKEN_NAMES } from "./tokens.js";
/**
 * Dispose a catalog controller (`@atomicstrata/themes/catalog`) that owns the
 * page, or drop a catalog pre-paint record no controller adopted, so a theme
 * controller created afterwards is the page's only owner. Called only after
 * the new configuration and host have been checked. Duck-typed, so this
 * entry imports nothing from the catalog.
 */
function releaseCatalogOwner(host) {
    const holder = host;
    const owner = holder.__atomicstrataThemeCatalog;
    if (owner !== undefined && typeof owner.dispose === "function")
        owner.dispose();
    delete holder.__atomicstrataThemeCatalog;
}
/** Check a configuration without families completely, so a refused one leaves a previous owner in place. */
function checkWithoutFamilies(config) {
    if (!asksForMode(config)) {
        resolveConfig(config);
        return;
    }
    const parts = splitModeConfig(config);
    resolveModeConfig(parts.mode, resolveConfig(parts.theme));
}
/**
 * Check `config`, apply the stored or default theme (and, with `designMode`,
 * the mode preference; with `families`, the family) to the document, and
 * return the controller. A family controller already on the host is
 * disposed only after the new configuration has been checked.
 */
export function createThemeController(config, host = globalThis) {
    if (asksForFamilies(config)) {
        resolveFamilyBoot(config);
        checkModeRoot(host);
        schemeMediaOf(host);
        releaseCatalogOwner(host);
        return bootWithFamilies(config, host);
    }
    checkWithoutFamilies(config);
    releaseCatalogOwner(host);
    releasePreviousOwner(host);
    return asksForMode(config) ? bootWithMode(config, host) : bootCore(config, host);
}
/** The controller a pre-paint script left on the page. Throws when none ran. */
export function getThemeController(host = globalThis) {
    const controller = host.__atomicstrataTheme;
    if (!controller) {
        throw new Error("@atomicstrata/themes: no pre-paint script has run on this page; load one, or call createThemeController");
    }
    return controller;
}
