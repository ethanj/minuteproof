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
import { MAX_TOLERANCE } from "./types.js";
/** A profile id or brand id: lowercase, at most 32 characters. */
export const PROFILE_SLUG = /^[a-z][a-z0-9-]{0,31}$/;
/** A slot, variant, recipe id or recipe variant/size name: lowercase words joined by single hyphens. */
export const KEBAB_SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** A custom-property name without its leading `--`. */
export const CUSTOM_PROPERTY_NAME = /^[a-z][a-z0-9-]*$/;
export const SEMVER = /^\d+\.\d+\.\d+$/;
export const COMMIT = /^[0-9a-f]{40}$/;
/** A GitHub `owner/name`. */
export const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
/** The assertion every validator uses, throwing `errorOf(message)`. */
export function makeCheck(errorOf) {
    return (condition, message) => {
        if (!condition)
            throw errorOf(message);
    };
}
/** A plain object: not null and not an array. */
export function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** A non-empty string. */
export function isText(value) {
    return typeof value === "string" && value.length > 0;
}
/** A string matching `pattern`. */
export function isMatch(value, pattern) {
    return typeof value === "string" && pattern.test(value);
}
/** An object naming a GitHub repository and a full commit in it (it may carry other keys). */
export function namesPinnedCommit(value) {
    return isObject(value) && isMatch(value.repository, REPOSITORY) && isMatch(value.commit, COMMIT);
}
/** Refuse a misspelt key instead of ignoring it. */
export function onlyKeys(check, value, allowed, where) {
    for (const key of Object.keys(value))
        check(allowed.includes(key), `${where} has unknown key "${key}"`);
}
/** The message for a value that fails `isPlainLiteral`. */
export function plainLiteralMessage(where) {
    return `${where} must be a plain CSS value without var(), ";" or braces`;
}
/**
 * A profile literal: a CSS value that cannot reference another name, end
 * its declaration or open a block, with no surrounding whitespace.
 */
export function isPlainLiteral(value) {
    return isText(value) && !/var\(|[;{}]/.test(value) && value.trim() === value;
}
/**
 * A recipe literal: a plain literal that also has no `!` and no `url(`.
 * Recipe values are ordinary properties written as zero-specificity rules
 * whose order is the whole precedence contract, so an `!important` would
 * break it; and a component treatment has no reason to load a resource.
 * Profile literals are custom-property and region values and keep the
 * narrower plain rule.
 */
export function isRecipeLiteral(value) {
    return isText(value) && value.trim() === value && !/var\(|url\(|[;{}!]/i.test(value);
}
/** Whether two pairs measure the same thing: the same ink, background, underlay and kind. */
export function samePair(first, second) {
    return first.fg === second.fg && first.bg === second.bg && first.over === second.over && first.kind === second.kind;
}
/** A contrast ratio, measured or required: a number of at least 1. */
export function isContrastRatio(value) {
    return typeof value === "number" && value >= 1;
}
/** An exception's allowance around its pinned ratio: from 0 to `MAX_TOLERANCE`. */
export function isTolerance(value) {
    return typeof value === "number" && value >= 0 && value <= MAX_TOLERANCE;
}
/** The pinned ratio, tolerance and reason of a profile or adaptation exception, each with its own message. */
export function checkPinnedMeasurement(check, raw, label) {
    check(isContrastRatio(raw.ratio), `${label} ratio must be a measured ratio`);
    check(isTolerance(raw.tolerance), `${label} tolerance must be between 0 and ${MAX_TOLERANCE}`);
    check(isText(raw.reason), `${label} needs a reason`);
}
