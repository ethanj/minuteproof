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
import { parseColour } from "../checks/colour.js";
import { isThemeState } from "./adaptation.js";
import { isContrastRatio, isMatch, isObject, isText, isTolerance, KEBAB_SLUG as SLUG, namesPinnedCommit, SEMVER, } from "./grammar.js";
import { mergeRecipeDocuments } from "./recipe-merge.js";
import { check, checkRole, hasOwn, onlyRecipeKeys } from "./recipe-roles.js";
import { RECIPES_SCHEMA, ROLE_STATES } from "./recipe-types.js";
import { MAX_TOLERANCE } from "./types.js";
export { recipeError } from "./recipe-roles.js";
const HEADER = ["schema", "id", "version", "label", "system", "profileVersion", "provenance", "roles"];
const OPTIONAL = ["extends", "accessibility", "exceptions"];
const EXCEPTION_KEYS = [
    "role", "variant", "states", "pair", "brand", "mode", "theme", "scheme", "os", "ratio", "tolerance", "reason",
];
function checkProvenance(value) {
    check(isObject(value), "provenance must be an object");
    const raw = value;
    onlyRecipeKeys(raw, ["authoredBy", "basis", "sources", "conformance"], "provenance");
    const isAuthor = raw.authoredBy === "package" || raw.authoredBy === "consumer";
    check(isAuthor, 'provenance.authoredBy must be "package" or "consumer"');
    check(isText(raw.basis) && isText(raw.conformance), "provenance needs a basis and a conformance statement");
    check(Array.isArray(raw.sources), "provenance.sources must be a list");
    for (const source of raw.sources) {
        const isPinnedSource = namesPinnedCommit(source) && Object.keys(source).length === 2;
        check(isPinnedSource, "each provenance source is { repository, commit }");
    }
}
/** The header of one document, before any merge: it must pin exactly this profile. */
function checkRecipeHeader(value, profile) {
    check(isObject(value), "expected a recipes object");
    const raw = value;
    onlyRecipeKeys(raw, [...HEADER, ...OPTIONAL], "recipes");
    for (const key of HEADER)
        check(key in raw, `recipes is missing "${key}"`);
    check(raw.schema === RECIPES_SCHEMA, `schema must be "${RECIPES_SCHEMA}"`);
    check(isMatch(raw.id, SLUG) && isMatch(raw.version, SEMVER), "id must be a slug and version major.minor.patch");
    check(isText(raw.label), "label must be a non-empty string");
    check(raw.system === profile.id, `recipes are for system "${String(raw.system)}", not "${profile.id}"`);
    check(raw.profileVersion === profile.version, `recipes pin profile version ${String(raw.profileVersion)}, but ${profile.id} is ${profile.version}`);
    if (raw.extends !== undefined)
        check(isMatch(raw.extends, SLUG), "extends must name a shipped recipe");
    checkProvenance(raw.provenance);
    check(isObject(raw.roles), "roles must be an object");
    return raw;
}
function checkOverride(value, profile, seen) {
    check(isObject(value), "each accessibility override must be an object");
    const raw = value;
    onlyRecipeKeys(raw, ["name", "brands", "mode", "value", "reason", "source"], "accessibility override");
    check(profile.vocabulary.includes(raw.name), `accessibility override names --${String(raw.name)}, which is not vocabulary`);
    check(raw.mode === "light" || raw.mode === "dark", 'accessibility override mode must be "light" or "dark"');
    const areProfileBrands = Array.isArray(raw.brands) && raw.brands.length > 0
        && raw.brands.every((brand) => hasOwn(profile.brands, brand));
    check(areProfileBrands, "accessibility override brands must be profile brands");
    const isMeasurable = typeof raw.value === "string" && parseColour(raw.value) !== null;
    check(isMeasurable, `accessibility override --${String(raw.name)} value must be a measurable colour`);
    check(isText(raw.reason) && isText(raw.source), "accessibility override needs a reason and a source");
    for (const brand of raw.brands) {
        const key = `${String(raw.name)} ${brand} ${String(raw.mode)}`;
        check(!seen.has(key), `accessibility override for --${key} is given twice`);
        seen.add(key);
    }
}
/** A brand of the profile and a mode, and no theme. */
function nativeContext(raw, profile) {
    const isBrand = raw.brand !== undefined && hasOwn(profile.brands, raw.brand);
    const isMode = raw.mode === "light" || raw.mode === "dark";
    return isBrand && isMode && raw.theme === undefined && raw.scheme === undefined && raw.os === undefined;
}
/** A canonical theme and a scheme it is seen in, or a theme-family state with `os`, and no brand. */
function themedContext(raw) {
    return raw.brand === undefined && raw.mode === undefined && isThemeState(raw.theme, raw.scheme, raw.os);
}
/** A state an exception may pin: one the role has, other than rest and disabled (which are never judged). */
function isPinnableState(role, state) {
    return ROLE_STATES[role].includes(state) && state !== "rest" && state !== "disabled";
}
/** What an exception pins: a role held to contrast, one of its variants or none, a set of its states, and a pair. */
function checkExceptionTarget(raw, document) {
    var _a;
    const role = document.roles[raw.role];
    check(role !== undefined && role.contrast === "text", "recipe exception must name a role held to contrast");
    const isVariant = raw.variant === null || hasOwn((_a = role.variants) !== null && _a !== void 0 ? _a : {}, raw.variant);
    check(isVariant, "recipe exception variant must be null or one of the role's variants");
    const arePinnable = Array.isArray(raw.states)
        && raw.states.every((state) => isPinnableState(raw.role, state));
    check(arePinnable, "recipe exception states must be the role's non-rest, non-disabled states");
    const states = raw.states;
    check(new Set(states).size === states.length, "recipe exception states must not repeat a state");
    const isPair = raw.pair === "text" || raw.pair === "focus" || raw.pair === "boundary";
    check(isPair, 'recipe exception pair must be "text", "focus" or "boundary"');
}
function checkException(value, document, profile) {
    check(isObject(value), "each recipe exception must be an object");
    const raw = value;
    onlyRecipeKeys(raw, EXCEPTION_KEYS, "recipe exception");
    checkExceptionTarget(raw, document);
    check(nativeContext(raw, profile) || themedContext(raw), "recipe exception names a brand and mode, a canonical theme and a scheme it is seen in, or a theme-family state");
    check(isContrastRatio(raw.ratio) && isTolerance(raw.tolerance), `recipe exception needs its measured ratio and a tolerance of at most ${MAX_TOLERANCE}`);
    check(isText(raw.reason), "recipe exception needs a reason");
}
/** `{ overrides: [...] }` and nothing else. */
function isAccessibilitySection(value) {
    return isObject(value) && Array.isArray(value.overrides) && Object.keys(value).length === 1;
}
/**
 * Check a complete (merged) document against the profile and return it
 * typed. Throws on the first problem, naming it.
 */
