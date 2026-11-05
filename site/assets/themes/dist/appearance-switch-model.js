/**
 * What the compact appearance switch shows and does, worked out from a family
 * controller's state alone, without a document.
 *
 * The switch (`appearance-switch.ts`) is a sun/moon button that changes the
 * displayed scheme in one click, beside a chevron that opens the System,
 * Light, Dark and theme choices. This module answers every question the
 * rendering asks: whether the primary button can change what is displayed in
 * the current family, which explicit preference it then selects, the words
 * its name, tooltip and description use, and the scheme each family's
 * preview is painted in. Keeping it pure keeps those rules testable in Node
 * and identical for the plain and React deliveries.
 *
 * The rules follow the family capabilities (`family-core.ts`): the primary
 * button selects the explicit preference opposite the scheme on screen, and
 * only when the current family can show that scheme. A light-only or
 * system-only family gets a button that says why it cannot switch, never one
 * that stores a preference without changing the page.
 */
import { themeOfFamily } from "./family-core.js";
import { MODE_LABELS, modeNote } from "./select.js";
const OPPOSITE = { light: "dark", dark: "light" };
/** The family's label as the controller states it. */
function familyLabel(family, id) {
    var _a;
    return (_a = family.labels[id]) !== null && _a !== void 0 ? _a : id;
}
/** Why a family cannot switch, from what it supports. */
function cannotSwitchReason(label, modes) {
    if (modes.length === 1 && modes[0] === "system")
        return `${label} follows your device setting`;
    return `${label} shows ${MODE_LABELS[modes[0]]} only`;
}
/** The appearance in force, in words: the preference, and for System what the device chose. */
function appearanceWords(state) {
    if (state.effectiveMode === "system")
        return `System (${state.scheme})`;
    return MODE_LABELS[state.effectiveMode];
}
/**
 * The switch's whole view of `state`, with `system` the operating system's
 * scheme. Only the System hint reads `system`: an explicit preference can
 * show the opposite scheme, and the hint describes System, not the screen.
 */
export function appearanceSwitchView(family, state, system) {
    const label = familyLabel(family, state.family);
    const modes = family.modes(state.family);
    const opposite = OPPOSITE[state.scheme];
    const canSwitch = modes.indexOf(opposite) >= 0;
    return {
        scheme: state.scheme,
        toggleTarget: canSwitch ? opposite : null,
        toggleLabel: canSwitch ? `Switch to ${opposite} appearance` : cannotSwitchReason(label, modes),
        summary: `Theme: ${label}. Appearance: ${appearanceWords(state)}.`,
        systemHint: `System uses your device setting, now ${system}.`,
        note: modeNote(family, state),
    };
}
/**
 * The theme id and scheme a family's preview is painted in: the scheme on
 * screen when the family can show it, else the one it shows instead. A
 * family shows a scheme it lists, and through `system` only the operating
 * system's: a system-only family is previewed in the device's scheme even
 * while another family pins the opposite one. The preview element carries
 * both as `data-theme` and `data-theme-scheme`, so the package's own theme
 * maps colour it; no colour is copied here.
 */
export function familyPreview(family, id, schemes) {
    const modes = family.modes(id);
    const followsToScreen = modes.indexOf("system") >= 0 && schemes.system === schemes.screen;
    const canShow = modes.indexOf(schemes.screen) >= 0 || followsToScreen;
    const instead = modes[0] === "system" ? schemes.system : modes[0];
    const shown = canShow ? schemes.screen : instead;
    return { theme: previewThemeOf(id, shown), scheme: shown };
}
/** The four built-in family ids; any other family is an external theme. */
const BUILT_IN_FAMILIES = ["clay", "minimal", "nebula", "product"];
/**
 * The theme id a family's preview carries: a built-in family's id in that
 * scheme, or an external theme's own id (its family and theme are one id).
 */
function previewThemeOf(id, scheme) {
    return BUILT_IN_FAMILIES.includes(id) ? themeOfFamily(id, scheme) : id;
}
/** Every accepted placement, the default first. */
export const APPEARANCE_SWITCH_PLACEMENTS = Object.freeze([
    "top-right", "top-left", "bottom-right", "bottom-left", "inline",
]);
/**
 * The placement `options` ask for. The accepted shape is exactly: nothing, or
 * an object whose only key is `placement`, one of the placements above (or
 * undefined). Anything else throws, so a misspelt option fails before a
 * switch is added rather than silently landing in the default corner.
 */
export function switchPlacement(options) {
    if (options === undefined)
        return "top-right";
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
        throw new Error("@atomicstrata/themes: appearance switch options must be an object");
    }
    const unknownKeys = Object.keys(options).filter((key) => key !== "placement");
    if (unknownKeys.length > 0)
        throw new Error(`@atomicstrata/themes: unknown appearance switch option "${unknownKeys[0]}"`);
    const placement = options.placement;
    if (placement === undefined)
        return "top-right";
    if (APPEARANCE_SWITCH_PLACEMENTS.indexOf(placement) < 0) {
        throw new Error(`@atomicstrata/themes: appearance switch placement must be one of ${APPEARANCE_SWITCH_PLACEMENTS.join(", ")}`);
    }
    return placement;
}
