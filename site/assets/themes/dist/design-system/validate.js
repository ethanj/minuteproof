/**
 * The profile grammar, as one validator.
 *
 * A profile is accepted only in the shape `types.ts` describes, and every
 * cross-reference inside it is checked before any file is read: names are
 * well formed, the vocabulary does not collide with the contract, the bridge
 * covers exactly the contract, every reference names something the scope
 * declares, every gap names a canonical theme, every exception names a brand.
 * Checks that need the value files (digests, exact vocabulary per mode,
 * dangling or cyclic `var()` inside a mode, contrast) run in the compiler.
 *
 * This is ordinary configuration validation for trusted authors, not a
 * hostile-input framework: it rejects mistakes with a message naming them.
 */
import { canonicalThemes } from "../boot-core.js";
import { checkAdaptation } from "./adaptation.js";
import { checkPinnedMeasurement, COMMIT, CUSTOM_PROPERTY_NAME as NAME, isContrastRatio, isMatch, isObject, isPlainLiteral, isText, makeCheck, namesPinnedCommit, onlyKeys as onlyKeysWith, plainLiteralMessage, PROFILE_SLUG as SLUG, REPOSITORY, samePair, SEMVER, } from "./grammar.js";
import { TOKEN_NAMES } from "../tokens.js";
import { PROFILE_SCHEMA } from "./types.js";
const SHA256 = /^[0-9a-f]{64}$/;
/**
 * A relative path with no `.` or `..` segment. `brandFilesIn` joins it under
 * the acquisition directory, so this is what keeps an acquired file inside
 * `--out`: the first lookahead refuses an absolute path, the second any
 * segment that is exactly `.` or `..`.
 */
const RELATIVE_FILE = /^(?!\/)(?!.*(^|\/)\.\.?(\/|$))[A-Za-z0-9_./-]+$/;
const TOP_LEVEL = ["schema", "id", "version", "label", "source", "reader", "modes", "vocabulary", "constants",
    "overridesContract", "brands", "bridge", "scope", "fonts", "contrast", "components"];
