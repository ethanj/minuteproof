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
import type { FamilyCapabilities } from "./appearance-source.ts";
import { type ThemeScheme } from "./family-core.ts";
import type { DesignModePreference } from "./mode-core.ts";
/**
 * The state the switch shows: a family page's `ThemeAppearanceState`, or a
 * catalog page's, whose family may be an external id.
 */
export interface SwitchState {
    readonly family: string;
    readonly mode: DesignModePreference;
    readonly effectiveMode: DesignModePreference;
    readonly scheme: ThemeScheme;
}
/** Everything the switch renders for one state. */
export interface AppearanceSwitchView {
    /** The scheme on screen, which picks the sun or moon icon. */
    readonly scheme: ThemeScheme;
    /** The explicit preference the primary button selects, or null when this family cannot show it. */
    readonly toggleTarget: ThemeScheme | null;
    /** The primary button's accessible name and tooltip. */
    readonly toggleLabel: string;
    /** Theme and appearance in force, for the description and the chevron's tooltip. */
    readonly summary: string;
    /** What System would show right now (the operating system's scheme), under the appearance choices. */
    readonly systemHint: string;
    /** Why the preference is not what is shown (`modeNote`), or "". */
    readonly note: string;
}
/**
 * The switch's whole view of `state`, with `system` the operating system's
 * scheme. Only the System hint reads `system`: an explicit preference can
 * show the opposite scheme, and the hint describes System, not the screen.
 */
export declare function appearanceSwitchView(family: FamilyCapabilities, state: SwitchState, system: ThemeScheme): AppearanceSwitchView;
/** The schemes a preview is chosen from: the one on screen, and the operating system's. */
export interface PreviewSchemes {
    readonly screen: ThemeScheme;
    readonly system: ThemeScheme;
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
export declare function familyPreview(family: FamilyCapabilities, id: string, schemes: PreviewSchemes): {
    theme: string;
    scheme: ThemeScheme;
};
/**
 * Where a switch sits. A corner fixes it to that corner of the viewport (the
 * default is the top right); `inline` leaves it in the flow of its host, for
 * a header or a settings page.
 */
export type AppearanceSwitchPlacement = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "inline";
/** Options of `mountAppearanceSwitch` and the React `AppearanceSwitch`. */
export interface AppearanceSwitchOptions {
    /** Where the switch sits; `"top-right"` when omitted. */
    placement?: AppearanceSwitchPlacement;
}
/** Every accepted placement, the default first. */
export declare const APPEARANCE_SWITCH_PLACEMENTS: readonly AppearanceSwitchPlacement[];
/**
 * The placement `options` ask for. The accepted shape is exactly: nothing, or
 * an object whose only key is `placement`, one of the placements above (or
 * undefined). Anything else throws, so a misspelt option fails before a
 * switch is added rather than silently landing in the default corner.
 */
export declare function switchPlacement(options: unknown): AppearanceSwitchPlacement;
