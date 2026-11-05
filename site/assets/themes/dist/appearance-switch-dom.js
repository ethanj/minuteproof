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
import { THEME_PREVIEW_ATTRIBUTE } from "./registry.js";
import { MODE_LABELS } from "./select.js";
const SVG_NS = "http://www.w3.org/2000/svg";
const ICON_VIEWBOX = "0 0 24 24";
const SUN_PATH = "M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10Zm0-5v3m0 14v3M2 12h3m14 0h3"
    + "M4.9 4.9l2.1 2.1m10 10l2.1 2.1M4.9 19.1l2.1-2.1m10-10l2.1-2.1";
const MOON_PATH = "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z";
const CHEVRON_PATH = "M7 10l5 5l5-5";
const CHECK_PATH = "M5 12.5l4.5 4.5L19 7.5";
const PREVIEW_SWATCHES = ["canvas", "surface", "accent"];
const MODE_ORDER = ["system", "light", "dark"];
/** Ids unique within the document, one prefix per mount. */
let mountCount = 0;
function element(doc, tag, className) {
    const made = doc.createElement(tag);
    made.className = className;
    return made;
}
/** A decorative 24px icon of one path, drawn in the text colour. */
function icon(doc, pathData, className) {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", ICON_VIEWBOX);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("class", className);
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
    svg.append(path);
    return { svg, path };
}
/** The scheme icon's path data: the sun for light, the moon for dark. */
export function schemeIconPath(scheme) {
    return scheme === "dark" ? MOON_PATH : SUN_PATH;
}
/** A native radio with no form owner, in group `name`. */
function radio(doc, name, value, noForm) {
    const input = element(doc, "input", "asw-radio");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.setAttribute("form", noForm);
    return input;
}
function fieldset(doc, legendText, className) {
    const set = element(doc, "fieldset", className);
    const legend = element(doc, "legend", "asw-legend");
    legend.textContent = legendText;
    set.append(legend);
    return set;
}
/** The System/Light/Dark segmented radios and the hint below them. */
function modeChoices(doc, prefix) {
    var _a;
    const set = fieldset(doc, "Appearance", "asw-group");
    const segments = element(doc, "div", "asw-segments");
    const inputs = MODE_ORDER.map((mode) => {
        const label = element(doc, "label", "asw-segment");
        const input = radio(doc, `${prefix}-mode`, mode, `${prefix}-no-form`);
        const text = element(doc, "span", "asw-segment-text");
        text.textContent = MODE_LABELS[mode];
        label.append(input, text);
        segments.append(label);
        return input;
    });
    const hint = element(doc, "p", "asw-hint");
    hint.id = `${prefix}-hint`;
    (_a = inputs[0]) === null || _a === void 0 ? void 0 : _a.setAttribute("aria-describedby", hint.id);
    set.append(segments, hint);
    return { set, inputs, hint };
}
/** One family row: radio, palette preview, name and check mark. */
function familyRow(doc, prefix, id, name) {
    const row = element(doc, "label", "asw-row");
    const input = radio(doc, `${prefix}-family`, id, `${prefix}-no-form`);
    const preview = element(doc, "span", "asw-preview");
    preview.setAttribute("aria-hidden", "true");
    preview.setAttribute(THEME_PREVIEW_ATTRIBUTE, "");
    for (const swatch of PREVIEW_SWATCHES)
        preview.append(element(doc, "span", `asw-swatch asw-swatch-${swatch}`));
    const text = element(doc, "span", "asw-row-name");
    text.textContent = name;
    row.append(input, preview, text, icon(doc, CHECK_PATH, "asw-check").svg);
    return { row, input, preview };
}
/** The family radios, in the source's order and with its labels; a retired theme's radio is disabled. */
function familyRows(doc, prefix, families) {
    const rows = families.map((family) => {
        const made = familyRow(doc, prefix, family.id, family.label);
        if (!family.selectable)
            made.input.disabled = true;
        return made;
    });
    return { rows: rows.map((row) => row.row), inputs: rows.map((row) => row.input), previews: rows.map((row) => row.preview) };
}
/** Replace the theme rows with rows for `families` (a catalog's offer changed). */
export function replaceFamilies(doc, parts, families) {
    var _a, _b, _c;
    const made = familyRows(doc, parts.prefix, families);
    const focused = (_a = parts.familyInputs.find((input) => input === doc.activeElement)) === null || _a === void 0 ? void 0 : _a.value;
    for (const input of parts.familyInputs)
        (_b = input.closest("label")) === null || _b === void 0 ? void 0 : _b.remove();
    parts.familySet.append(...made.rows);
    // Keep keyboard focus on the same theme when its row is rebuilt.
    if (focused !== undefined)
        (_c = made.inputs.find((input) => input.value === focused)) === null || _c === void 0 ? void 0 : _c.focus();
    parts.familyInputs = made.inputs;
    parts.previews = made.previews;
    parts.families = families;
}
/** The primary scheme button and the chevron that discloses the panel. */
function buttons(doc, prefix) {
    const toggle = element(doc, "button", "asw-toggle");
    toggle.type = "button";
    const toggleIcon = icon(doc, SUN_PATH, "asw-icon");
    const face = element(doc, "span", "asw-face");
    face.append(toggleIcon.svg);
    toggle.append(face);
    const disclose = element(doc, "button", "asw-disclose");
    disclose.type = "button";
    disclose.setAttribute("aria-expanded", "false");
    disclose.setAttribute("aria-controls", `${prefix}-panel`);
    disclose.setAttribute("aria-label", "Appearance settings");
    const tab = element(doc, "span", "asw-tab");
    tab.append(icon(doc, CHEVRON_PATH, "asw-icon asw-chevron").svg);
    disclose.append(tab);
    return { toggle, toggleIcon: toggleIcon.path, disclose };
}
/** Build every element of one switch for `families`; appends nothing. */
export function buildSwitch(doc, families) {
    mountCount += 1;
    const prefix = `asw-${mountCount}`;
    const { toggle, toggleIcon, disclose } = buttons(doc, prefix);
    const summary = element(doc, "span", "asw-summary");
    summary.id = `${prefix}-summary`;
    summary.hidden = true;
    toggle.setAttribute("aria-describedby", summary.id);
    const panel = element(doc, "div", "asw-panel");
    panel.id = `${prefix}-panel`;
    panel.hidden = true;
    const modes = modeChoices(doc, prefix);
    const note = element(doc, "p", "asw-note");
    note.hidden = true;
    const status = element(doc, "p", "asw-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    const familySet = fieldset(doc, "Theme", "asw-group asw-families");
    const rows = familyRows(doc, prefix, families);
    familySet.append(...rows.rows);
    panel.append(modes.set, note, familySet, status);
    const root = element(doc, "span", "asw");
    root.setAttribute("data-appearance-switch", "");
    root.append(toggle, disclose, summary, panel);
    return {
        toggle, toggleIcon, disclose, summary, panel, note, hint: modes.hint, status, prefix,
        modeInputs: modes.inputs, familyInputs: rows.inputs, previews: rows.previews, families, familySet,
        root,
    };
}
