/**
 * The primitives the three validators share: the profile grammar
 * (`validate.ts`), its theme-appearance section (`adaptation.ts`) and the
 * recipe grammar (`recipe-validate.ts`).
 *
 * Each validator throws its own error kind, so a check is injected rather
 * than imported: `makeCheck(profileError)` and `makeCheck(recipeError)` are
 * the same assertion with different prefixes. What must not drift between
 * the three lives here once: the name patterns, the shape tests, the two
 * literal rules, pair identity and the bounds of a pinned measurement.
 *
 * Internal to the compiler; nothing here is a package export.
 */
import { type ContrastPair } from "./types.ts";
/** A parsed JSON object, before it is known to have any shape. */
export type Raw = Record<string, unknown>;
/** Throws the validator's own error, naming the problem, when `condition` is false. */
export type Check = (condition: boolean, message: string) => void;
/** A profile id or brand id: lowercase, at most 32 characters. */
export declare const PROFILE_SLUG: RegExp;
/** A slot, variant, recipe id or recipe variant/size name: lowercase words joined by single hyphens. */
export declare const KEBAB_SLUG: RegExp;
/** A custom-property name without its leading `--`. */
export declare const CUSTOM_PROPERTY_NAME: RegExp;
export declare const SEMVER: RegExp;
export declare const COMMIT: RegExp;
/** A GitHub `owner/name`. */
export declare const REPOSITORY: RegExp;
/** The assertion every validator uses, throwing `errorOf(message)`. */
export declare function makeCheck(errorOf: (message: string) => Error): Check;
/** A plain object: not null and not an array. */
export declare function isObject(value: unknown): value is Raw;
/** A non-empty string. */
export declare function isText(value: unknown): value is string;
/** A string matching `pattern`. */
export declare function isMatch(value: unknown, pattern: RegExp): value is string;
/** An object naming a GitHub repository and a full commit in it (it may carry other keys). */
export declare function namesPinnedCommit(value: unknown): value is Raw;
/** Refuse a misspelt key instead of ignoring it. */
export declare function onlyKeys(check: Check, value: Raw, allowed: readonly string[], where: string): void;
/** The message for a value that fails `isPlainLiteral`. */
export declare function plainLiteralMessage(where: string): string;
/**
 * A profile literal: a CSS value that cannot reference another name, end
 * its declaration or open a block, with no surrounding whitespace.
 */
export declare function isPlainLiteral(value: unknown): value is string;
/**
 * A recipe literal: a plain literal that also has no `!` and no `url(`.
 * Recipe values are ordinary properties written as zero-specificity rules
 * whose order is the whole precedence contract, so an `!important` would
 * break it; and a component treatment has no reason to load a resource.
 * Profile literals are custom-property and region values and keep the
 * narrower plain rule.
 */
export declare function isRecipeLiteral(value: unknown): value is string;
/** Whether two pairs measure the same thing: the same ink, background, underlay and kind. */
export declare function samePair(first: ContrastPair, second: ContrastPair): boolean;
/** A contrast ratio, measured or required: a number of at least 1. */
export declare function isContrastRatio(value: unknown): value is number;
/** An exception's allowance around its pinned ratio: from 0 to `MAX_TOLERANCE`. */
export declare function isTolerance(value: unknown): value is number;
/** The pinned ratio, tolerance and reason of a profile or adaptation exception, each with its own message. */
export declare function checkPinnedMeasurement(check: Check, raw: Raw, label: string): void;
