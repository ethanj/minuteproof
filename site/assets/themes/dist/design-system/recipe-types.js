/**
 * Types and fixed vocabulary of component appearance recipes.
 *
 * A recipe document is optional, typed metadata compiled beside a profile: it
 * gives a bounded set of component roles (an action, a field, a card, a
 * status and running text) a system's treatment, per variant, size and
 * state, from the system's own vocabulary. It is pinned to one profile id and
 * version. The compiler writes it as zero-specificity rules, in a fixed
 * order, scoped like the component adapter, onto elements that opt in with
 * `data-design-recipe`. There is no selector, property or state outside the
 * tables below: this is a closed grammar, not a CSS interpreter.
 *
 * The tables are shared by the validator, the emitter and the contrast
 * evaluator, so the three cannot disagree about which states exist, how they
 * are selected or in which order they win.
 */
export const RECIPES_SCHEMA = "atomicstrata-design-system-recipes/1";
/** The opt-in marker and its two qualifiers. Disjoint from a registry's `data-slot` and `data-variant`. */
export const DESIGN_RECIPE_ATTRIBUTE = "data-design-recipe";
export const DESIGN_RECIPE_VARIANT_ATTRIBUTE = "data-design-variant";
export const DESIGN_RECIPE_SIZE_ATTRIBUTE = "data-design-size";
export const RECIPE_ROLES = ["action", "field", "card", "status", "text"];
/** Every state, in the order its rules win: a later state overrides an earlier one where both apply. */
export const STATE_ORDER = ["rest", "hover", "active", "selected", "invalid", "focus-visible", "disabled"];
const NOT_DISABLED = ':not(:disabled):not([aria-disabled="true"])';
/** The exact DOM condition of each state. Hover and press never apply to a disabled control. */
export const STATE_SELECTORS = Object.freeze({
    hover: `:hover${NOT_DISABLED}`,
    active: `:active${NOT_DISABLED}`,
    selected: ':is([aria-selected="true"], [aria-pressed="true"], [aria-current]:not([aria-current="false"]))',
    invalid: '[aria-invalid="true"]',
    "focus-visible": ":focus-visible",
    disabled: ':is(:disabled, [aria-disabled="true"])',
});
/** The states each role may style. */
export const ROLE_STATES = Object.freeze({
    action: ["rest", "hover", "active", "selected", "invalid", "focus-visible", "disabled"],
    field: ["rest", "hover", "invalid", "focus-visible", "disabled"],
    card: ["rest", "hover", "selected", "focus-visible"],
    status: ["rest"],
    text: ["rest"],
});
/** The properties that take a colour, and so the `{ gap }` and `{ mix }` value forms. */
export const COLOUR_PROPERTIES = ["color", "background-color", "border-color", "outline-color"];
/** Every property a recipe may set. */
export const RECIPE_PROPERTIES = [
    ...COLOUR_PROPERTIES,
    "border-width", "border-style", "border-radius", "outline-width", "outline-style", "outline-offset",
    "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-decoration-line",
    "text-underline-offset", "min-height", "min-width", "padding-block", "padding-inline", "gap", "cursor", "opacity",
];
/** What a size may set: geometry and type size only, never colour or opacity. */
export const SIZE_PROPERTIES = [
    "min-height", "min-width", "padding-block", "padding-inline", "gap", "font-size", "line-height",
];
/** The private custom property carrying a gap-filled contract token's value inside a system's recipe scopes. */
export function gapProperty(system, token) {
    return `--atomicstrata-${system}-gap-${token}`;
}