export function validateRecipes(value, profile) {
    const raw = checkRecipeHeader(value, profile);
    for (const [role, recipe] of Object.entries(raw.roles))
        checkRole(role, recipe, profile);
    const document = value;
    if (raw.accessibility !== undefined) {
        check(isAccessibilitySection(raw.accessibility), "accessibility must be { overrides: [...] }");
        const seen = new Set();
        for (const override of raw.accessibility.overrides)
            checkOverride(override, profile, seen);
    }
    if (raw.exceptions !== undefined) {
        check(Array.isArray(raw.exceptions), "exceptions must be a list");
        for (const exception of raw.exceptions)
            checkException(exception, document, profile);
    }
    return document;
}
/**
 * A consumer's document on top of the shipped one it extends
 * (`recipe-merge.ts`): both headers are checked first and must pin the same
 * profile, and the merged document is validated as a whole.
 */
export function mergeRecipes(base, extension, profile) {
    const shipped = checkRecipeHeader(base, profile);
    const own = checkRecipeHeader(extension, profile);
    check(shipped.extends === undefined, "a shipped recipe extends nothing");
    check(own.extends === shipped.id, `recipes extend "${String(own.extends)}", but the base is "${String(shipped.id)}"`);
    return validateRecipes(mergeRecipeDocuments(shipped, own), profile);
}
