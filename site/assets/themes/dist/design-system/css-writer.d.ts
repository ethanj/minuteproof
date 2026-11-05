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
import { type ColourMode, type DesignSystemProfile, type ScopeValue } from "./types.ts";
/** One `property: value` pair of a rule. */
export type Declaration = readonly [string, string];
/** The attribute a registry component carries (`data-slot="button"`), which the component adapter keys on. */
export declare const SLOT_ATTRIBUTE = "data-slot";
/** A registry component's variant (`data-variant="ghost"`). */
export declare const VARIANT_ATTRIBUTE = "data-variant";
/** One rule: the selector, then each declaration on its own line, indented two spaces under `indent`. */
export declare function block(selector: string, declarations: readonly Declaration[], indent?: string): string;
/** A profile scope value as CSS: a reference becomes `var(--name)`, a literal is written as it is. */
export declare function scopeValue(value: ScopeValue): string;
/** Name-value pairs as custom-property declarations (`--name: value`). */
export declare function customDeclarations(entries: Iterable<readonly [string, string]>): Array<[string, string]>;
/** Every element carrying the system: `[data-design-system="<id>"]`. */
export declare function systemSelector(profile: DesignSystemProfile): string;
/** The document root bound to the system under the consumer's `product` id: where the bridge applies. */
export declare function productRootSelector(profile: DesignSystemProfile): string;
/**
 * A product palette preview in `mode` below a root bound to the system with
 * `brand`. The root may carry any theme: a preview shows the product
 * whatever is in force. The preview never carries the system's own
 * attributes, so no scope, region, adapted or recipe rule reaches it.
 */
export declare function productPreviewSelector(profile: DesignSystemProfile, brand: string, mode: ColourMode): string;
/**
 * An adapted scope element: the system under the theme appearance, on any
 * element except a `product` root, where the bridge runs the other way.
 */
export declare function adaptedSelector(profile: DesignSystemProfile): string;
