/**
 * The optional compact appearance switch (`@atomicstrata/themes/appearance-switch`).
 *
 * `mountAppearanceSwitch(host, controller, options?)` fills a consumer's
 * element with a sun/moon button that switches the displayed scheme in one click and a
 * chevron that opens a small non-modal panel of System/Light/Dark and theme
 * choices (elements: `appearance-switch-dom.ts`; words and capabilities:
 * `appearance-switch-model.ts`). Style it with the optional
 * `css/appearance-switch.css`, which reads semantic tokens only.
 *
 * Placement (`options.placement`): by default the switch is fixed to the top
 * right corner of the viewport; the three other corners and `inline` (in the
 * flow of the host, for a header or settings page) are the alternatives.
 * The placement is written as `data-placement` on the switch's own element,
 * and the stylesheet does the positioning, so a designer moves it with the
 * option or the documented CSS variables, not by script. Importing the
 * module adds nothing to any page; only a mount does.
 *
 * The switch keeps no theme state. Everything it shows comes from the family
 * controller's snapshot, and every choice goes back through the controller
 * (`mode.select`, `family.select`), which alone stamps, stores and notifies.
 * So any number of switches, and the native selects `bindThemeSelect` wires,
 * stay in step, and none can disagree with the document. The only state it
 * holds is whether its own panel is open.
 *
 * The controller must have been configured with `families`; this is checked
 * before anything is added to the page. Mounting a host that is already
 * mounted first releases the earlier mount, so a component that mounts
 * twice (React StrictMode, a rebind after the controller was replaced) never
 * leaves two sets of listeners. The switch lives in one element appended to
 * the host; releasing removes it and every listener the mount added, and
 * leaves the host as it was. The module touches no global at import,
 * so it can be imported during server rendering.
 */
import type { AppearanceSource } from "./appearance-source.ts";
import type { ThemeController } from "./boot-core.ts";
import { type AppearanceSwitchOptions } from "./appearance-switch-model.ts";
import type { ThemeFamilyController } from "./family-core.ts";
import type { DesignModeController } from "./mode-core.ts";
export { APPEARANCE_SWITCH_PLACEMENTS } from "./appearance-switch-model.ts";
export type { AppearanceSwitchOptions, AppearanceSwitchPlacement } from "./appearance-switch-model.ts";
/** A controller the switch can show: a family page's theme controller, or a catalog page's controller. */
export type SwitchControllerLike = ThemeController | {
    readonly appearance: AppearanceSource;
};
/**
 * The appearance source of `controller`, or a throw unless it carries
 * families and a mode (a family page) or is a catalog controller: the only
 * states the switch can show. Shared by the React adapter, which checks
 * while rendering.
 */
export declare function switchSourceOf(controller: unknown): AppearanceSource;
/** A family page's theme controller, once checked: `family` and `mode` are present. */
export type SwitchThemeController = ThemeController & {
    readonly family: ThemeFamilyController;
    readonly mode: DesignModeController;
};
/**
 * `switchSourceOf` as an assertion, for callers that only check. A theme
 * controller is narrowed as before 0.8 (its optional `family` and `mode` are
 * then present); any other value is narrowed to a controller the switch can
 * show, a catalog controller included.
 */
export declare function assertSwitchController(controller: ThemeController): asserts controller is SwitchThemeController;
export declare function assertSwitchController(controller: unknown): asserts controller is SwitchControllerLike;
/**
 * Render a compact appearance switch into `host` and keep it in step with
 * `controller`, placed as `options.placement` says (the top right corner by
 * default; see `AppearanceSwitchPlacement`). Throws, before changing
 * anything (an earlier switch on `host` stays mounted), when `host` is not
 * an element, `controller` was configured without families, `options` is not
 * of the accepted shape, or the host's window has no `matchMedia`.
 * @returns a function that removes the switch and every listener it added.
 *   Releasing a mount that a later mount of the same host replaced does nothing.
 */
export declare function mountAppearanceSwitch(host: HTMLElement, controller: SwitchControllerLike, options?: AppearanceSwitchOptions): () => void;
