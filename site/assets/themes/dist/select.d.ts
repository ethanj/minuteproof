/**
 * Bind native theme selectors to a controller.
 *
 * Fills every `<select data-theme-select>` under a root with the controller's
 * closed registry, shows the theme already applied, and hands a person's
 * change to the controller. It keeps no state of its own: what is shown is
 * always what the controller reports, so several selectors stay in step and
 * the control cannot disagree with the document.
 *
 * On a page with theme families (`family-core.ts`) two more selectors bind
 * the same way: `<select data-theme-family-select>` (the families) and
 * `<select data-theme-mode-select>` (System, Light, Dark). The mode select
 * shows the person's preference. When the current family cannot show it (a
 * single-mode product), every `[data-theme-mode-note]` under the root says
 * so, and what is shown instead, and the select is described by it; the
 * preference is kept for the families that can show it. A binding owns only
 * what it adds: the note's text and visibility are given back on release,
 * and only the note ids it added to `aria-describedby` are ever removed.
 *
 * Binding is idempotent per element: binding a select that is already bound
 * first releases its earlier binding, so wiring a page twice (or a component
 * that mounts again) never leaves two listeners, and one change is one
 * selection and one stored write.
 */
import type { AppearanceSource, AppearanceView, FamilyCapabilities } from "./appearance-source.ts";
import type { ThemeController } from "./boot-core.ts";
import type { DesignModePreference } from "./mode-core.ts";
export declare const MODE_LABELS: Readonly<Record<DesignModePreference, string>>;
/** The state the mode note describes: a family's preference and the mode it shows. */
interface ModeState {
    readonly family: string;
    readonly mode: DesignModePreference;
    readonly effectiveMode: DesignModePreference;
}
/** A catalog page's controller, as far as binding needs it (`@atomicstrata/themes/catalog`). */
interface AppearanceOwner {
    readonly appearance: AppearanceSource;
}
/** The labels and modes of a view's families. */
export declare function capabilitiesOf(view: AppearanceView): FamilyCapabilities;
/**
 * The appearance source of a controller: a catalog controller's own, or a
 * family page's adapted (one adapter per controller). Null for a controller
 * that has neither, such as a page without families.
 */
export declare function appearanceSourceOf(controller: unknown): AppearanceSource | null;
/**
 * Why the mode in force differs from the preference, or "" when it does not,
 * worded from what the family can actually show.
 */
export declare function modeNote(family: FamilyCapabilities, state: ModeState): string;
/** A status line: the family being loaded, else the last failure, else nothing. */
export declare function statusOf(view: AppearanceView): string;
/**
 * Fill and wire every theme selector under `root`, and on a family page (or
 * a catalog page) every family and mode selector, mode note and status
 * element. On a catalog page a theme selector lists the families too: a
 * catalog page has no separate theme list.
 * @returns a function that releases the bindings this call made. Releasing a
 *   binding that a later call has already replaced does nothing.
 */
export declare function bindThemeSelect(root: ParentNode, controller: ThemeController | AppearanceOwner): () => void;
export {};
