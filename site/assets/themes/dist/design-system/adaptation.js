/**
 * The theme appearance's grammar: one validator for a profile's optional
 * `adaptation` section, plus the fixed facts the compiler needs about it.
 *
 * The accepted shape, stated positively:
 *
 * - `values` maps exactly the vocabulary and every constant that is not a
 *   contract token. Each is `{ ref: <contract token> }` or `{ literal }`.
 *   A reference never names vocabulary or a constant, so the adaptation reads
 *   only the contract and the direction is one way (contract to vocabulary,
 *   the reverse of the bridge). Constants that are contract tokens
 *   (`overridesContract`) are not listed: under the theme appearance they are
 *   released to the theme with `inherit`, never defined from themselves.
 * - `properties` names custom properties the components consume that are
 *   neither vocabulary, constants, contract tokens nor the package's own
 *   private names, with the same value forms.
 * - `slots` names `data-slot` values: the explicit component adapter for
 *   what a system's components hardcode instead of reading a variable. Each
 *   sets a radius (a contract radius token, optionally capped in px),
 *   contract shadows at rest, on hover and while pressed, and `properties`:
 *   framework custom properties the component's own utilities pin (a fixed
 *   animation duration), emitted `!important` so they win over those
 *   utilities. Two narrow accessibility overrides force a background
 *   instead: `variants.<data-variant>.hoverFill`, an opaque contract fill
 *   on hover in place of the component's translucent hover modifier, and
 *   `surface`, a translucent contract surface painted over an opaque one.
 *   Nothing else is forced: no box shadow, transition or animation
 *   longhand, so the package's reduced-motion rule and the focus ring are
 *   untouched.
 * - `exceptions` pin contrast shortfalls per canonical theme and scheme, or,
 *   with `os`, per theme-family state (`FAMILY_THEME_STATES`): an exception
 *   applies to exactly the state it names, so a canonical exception never
 *   covers a family state and the reverse.
 *
 * Validation runs with the rest of the profile, before any file is read.
 */
import { TOKEN_NAMES } from "../tokens.js";
import { checkPinnedMeasurement, CUSTOM_PROPERTY_NAME as NAME, isObject, isPlainLiteral, KEBAB_SLUG as SLOT, onlyKeys, plainLiteralMessage, samePair, } from "./grammar.js";
/** The schemes each canonical theme can be seen in. Minimal follows the operating system; the others are fixed. */
export const THEME_SCHEMES = Object.freeze({
    "scientific-clay": ["light"],
    minimal: ["light", "dark"],
    "nebula-light": ["light"],
    "nebula-dark": ["dark"],
});
/**
 * The theme-family states (`family-core.ts`) a compile qualifies when asked
 * (`themeFamilies`): Clay Dark, and Minimal pinned against the operating
 * system. `scheme` is what the root shows (`data-theme-scheme`), `os` the
 * system's preference behind it. Clay has no system-dependent rule, so one
 * system scheme stands for both.
 */
export const FAMILY_THEME_STATES = Object.freeze([
    { theme: "scientific-clay", scheme: "dark", os: "light" },
    { theme: "minimal", scheme: "light", os: "dark" },
    { theme: "minimal", scheme: "dark", os: "light" },
]);
const PX = /^\d+(\.\d+)?px$/;
const SLOT_KEYS = [
    "radius", "maxRadius", "shadow", "hoverShadow", "activeShadow", "properties", "variants", "surface",
];
const RADII = TOKEN_NAMES.filter((name) => name.startsWith("radius-"));
const SHADOWS = TOKEN_NAMES.filter((name) => name.startsWith("shadow-"));
const ADAPTATION_KEYS = ["values", "properties", "slots", "exceptions"];
const EXCEPTION_KEYS = ["fg", "bg", "over", "kind", "theme", "scheme", "os", "ratio", "tolerance", "reason"];
/** The prefix of the package's own names; a profile may not define custom properties under it. */
const PRIVATE_PREFIX = "atomicstrata-";
/**
 * The root's own value of a contract token a system's constant overrides,
 * inherited by adapted scopes below any native one.
 */
export function contractSnapshot(profile, token) {
    return `--${PRIVATE_PREFIX}${profile.id}-contract-${token}`;
}
function checkValue(check, value, where) {
    check(isObject(value), `${where} must be { ref } or { literal }`);
    const raw = value;
    if ("ref" in raw) {
        onlyKeys(check, raw, ["ref"], where);
        const isContractToken = typeof raw.ref === "string" && TOKEN_NAMES.includes(raw.ref);
        check(isContractToken, `${where} must refer to a contract token, not --${String(raw.ref)}`);
        return;
    }
    onlyKeys(check, raw, ["literal"], where);
    check(isPlainLiteral(raw.literal), plainLiteralMessage(where));
}
function checkValues(check, values, profile) {
    check(isObject(values), "adaptation.values must be an object of name to value");
    const ownConstants = Object.keys(profile.constants).filter((name) => !profile.overridesContract.includes(name));
    const expected = [...profile.vocabulary, ...ownConstants];
    const keys = Object.keys(values);
    const missing = expected.filter((name) => !keys.includes(name));
    const extra = keys.filter((name) => !expected.includes(name));
    const names = (list) => list.map((name) => "--" + name).join(", ");
    check(missing.length === 0, `adaptation.values does not define ${names(missing)}`);
    check(extra.length === 0, `adaptation.values defines ${names(extra)}, which is not vocabulary or a non-contract constant`);
    for (const [name, value] of Object.entries(values))
        checkValue(check, value, `adaptation.values --${name}`);
}
function checkProperties(check, properties, profile, at) {
    check(isObject(properties), `${at} must be an object of name to value`);
    for (const [name, value] of Object.entries(properties)) {
        const where = `${at} --${name}`;
        const isDefinable = NAME.test(name) && !name.startsWith(PRIVATE_PREFIX);
        check(isDefinable, `${where} is not a custom-property name the profile may define`);
        const isConstant = Object.prototype.hasOwnProperty.call(profile.constants, name);
        const isOwnName = !profile.vocabulary.includes(name) && !isConstant && !TOKEN_NAMES.includes(name);
        check(isOwnName, `${where} is vocabulary, a constant or a contract token; adapt it in values`);
        checkValue(check, value, where);
    }
}
function checkSlot(check, slot, value, profile) {
    const where = `adaptation.slots ${slot}`;
    check(SLOT.test(slot), `${where}: a slot name matches ${SLOT}`);
    check(isObject(value) && Object.keys(value).length > 0, `${where} must set at least one of ${SLOT_KEYS.join(", ")}`);
    const raw = value;
    onlyKeys(check, raw, SLOT_KEYS, where);
    checkShape(check, raw, where);
    if (raw.properties !== undefined)
        checkProperties(check, raw.properties, profile, `${where} properties`);
    if (raw.variants !== undefined)
        checkVariants(check, raw.variants, where);
    if (raw.surface !== undefined)
        checkSurface(check, raw.surface, where);
}
/**
 * A shape's radius (a contract radius, optionally capped in px) and shadows
 * (contract shadows); shared with recipes' adapted shapes.
 */
