/**
 * The compiler's recipe step: optional, after the profile's own work.
 *
 * Given one recipe document, or a shipped one and a consumer's extending it,
 * it validates (and merges) them against the profile, measures every recipe
 * combination natively per compiled brand and mode (with the accessibility
 * overrides applied) and, when the theme appearance is compiled in, per
 * canonical theme and scheme, measures what each override changes in the
 * profile's own pairs, and only then writes the recipe layer block. The
 * profile's native ledger is never altered by an override: the brand's own
 * measurements and exceptions stay what they are.
 */
import type { GapValues } from "./emit.ts";
import { type ModeValues } from "./read-values.ts";
import { type OverrideMeasurement, type RecipeMeasurement } from "./recipe-contrast.ts";
import { type AccessibilityOverride, type RecipeProvenance, type RecipeRole } from "./recipe-types.ts";
import { type Appearance, type ColourMode, type DesignSystemProfile } from "./types.ts";
export interface RecipeInput {
    /** Document text: one document, or a shipped one followed by a consumer's that extends it. */
    documents: readonly string[];
    /** `["native"]`, or `["native", "theme"]` to apply the recipes inside adapted scopes too. */
    appearances: readonly Appearance[];
}
export interface RecipeManifest {
    documents: Array<{
        id: string;
        version: string;
        sha256: string;
        provenance: RecipeProvenance;
    }>;
    appearances: Appearance[];
    attributes: {
        recipe: string;
        variant: string;
        size: string;
    };
    roles: Partial<Record<RecipeRole, {
        variants: string[];
        sizes: string[];
    }>>;
}
export interface RecipeLedger {
    contrast: RecipeMeasurement[];
    /**
     * Each override with the pairs it changes when applied alone (`isolated`), and the final
     * outcome with every override applied together (`combined`). Both are checked for regressions.
     */
    overrides: {
        isolated: Array<AccessibilityOverride & {
            changed: OverrideMeasurement[];
        }>;
        combined: OverrideMeasurement[];
    };
}
/**
 * A canonical theme's resolved contract tokens in one scheme. With `os`, the
 * root is a theme-family state: it shows `scheme` on a system preferring `os`.
 */
export type ContractOf = (theme: string, scheme: ColourMode, os?: ColourMode) => ReadonlyMap<string, string>;
/** The canonical theme states measured: each theme's schemes, then the family states when asked for. */
export declare function adaptedStates(themeFamilies: boolean): Array<{
    theme: string;
    scheme: ColourMode;
    os?: ColourMode;
}>;
/** What the profile's compile already has: the verified brands, gap values, canonical contracts and a digest. */
export interface RecipeCompileContext {
    brands: Readonly<Record<string, ModeValues>>;
    gaps: GapValues;
    contractOf: ContractOf;
    digest: (text: string) => string;
    /** Also measure the theme-family states (`FAMILY_THEME_STATES`). */
    themeFamilies: boolean;
}
/** Validate, measure and write the recipes. Throws, naming the problem, before anything is returned. */
export declare function compileRecipes(profile: DesignSystemProfile, input: RecipeInput, context: RecipeCompileContext): {
    css: string;
    manifest: RecipeManifest;
    ledger: RecipeLedger;
};
