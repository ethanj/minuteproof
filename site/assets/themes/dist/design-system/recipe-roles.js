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
import { checkShape } from "./adaptation.js";
import { isMatch, isObject, isRecipeLiteral, KEBAB_SLUG as SLUG, makeCheck, onlyKeys as onlyKeysWith, } from "./grammar.js";
import { COLOUR_PROPERTIES, RECIPE_PROPERTIES, RECIPE_ROLES, ROLE_STATES, SIZE_PROPERTIES, } from "./recipe-types.js";
const ROLE_KEYS = ["surface", "contrast", "base", "variants", "sizes", "adapted"];
const COLOURS = COLOUR_PROPERTIES;
/** The focus outline's properties: set only while focused, never removing the outline, never inset. */
const OUTLINE = RECIPE_PROPERTIES.filter((property) => property.startsWith("outline-"));
/** What a role's base focus state must draw in full, so no variant can leave the outline half drawn. */
const FOCUS_OUTLINE = ["outline-color", "outline-style", "outline-width"];
const OUTLINE_STYLES = ["solid", "dashed", "dotted", "double"];
const POSITIVE_PX = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)px$/;
const NONNEGATIVE_PX = /^\d+(?:\.\d+)?px$/;
/** An opacity above 0 and at most 1, as a plain decimal (`.5`, `0.25`, `1`, `1.0`). */
const OPACITY = /^(0?\.\d*[1-9]\d*|1(\.0+)?)$/;
/** The error every recipe problem throws: the package prefix, then the problem. */
export function recipeError(message) {
    return new Error("@atomicstrata/themes: invalid design-system recipes: " + message);
}
/** The recipe grammar's assertion, throwing `recipeError`. */
export const check = makeCheck(recipeError);
/** `onlyKeys` (`grammar.ts`) with the recipe grammar's assertion. */
export const onlyRecipeKeys = (value, allowed, where) => onlyKeysWith(check, value, allowed, where);
/** Whether `object` has `key` itself, never through its prototype (`constructor`). */
export const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function declared(profile) {
    return [...profile.vocabulary, ...Object.keys(profile.constants)];
}
/** A recipe literal is stricter than a profile's; `isRecipeLiteral` says why. */
function checkLiteral(value, where) {
    check(isRecipeLiteral(value), `${where} must be a plain CSS value without var(), url(), "!", ";" or braces`);
}
function checkColourForm(raw, profile, where) {
    if ("gap" in raw) {
        onlyRecipeKeys(raw, ["gap"], where);
        const bridged = profile.bridge[raw.gap];
        const isGapToken = typeof raw.gap === "string" && bridged !== undefined && "gap" in bridged;
        check(isGapToken, `${where} gap must name a contract token the profile fills from a gap`);
        return;
    }
    onlyRecipeKeys(raw, ["mix"], where);
    const mix = raw.mix;
    // Three keys, two of them declared names; a third key other than `percent` fails on the percent below.
    const isDeclaredMix = isObject(mix) && Object.keys(mix).length === 3
        && declared(profile).includes(mix.ref) && declared(profile).includes(mix.over);
    check(isDeclaredMix, `${where} mix must be { ref, over, percent } over declared names`);
    const isPercent = Number.isInteger(mix.percent) && mix.percent > 0 && mix.percent < 100;
    check(isPercent, `${where} mix percent must be an integer from 1 to 99`);
}
function checkValue(property, value, profile, where) {
    const colourForms = COLOURS.includes(property) ? ", { gap } or { mix }" : "";
    check(isObject(value), `${where} must be { ref }, { literal }${colourForms}`);
    const raw = value;
    if ("ref" in raw) {
        onlyRecipeKeys(raw, ["ref"], where);
        const isDeclared = typeof raw.ref === "string" && declared(profile).includes(raw.ref);
        return check(isDeclared, `${where} refers to --${String(raw.ref)}, which the profile does not declare (contract tokens are not allowed)`);
    }
    if ("literal" in raw) {
        onlyRecipeKeys(raw, ["literal"], where);
        return checkLiteral(raw.literal, where);
    }
    check(COLOURS.includes(property), `${where} must be { ref } or { literal }`);
    checkColourForm(raw, profile, where);
}
function checkDeclarations(value, allowed, profile, where) {
    check(isObject(value), `${where} must be an object of property to value`);
    for (const [property, declaredValue] of Object.entries(value)) {
        check(allowed.includes(property), `${where} may not set "${property}"`);
        checkValue(property, declaredValue, profile, `${where} ${property}`);
    }
}
/** The outline a focus state draws: a visible style, a positive width and an offset outside the border box. */
function checkFocusOutline(value, where) {
    const literal = (property) => {
        const entry = value[property];
        if (entry === undefined)
            return undefined;
        check(typeof entry.literal === "string", `${where} ${property} must be a literal`);
        return entry.literal;
    };
    const style = literal("outline-style");
    const width = literal("outline-width");
    const offset = literal("outline-offset");
    if (style !== undefined) {
        check(OUTLINE_STYLES.includes(style), `${where} outline-style must be one of ${OUTLINE_STYLES.join(", ")}`);
    }
    if (width !== undefined)
        check(POSITIVE_PX.test(width), `${where} outline-width must be a positive px length`);
    if (offset !== undefined) {
        check(NONNEGATIVE_PX.test(offset), `${where} outline-offset must be a non-negative px length, so the outline sits on the surface`);
    }
}
/** Opacity only while disabled, and the outline only while focused. */
function allowedInState(property, state) {
    const isOpacityAllowed = property !== "opacity" || state === "disabled";
    const isOutlineAllowed = !OUTLINE.includes(property) || state === "focus-visible";
    return isOpacityAllowed && isOutlineAllowed;
}
function checkStates(value, role, profile, where) {
    var _a;
    check(isObject(value), `${where} must be an object of state to declarations`);
    for (const [state, declarations] of Object.entries(value)) {
        check(ROLE_STATES[role].includes(state), `${where}: ${role} has no state "${state}"; it has ${ROLE_STATES[role].join(", ")}`);
        const allowed = RECIPE_PROPERTIES.filter((property) => allowedInState(property, state));
        checkDeclarations(declarations, allowed, profile, `${where} ${state}`);
        if (state === "focus-visible")
            checkFocusOutline(declarations, `${where} ${state}`);
        const opacity = (_a = declarations.opacity) === null || _a === void 0 ? void 0 : _a.literal;
        if (opacity === undefined)
            continue;
        check(isMatch(opacity, OPACITY), `${where} opacity must be a number above 0 and at most 1`);
    }
}
/** A role that styles focus states its whole outline in its base focus state, so no variant can leave it half drawn. */
function checkFocusComplete(raw, where) {
    var _a, _b;
    const stateMaps = [raw.base, ...Object.values((_a = raw.variants) !== null && _a !== void 0 ? _a : {})];
    const isFocusStyled = stateMaps.some((states) => isObject(states) && "focus-visible" in states);
    if (!isFocusStyled)
        return;
    const base = ((_b = raw.base["focus-visible"]) !== null && _b !== void 0 ? _b : {});
    check(FOCUS_OUTLINE.every((property) => property in base), `${where} base focus-visible must set outline-color, outline-style and outline-width`);
}
/**
 * A field's edge is its boundary: a positive solid border set at rest on the
 * base, which no state or variant may change but in colour.
 */
