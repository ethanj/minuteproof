/**
 * The one-level merge of a consumer's recipe document onto the shipped one
 * it extends.
 *
 * Roles merge down to single declarations: role, then its base, variants,
 * sizes or adapted shape, then state, then property, with whole values
 * replacing whole values. The merge is driven by the grammar's depth, never
 * by key names, so a CSS property called `gap` is merged as a property, not
 * mistaken for a `{ gap }` value. Accessibility overrides and exceptions are
 * appended, shipped first, and every other header key is the consumer's.
 *
 * This file only combines; `mergeRecipes` in `recipe-validate.ts` checks
 * both headers before calling it and validates the merged document after.
 */
import { type Raw } from "./grammar.ts";
/**
 * `own` on top of `shipped`, both with checked headers. The result is not yet
 * validated. Overrides are spread before validation, so a non-iterable
 * `overrides` throws the engine's TypeError here rather than the grammar's
 * message (recorded as debt; the expression is kept as it was so the thrown
 * text is unchanged).
 */
export declare function mergeRecipeDocuments(shipped: Raw, own: Raw): Raw;