export function checkShape(check, raw, where) {
    if (raw.radius !== undefined) {
        check(RADII.includes(raw.radius), `${where} radius must be one of ${RADII.join(", ")}`);
    }
    if (raw.maxRadius !== undefined) {
        const isCap = raw.radius !== undefined && typeof raw.maxRadius === "string" && PX.test(raw.maxRadius);
        check(isCap, `${where} maxRadius must be a px length and needs radius`);
    }
    for (const key of ["shadow", "hoverShadow", "activeShadow"]) {
        if (raw[key] === undefined)
            continue;
        check(SHADOWS.includes(raw[key]), `${where} ${key} must be one of ${SHADOWS.join(", ")}`);
    }
}
function checkVariants(check, variants, where) {
    const isNonEmpty = isObject(variants) && Object.keys(variants).length > 0;
    check(isNonEmpty, `${where} variants must name at least one data-variant`);
    for (const [variant, value] of Object.entries(variants)) {
        check(SLOT.test(variant), `${where} variant "${variant}" must match ${SLOT}`);
        check(isObject(value), `${where} variant ${variant} must be { hoverFill }`);
        onlyKeys(check, value, ["hoverFill"], `${where} variant ${variant}`);
        const fill = value.hoverFill;
        const isTokenRef = isObject(fill) && Object.keys(fill).length === 1 && typeof fill.ref === "string"
            && TOKEN_NAMES.includes(fill.ref);
        check(isTokenRef, `${where} variant ${variant} hoverFill must be { ref: <contract token> }`);
    }
}
function checkSurface(check, surface, where) {
    check(isObject(surface), `${where} surface must be { fill, over }`);
    const raw = surface;
    onlyKeys(check, raw, ["fill", "over"], `${where} surface`);
    const areTokens = TOKEN_NAMES.includes(raw.fill) && TOKEN_NAMES.includes(raw.over);
    check(areTokens, `${where} surface fill and over must be contract tokens`);
}
function checkException(check, exception, pairs) {
    check(isObject(exception), "each adaptation exception must be an object");
    const raw = exception;
    onlyKeys(check, raw, EXCEPTION_KEYS, "adaptation exception");
    const listed = pairs.some((pair) => samePair(pair, raw));
    check(listed, `adaptation exception ${String(raw.fg)} on ${String(raw.bg)} is not one of contrast.pairs`);
    check(isThemeState(raw.theme, raw.scheme, raw.os), "adaptation exception must name a canonical theme and a scheme it is seen in, or a theme-family state with os");
    checkPinnedMeasurement(check, raw, "adaptation exception");
}
/** Whether `theme` is a canonical theme and `scheme` one it is seen in; shared with recipe exceptions. */
function isThemeScheme(theme, scheme) {
    if (!Object.prototype.hasOwnProperty.call(THEME_SCHEMES, theme))
        return false;
    return THEME_SCHEMES[theme].includes(scheme);
}
/**
 * Whether `theme`, `scheme` and `os` name a measured state: a canonical theme
 * and a scheme it is seen in when `os` is absent, or exactly one of
 * `FAMILY_THEME_STATES` when it is given. Shared with recipe exceptions.
 */
export function isThemeState(theme, scheme, os) {
    if (os === undefined)
        return isThemeScheme(theme, scheme);
    return FAMILY_THEME_STATES.some((state) => state.theme === theme && state.scheme === scheme && state.os === os);
}
/** Check `profile.adaptation`, when present, against the already validated rest of the profile. */
export function checkAdaptation(check, profile) {
    const adaptation = profile.adaptation;
    if (adaptation === undefined)
        return;
    check(isObject(adaptation), "adaptation must be an object");
    const raw = adaptation;
    onlyKeys(check, raw, ADAPTATION_KEYS, "adaptation");
    for (const key of ADAPTATION_KEYS)
        check(key in raw, `adaptation is missing "${key}"`);
    checkValues(check, raw.values, profile);
    checkProperties(check, raw.properties, profile, "adaptation.properties");
    check(isObject(raw.slots), "adaptation.slots must be an object of slot name to shape");
    for (const [slot, value] of Object.entries(raw.slots))
        checkSlot(check, slot, value, profile);
    check(Array.isArray(raw.exceptions), "adaptation.exceptions must be a list");
    for (const exception of raw.exceptions)
        checkException(check, exception, profile.contrast.pairs);
}