function checkFieldBoundary(raw, where) {
    var _a, _b;
    var _c, _d, _e;
    const rest = ((_c = raw.base.rest) !== null && _c !== void 0 ? _c : {});
    const hasSolidBoundary = POSITIVE_PX.test((_d = (_a = rest["border-width"]) === null || _a === void 0 ? void 0 : _a.literal) !== null && _d !== void 0 ? _d : "")
        && ((_b = rest["border-style"]) === null || _b === void 0 ? void 0 : _b.literal) === "solid" && rest["border-color"] !== undefined;
    check(hasSolidBoundary, `${where} base rest must set a positive px border-width, border-style solid and a border-color: `
        + "a field's edge is its boundary");
    const stateMaps = [raw.base, ...Object.values((_e = raw.variants) !== null && _e !== void 0 ? _e : {})];
    for (const [state, declarations] of stateMaps.flatMap((states) => Object.entries(states))) {
        if (declarations === rest)
            continue;
        const keepsBorderShape = !("border-width" in declarations) && !("border-style" in declarations);
        check(keepsBorderShape, `${where} ${state} may change only the border's colour`);
    }
}
function checkNamed(value, where, each) {
    if (value === undefined)
        return;
    check(isObject(value) && Object.keys(value).length > 0, `${where} must name at least one entry`);
    for (const [name, entry] of Object.entries(value)) {
        check(SLUG.test(name), `${where} "${name}" must match ${SLUG}`);
        each(name, entry);
    }
}
function checkAdaptedShape(value, where) {
    check(isObject(value) && Object.keys(value).length > 0, `${where} must set a radius or shadows`);
    const raw = value;
    onlyRecipeKeys(raw, ["radius", "maxRadius", "shadow", "hoverShadow", "activeShadow"], where);
    checkShape(check, raw, where);
}
/** `{ ref }` naming one vocabulary colour and nothing else. */
function isVocabularySurface(value, profile) {
    return isObject(value) && Object.keys(value).length === 1 && profile.vocabulary.includes(value.ref);
}
/** One role entry of a document, checked completely against the profile. */
export function checkRole(role, value, profile) {
    const where = `role ${role}`;
    check(RECIPE_ROLES.includes(role), `"${role}" is not a recipe role; the roles are ${RECIPE_ROLES.join(", ")}`);
    check(isObject(value), `${where} must be an object`);
    const raw = value;
    onlyRecipeKeys(raw, ROLE_KEYS, where);
    check("base" in raw, `${where} needs base`);
    if (raw.surface !== undefined) {
        check(isVocabularySurface(raw.surface, profile), `${where} surface must be { ref: <vocabulary colour> }`);
    }
    if (raw.contrast !== undefined)
        check(raw.contrast === "text", `${where} contrast must be "text"`);
    checkStates(raw.base, role, profile, `${where} base`);
    checkNamed(raw.variants, `${where} variant`, (name, entry) => checkStates(entry, role, profile, `${where} variant ${name}`));
    checkNamed(raw.sizes, `${where} size`, (name, entry) => checkDeclarations(entry, SIZE_PROPERTIES, profile, `${where} size ${name}`));
    if (raw.adapted !== undefined)
        checkAdaptedShape(raw.adapted, `${where} adapted`);
    checkFocusComplete(raw, where);
    if (role === "field")
        checkFieldBoundary(raw, where);
}
