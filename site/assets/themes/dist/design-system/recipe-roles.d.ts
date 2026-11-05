/**
 * The recipe grammar's roles: what one role in a recipe document may say,
 * and the error every recipe problem throws.
 *
 * A role (`RECIPE_ROLES`) has `base` state declarations, and optionally
 * `variants` (slug to state declarations), `sizes` (slug to declarations
 * from `SIZE_PROPERTIES`), a `surface` vocabulary colour, `contrast: "text"`,
 * and an `adapted` shape (contract radius and shadow tokens, as in the
 * component adapter). State keys come from the role's row of `ROLE_STATES`;
 * property keys from `RECIPE_PROPERTIES`, with `opacity` only while disabled,
 * and a focus state that never removes its outline (so forced colours still
 * show it). Values reference the profile's vocabulary or constants (never a
 * contract token), a gap-filled contract token, an sRGB mix of two declared
 * names, or a recipe literal. A field's border is its boundary.
 *
 * The document around the roles (header, overrides, exceptions) is checked
 * in `recipe-validate.ts`, which calls `checkRole` for each role.
 */
import { type Raw } from "./grammar.ts";
import type { DesignSystemProfile } from "./types.ts";
/** The error every recipe problem throws: the package prefix, then the problem. */
export declare function recipeError(message: string): Error;
/** The recipe grammar's assertion, throwing `recipeError`. */
export declare const check: import("./grammar.ts").Check;
/** `onlyKeys` (`grammar.ts`) with the recipe grammar's assertion. */
export declare const onlyRecipeKeys: (value: Raw, allowed: readonly string[], where: string) => void;
/** Whether `object` has `key` itself, never through its prototype (`constructor`). */
export declare const hasOwn: (object: object, key: unknown) => boolean;
/** One role entry of a document, checked completely against the profile. */
export declare function checkRole(role: string, value: unknown, profile: DesignSystemProfile): void;
