/**
 * Writing recipes into the compiled stylesheet.
 *
 * Everything goes into the existing late layer (`BRIDGE_LAYER`): after the
 * package, so the package's own `:focus-visible` outline does not win over
 * a recipe's, and before a framework's components and utilities, so a
 * product's own styles still do. The consumer's layer order is unchanged.
 *
 * - **Scopes.** Recipes apply inside native scopes: a bound product root and
 *   every native region (`[system]:not(:root)` without the theme appearance).
 *   With `theme` in the compiled appearances they also apply inside adapted
 *   scopes, where the vocabulary already comes from the theme in force. A
 *   root under a canonical id is never a native scope, so compiling for
 *   `native` alone leaves every canonical theme untouched. Each scope stops
 *   at the next element carrying any design system.
 * - **Order.** Every recipe selector is wrapped in `:where()`, so all have
 *   zero specificity and source order alone decides: per role, rest (base,
 *   variants, sizes), then each state of `STATE_ORDER` (base, then
 *   variants). The contrast evaluator replays exactly this order.
 * - **Gap values** are private properties set on the scope elements: the
 *   profile's gap fill per mode in native scopes, the contract token in
 *   adapted ones. Accessibility overrides are set on native brand scopes,
 *   only while that mode is in force.
 * - **Forced colours.** A selected control, whose state is otherwise a fill
 *   the browser replaces, is outlined with `Highlight`.
 *
 * Selectors are built only from validated slugs.
 */
import { type GapValues } from "./emit.ts";
import { type RecipeDocument } from "./recipe-types.ts";
import { type Appearance, type DesignSystemProfile } from "./types.ts";
/** What the recipe layer is written for: the compiled appearances, the profile's gap values, the compiled brands. */
export interface RecipeTargets {
    /** Always holds `native`; `theme` also applies the recipes inside adapted scopes. */
    appearances: readonly Appearance[];
    gaps: GapValues;
    /** Overrides are written for these brands only. */
    compiled: readonly string[];
}
/** The recipes' layer block, for the given appearances and compiled brands. */
export declare function emitRecipes(profile: DesignSystemProfile, recipes: RecipeDocument, targets: RecipeTargets): string;
