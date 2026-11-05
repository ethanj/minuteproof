/**
 * The CSS-writing pieces the three emitters share: the scope layer
 * (`emit.ts`), the theme appearance (`emit-adapted.ts`) and recipes
 * (`recipe-emit.ts`).
 *
 * Two kinds of thing live here. The formatting of one rule (`block`), so
 * every generated rule is laid out the same way. And the selectors that must
 * be identical across emitters: the system selector, the bound product root,
 * and the adapted scope element. The recipe layer's scopes are defined to
 * coincide with the adapted scopes of the theme appearance, so those two
 * selectors are built by one function rather than kept equal by hand.
 *
 * Selectors are built only from validated slugs. Internal to the compiler;
 * nothing here is a package export.
 */
import { PRODUCT_THEME_ID, THEME_PREVIEW_ATTRIBUTE } from "../registry.js";
import { DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, THEME_APPEARANCE, } from "./types.js";
/** The attribute a registry component carries (`data-slot="button"`), which the component adapter keys on. */
export const SLOT_ATTRIBUTE = "data-slot";
/** A registry component's variant (`data-variant="ghost"`). */
export const VARIANT_ATTRIBUTE = "data-variant";
/** One rule: the selector, then each declaration on its own line, indented two spaces under `indent`. */
export function block(selector, declarations, indent = "  ") {
    const body = declarations.map(([name, value]) => `${indent}  ${name}: ${value};`).join("\n");
    return `${indent}${selector} {\n${body}\n${indent}}`;
}
/** A profile scope value as CSS: a reference becomes `var(--name)`, a literal is written as it is. */
export function scopeValue(value) {
    return "ref" in value ? `var(--${value.ref})` : value.literal;
}
/** Name-value pairs as custom-property declarations (`--name: value`). */
export function customDeclarations(entries) {
    return Array.from(entries, ([name, value]) => [`--${name}`, value]);
}
/** Every element carrying the system: `[data-design-system="<id>"]`. */
export function systemSelector(profile) {
    return `[${DESIGN_SYSTEM_ATTRIBUTE}="${profile.id}"]`;
}
/** The document root bound to the system under the consumer's `product` id: where the bridge applies. */
export function productRootSelector(profile) {
    return `:root[data-theme="${PRODUCT_THEME_ID}"]${systemSelector(profile)}`;
}
/**
 * A product palette preview in `mode` below a root bound to the system with
 * `brand`. The root may carry any theme: a preview shows the product
 * whatever is in force. The preview never carries the system's own
 * attributes, so no scope, region, adapted or recipe rule reaches it.
 */
export function productPreviewSelector(profile, brand, mode) {
    const root = `:root${systemSelector(profile)}[${DESIGN_BRAND_ATTRIBUTE}="${brand}"]`;
    return `${root} [${THEME_PREVIEW_ATTRIBUTE}][data-theme="${PRODUCT_THEME_ID}"][data-theme-scheme="${mode}"]`;
}
/**
 * An adapted scope element: the system under the theme appearance, on any
 * element except a `product` root, where the bridge runs the other way.
 */
export function adaptedSelector(profile) {
    const appearance = `[${DESIGN_APPEARANCE_ATTRIBUTE}="${THEME_APPEARANCE}"]`;
    return `${systemSelector(profile)}${appearance}:not(:root[data-theme="${PRODUCT_THEME_ID}"])`;
}
