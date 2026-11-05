/**
 * The elements of the compact appearance switch, built once per mount.
 *
 * Structure, inside one `<span class="asw" data-appearance-switch>` appended
 * to the consumer's host element (the host itself is never changed):
 *
 * - a primary `<button>` with an inline sun or moon icon, which changes the
 *   displayed scheme in one click. The icon sits in an `asw-face` span, the
 *   visible button the stylesheet draws inside the larger target;
 * - a quieter chevron `<button>` (`aria-expanded`, `aria-controls`) that
 *   opens the panel placed right after it, so Tab moves from the chevron
 *   straight into the choices. Its chevron sits in an `asw-tab` span, the
 *   small tab the stylesheet attaches to the face's right side;
 * - the non-modal panel: an "Appearance" fieldset of three native radios
 *   (System, Light, Dark) drawn as a segmented control, a hint saying what
 *   System means now, the note explaining a preference the family cannot
 *   show, and a "Theme" fieldset of one native radio row per family, each
 *   with a palette preview (marked `data-theme-preview`, so a compiled
 *   design system can paint the product's) and a check mark.
 *
 * Native radio groups give arrow-key movement, one tab stop per group and
 * the right announcements without menu roles. Their inputs are given a
 * `form` attribute naming no element, so they have no form owner: a switch
 * placed inside a consumer's form never adds fields to its submission, and
 * Enter in a radio never submits it. Icons are inline SVG paths with
 * `currentColor`; no icon library or external file is involved.
 *
 * Nothing here reads state or listens to anything; `appearance-switch.ts`
 * fills the elements in from the model and owns every listener.
 */
import type { AppearanceFamily } from "./appearance-source.ts";
/** The elements a mount fills in and listens to. */
export interface SwitchElements {
    readonly toggle: HTMLButtonElement;
    readonly toggleIcon: SVGPathElement;
    readonly disclose: HTMLButtonElement;
    readonly summary: HTMLElement;
    readonly panel: HTMLElement;
    readonly modeInputs: readonly HTMLInputElement[];
    /** The theme rows, replaced together when the families change (`replaceFamilies`). */
    familyInputs: readonly HTMLInputElement[];
    previews: readonly HTMLElement[];
    /** The families the rows were built from. */
    families: readonly AppearanceFamily[];
    /** The fieldset holding the theme rows. */
    readonly familySet: HTMLFieldSetElement;
    readonly hint: HTMLElement;
    readonly note: HTMLElement;
    /** A polite live region: a theme being loaded, or why it could not be. */
    readonly status: HTMLElement;
    /** The id prefix of this mount. */
    readonly prefix: string;
    /** The one element the mount appends to the host and removes on release; it scopes the styles. */
    readonly root: HTMLElement;
}
/** The scheme icon's path data: the sun for light, the moon for dark. */
export declare function schemeIconPath(scheme: "light" | "dark"): string;
/** Replace the theme rows with rows for `families` (a catalog's offer changed). */
export declare function replaceFamilies(doc: Document, parts: SwitchElements, families: readonly AppearanceFamily[]): void;
/** Build every element of one switch for `families`; appends nothing. */
export declare function buildSwitch(doc: Document, families: readonly AppearanceFamily[]): SwitchElements;
