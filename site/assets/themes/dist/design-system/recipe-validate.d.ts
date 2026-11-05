/**
 * The recipe grammar, as one validator, plus the merge of a consumer's
 * document onto the shipped one it extends.
 *
 * The accepted shape, stated positively:
 *
 * - The header pins exactly the compiled profile (`system` is its id,
 *   `profileVersion` its version) and states provenance: who authored the
 *   treatment, from what, and a qualified conformance statement.
 * - `roles` names roles from `RECIPE_ROLES`, each checked by `checkRole`
 *   (`recipe-roles.ts`, which states the role grammar).
 * - `accessibility.overrides` replace a vocabulary colour per mode and brand,
 *   with a reason and a source; `exceptions` pin measured shortfalls.
 *
 * `mergeRecipes` checks both headers, combines the documents
 * (`recipe-merge.ts`) and validates the result as a whole.
 *
 * Ordinary configuration validation for trusted authors: it rejects mistakes
 * by name and does not try to be a hostile-input sandbox.
 */
import { type RecipeDocument } from "./recipe-types.ts";
import { type DesignSystemProfile } from "./types.ts";
export { recipeError } from "./recipe-roles.ts";
/**
 * Check a complete (merged) document against the profile and return it
 * typed. Throws on the first problem, naming it.
 */
export declare function validateRecipes(value: unknown, profile: DesignSystemProfile): RecipeDocument;
/**
 * A consumer's document on top of the shipped one it extends
 * (`recipe-merge.ts`): both headers are checked first and must pin the same
 * profile, and the merged document is validated as a whole.
 */
export declare function mergeRecipes(base: unknown, extension: unknown, profile: DesignSystemProfile): RecipeDocument;