const OPTIONAL_TOP_LEVEL = ["adaptation"];
const SCOPE_PROPERTIES = ["background", "color", "font-family", "line-height"];
const FONT_KEYS = ["family", "package", "version", "licence"];
const EXCEPTION_KEYS = ["fg", "bg", "over", "kind", "brands", "mode", "ratio", "tolerance", "reason"];
/** The error every profile problem throws: the package prefix, then the problem. */
export function profileError(message) {
    return new Error("@atomicstrata/themes: invalid design-system profile: " + message);
}
const check = makeCheck(profileError);
const onlyKeys = (value, allowed, where) => onlyKeysWith(check, value, allowed, where);
/** Custom-property names as a message lists them: `--a, --b`. */
const names = (list) => list.map((name) => "--" + name).join(", ");
function stringList(value, pattern, where) {
    const isNameList = Array.isArray(value) && value.every((item) => typeof item === "string" && pattern.test(item));
    check(isNameList, `${where} must be a list of names matching ${pattern}`);
    const list = value;
    check(new Set(list).size === list.length, `${where} lists a name twice`);
    return list;
}
/** A CSS value that cannot reference, end its declaration or open a block. */
function checkLiteral(value, where) {
    check(isPlainLiteral(value), plainLiteralMessage(where));
}
function checkSource(source) {
    check(isObject(source), "source must be an object");
    const raw = source;
    onlyKeys(raw, ["kind", "repository", "tag", "commit", "rules", "licence"], "source");
    check(raw.kind === "registry" || raw.kind === "files", 'source.kind must be "registry" or "files"');
    check(isText(raw.licence), "source.licence must say what licence the source declares");
    if (raw.kind === "registry") {
        check(isMatch(raw.repository, REPOSITORY), "source.repository must be owner/name");
        check(isMatch(raw.commit, COMMIT), "source.commit must be a full commit hash");
    }
    if (raw.tag !== undefined)
        check(isText(raw.tag), "source.tag must be a non-empty string");
    if (raw.rules !== undefined)
        check(namesPinnedCommit(raw.rules), "source.rules must be { repository, commit }");
}
function checkModes(modes) {
    check(isObject(modes), "modes must be an object");
    const raw = modes;
    if (raw.policy === "os") {
        onlyKeys(raw, ["policy", "explicit"], "modes");
        return check(raw.explicit === undefined || raw.explicit === true, "modes.explicit must be true when present");
    }
    check(raw.policy === "attribute", 'modes.policy must be "os" or "attribute"');
    onlyKeys(raw, ["policy", "default"], "modes");
    check(raw.default === "light" || raw.default === "dark", 'modes.default must be "light" or "dark"');
}
function checkConstants(raw, vocabulary) {
    check(isObject(raw.constants), "constants must be an object of name to value");
    const constants = raw.constants;
    for (const [name, value] of Object.entries(constants)) {
        check(NAME.test(name), `constant "${name}" is not a custom-property name`);
        check(!vocabulary.includes(name), `--${name} is both vocabulary and a constant`);
        checkLiteral(value, `constant --${name}`);
    }
    const overrides = stringList(raw.overridesContract, NAME, "overridesContract");
    for (const name of Object.keys(constants)) {
        if (!TOKEN_NAMES.includes(name))
            continue;
        check(overrides.includes(name), `constant --${name} is a contract token; list it in overridesContract`);
    }
    for (const name of overrides) {
        const isTokenConstant = name in constants && TOKEN_NAMES.includes(name);
        check(isTokenConstant, `overridesContract names --${name}, which is not a contract-token constant`);
    }
    return Object.keys(constants);
}
function checkBrands(brands) {
    check(isObject(brands) && Object.keys(brands).length > 0, "brands must name at least one brand");
    for (const [id, brand] of Object.entries(brands)) {
        check(SLUG.test(id), `brand id "${id}" must match ${SLUG}`);
        check(isObject(brand), `brand ${id} must be an object`);
        const raw = brand;
        onlyKeys(raw, ["label", "file", "sha256"], `brand ${id}`);
        check(isText(raw.label), `brand ${id} needs a label`);
        check(isMatch(raw.file, RELATIVE_FILE), `brand ${id} file must be a relative path inside the source`);
        check(isMatch(raw.sha256, SHA256), `brand ${id} sha256 must be 64 lowercase hex digits`);
    }
    return Object.keys(brands);
}
function checkScopeValue(value, declared, where) {
    check(isObject(value), `${where} must be { ref } or { literal }`);
    const raw = value;
    if ("ref" in raw) {
        onlyKeys(raw, ["ref"], where);
        const isDeclared = typeof raw.ref === "string" && declared.includes(raw.ref);
        check(isDeclared, `${where} refers to --${String(raw.ref)}, which the scope does not declare`);
        return;
    }
    onlyKeys(raw, ["literal"], where);
    checkLiteral(raw.literal, where);
}
function checkBridgeValue(token, value, declared) {
    var _a;
    const raw = value;
    if (isObject(raw) && "gap" in raw) {
        onlyKeys(raw, ["gap", "reason"], `bridge --${token}`);
        const fill = (_a = raw.gap) === null || _a === void 0 ? void 0 : _a.fill;
        const isCanonicalFill = isObject(raw.gap) && canonicalThemes().some((entry) => entry[0] === fill);
        check(isCanonicalFill, `bridge --${token} gap must fill from a canonical theme`);
        check(isText(raw.reason), `bridge --${token} gap needs a reason`);
        return;
    }
    checkScopeValue(value, declared, `bridge --${token}`);
    check(raw.ref !== token, `bridge --${token} refers to itself, which is a cycle`);
}
function checkBridge(bridge, declared) {
    check(isObject(bridge), "bridge must be an object of contract token to value");
    const keys = Object.keys(bridge);
    const missing = TOKEN_NAMES.filter((name) => !keys.includes(name));
    const extra = keys.filter((name) => !TOKEN_NAMES.includes(name));
    check(missing.length === 0, `bridge does not map ${names(missing)}`);
    check(extra.length === 0, `bridge maps ${names(extra)}, which are not contract tokens`);
    for (const [token, value] of Object.entries(bridge))
        checkBridgeValue(token, value, declared);
}
function checkScope(scope, declared) {
    check(isObject(scope), "scope must be an object");
    onlyKeys(scope, SCOPE_PROPERTIES, "scope");
    for (const required of ["background", "color"]) {
        check(required in scope, `scope must set ${required}, so a region paints its own surface and ink`);
    }
    for (const [property, value] of Object.entries(scope))
        checkScopeValue(value, declared, `scope ${property}`);
}
function checkFonts(fonts) {
    check(Array.isArray(fonts), "fonts must be a list");
    for (const font of fonts) {
        check(isObject(font), "each font must be an object");
        onlyKeys(font, FONT_KEYS, "font");
        const isComplete = FONT_KEYS.every((key) => isText(font[key]));
        check(isComplete, "each font needs family, package, version and licence");
    }
}
function checkPair(pair, declared, where) {
    for (const role of ["fg", "bg", "over"]) {
        if (role === "over" && pair.over === undefined)
            continue;
        const isDeclared = typeof pair[role] === "string" && declared.includes(pair[role]);
        check(isDeclared, `${where} ${role} must name a declared name`);
    }
    check(pair.kind === "text" || pair.kind === "non-text", `${where} kind must be "text" or "non-text"`);
}
function checkContrast(contrast, declared, brands) {
    check(isObject(contrast), "contrast must be an object");
    const raw = contrast;
    onlyKeys(raw, ["text", "nonText", "pairs", "exceptions"], "contrast");
    check(isContrastRatio(raw.text) && isContrastRatio(raw.nonText), "contrast thresholds must be ratios of at least 1");
    const areLists = Array.isArray(raw.pairs) && Array.isArray(raw.exceptions);
    check(areLists, "contrast.pairs and contrast.exceptions must be lists");
    for (const pair of raw.pairs) {
        check(isObject(pair), "each contrast pair must be an object");
        onlyKeys(pair, ["fg", "bg", "over", "kind"], "contrast pair");
        checkPair(pair, declared, "contrast pair");
    }
    const context = { declared, brands, pairs: raw.pairs };
    for (const exception of raw.exceptions)
        checkException(exception, context);
}
/** One brand exception: a listed pair, profile brands, a mode, and its pinned measurement. */
function checkException(exception, context) {
    check(isObject(exception), "each contrast exception must be an object");
    onlyKeys(exception, EXCEPTION_KEYS, "contrast exception");
    checkPair(exception, context.declared, "contrast exception");
    const listed = context.pairs.some((pair) => samePair(pair, exception));
    check(listed, `contrast exception ${String(exception.fg)} on ${String(exception.bg)} is not one of contrast.pairs`);
    const exceptionBrands = stringList(exception.brands, SLUG, "contrast exception brands");
    const areProfileBrands = exceptionBrands.length > 0 && exceptionBrands.every((brand) => context.brands.includes(brand));
    check(areProfileBrands, "contrast exception brands must be profile brands");
    check(exception.mode === "light" || exception.mode === "dark", 'contrast exception mode must be "light" or "dark"');
    checkPinnedMeasurement(check, exception, "contrast exception");
}
function checkIdentity(raw) {
    onlyKeys(raw, [...TOP_LEVEL, ...OPTIONAL_TOP_LEVEL], "profile");
    for (const key of TOP_LEVEL)
        check(key in raw, `profile is missing "${key}"`);
    check(raw.schema === PROFILE_SCHEMA, `schema must be "${PROFILE_SCHEMA}"`);
    check(isMatch(raw.id, SLUG), `id must match ${SLUG}`);
    check(isMatch(raw.version, SEMVER), "version must be major.minor.patch");
    check(isText(raw.label), "label must be a non-empty string");
    const isReader = raw.reader === "css-root-scheme" || raw.reader === "json-modes";
    check(isReader, 'reader must be "css-root-scheme" or "json-modes"');
}
/** Check a parsed profile completely and return it typed. Throws on the first problem, naming it. */
export function validateProfile(value) {
    check(isObject(value), "expected a profile object");
    const raw = value;
    checkIdentity(raw);
    checkSource(raw.source);
    checkModes(raw.modes);
    const vocabulary = stringList(raw.vocabulary, NAME, "vocabulary");
    check(vocabulary.length > 0, "vocabulary must not be empty");
    const collisions = vocabulary.filter((name) => TOKEN_NAMES.includes(name));
    check(collisions.length === 0, `vocabulary collides with contract tokens: ${names(collisions)}`);
    const declared = [...vocabulary, ...checkConstants(raw, vocabulary)];
    const brands = checkBrands(raw.brands);
    checkBridge(raw.bridge, declared);
    checkScope(raw.scope, declared);
    checkFonts(raw.fonts);
    checkContrast(raw.contrast, declared, brands);
    stringList(raw.components, NAME, "components");
    checkAdaptation(check, value);
    return value;
}
