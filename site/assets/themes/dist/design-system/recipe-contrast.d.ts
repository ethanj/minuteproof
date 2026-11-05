/**
 * Recipe contrast, judged at compile time against what the emitted CSS paints.
 *
 * For every role held to `contrast: "text"`, every variant (or the base
 * alone) and every reachable combination of its states, the declarations are
 * cascaded in exactly the emitted order (`STATE_ORDER`, base before variant
 * within a state, zero specificity throughout). The unqualified base is
 * measured as well as each variant. Disabled combinations are not judged
 * (WCAG exempts inactive controls); `active` is measured with and without
 * `hover`, since a keyboard press is active and not hovered. Then:
 *
 * - **text:** the label colour (the scope ink when the recipe sets none),
 *   composited over the background, which is composited over the role's
 *   surface, against that background, at the text floor;
 * - **focus:** a focus outline's colour composited over the surface, against
 *   the surface, at the non-text floor (offsets are non-negative, so the
 *   outline sits on the surface);
 * - **boundary** (fields only): the border as painted (over the field's own
 *   composited fill, since backgrounds reach under the border) against both
 *   the surface outside it and that fill inside it, the lower of the two, at
 *   the non-text floor. Other roles' borders are decorative and are
 *   not judged.
 *
 * Natively this runs per compiled brand and mode, with the accessibility
 * overrides applied; under the theme appearance, per canonical theme and
 * scheme with the adapted vocabulary. A shortfall fails the compile unless
 * an exception pins that exact combination, and an exception that no longer
 * matches a shortfall fails too. The same file judges overrides: every profile pair they change
 * is re-measured, and any regression fails.
 */
import { type RecipeDeclarations, type RecipeDocument, type RecipePair, type RecipeRole, type RecipeState, type RoleRecipe } from "./recipe-types.ts";
import type { ColourMode, ContrastPair, DesignSystemProfile } from "./types.ts";
/** Where a measurement was taken: natively in a brand and mode, or adapted in a canonical theme and scheme. */
export type RecipeContext = {
    brand: string;
    mode: ColourMode;
} | {
    theme: string;
    scheme: ColourMode;
    os?: ColourMode;
};
/** One recipe combination's ratio for one pair in one context, as the ledger records it. */
export type RecipeMeasurement = RecipeContext & {
    role: RecipeRole;
    variant: string | null;
    states: RecipeState[];
    pair: RecipePair;
    ratio: number;
    status: "pass" | "exception";
};
/** A profile pair an accessibility override changed in one brand and mode: its ratio before and after. */
export interface OverrideMeasurement extends ContrastPair {
    brand: string;
    mode: ColourMode;
    before: number;
    after: number;
}
/** What a context resolves names to. */
export interface RecipeValues {
    names: ReadonlyMap<string, string>;
    gap(token: string): string | undefined;
}
/** Every set of a role's non-rest states without `disabled`. */
export declare function stateSets(role: RecipeRole): RecipeState[][];
/** The declarations in force for one variant and state set, in emitted order. */
export declare function cascaded(recipe: RoleRecipe, variant: string | null, states: readonly RecipeState[]): RecipeDeclarations;
/** A context and what names resolve to in it. */
export interface MeasuredContext {
    context: RecipeContext;
    values: RecipeValues;
}
/**
 * Every role held to contrast, in every given context. Throws on an
 * unpinned shortfall or an exception that matched nothing.
 */
export declare function measureRecipes(profile: DesignSystemProfile, recipes: RecipeDocument, contexts: readonly MeasuredContext[]): RecipeMeasurement[];
/** One brand and mode's resolved names before and after the overrides. */
export interface OverrideScene {
    brand: string;
    mode: ColourMode;
    before: ReadonlyMap<string, string>;
    after: ReadonlyMap<string, string>;
}
/**
 * The profile's pairs in one brand and mode before and after the overrides,
 * kept where an override changed the ratio. A pair that met its floor must
 * still meet it, and one below its floor must not get lower.
 */
export declare function measureOverrides(profile: DesignSystemProfile, scene: OverrideScene): OverrideMeasurement[];
