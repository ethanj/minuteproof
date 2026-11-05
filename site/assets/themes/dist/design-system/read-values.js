/**
 * Reading one brand's value file into a map per colour mode.
 *
 * Two formats, named by the profile's `reader`:
 *
 * - `css-root-scheme`: a stylesheet with exactly one `:root` rule and one
 *   `:root` rule inside `@media (prefers-color-scheme: dark)`, as shadcn-style
 *   brand files are written. This is a bounded subset: any other rule,
 *   selector, at-rule or media condition is refused, not ignored.
 * - `json-modes`: `{ "light": { "<name>": "<value>" }, "dark": { … } }`,
 *   names without the leading `--`.
 *
 * Each mode must declare exactly the profile's vocabulary. Values may refer
 * to other vocabulary names or constants with `var(--name)`; every mode is
 * resolved here, so a dangling or cyclic reference fails before CSS is
 * written.
 */
import { parseTokenRules, resolveTokens } from "../checks/css.js";
import { isObject } from "./grammar.js";
import { profileError } from "./validate.js";
const DARK_MEDIA = "(prefers-color-scheme: dark)";
const COMMENT = /\/\*[\s\S]*?\*\//g;
/**
 * Only `:root` rules declaring custom properties are read (`checkAtRules`
 * has already limited where they sit); anything else is refused.
 */
function checkRootRule(rule, brand) {
    const where = rule.media === null ? "top level" : `@media ${rule.media}`;
    const isRootOnly = rule.selectors.length === 1 && rule.selectors[0] === ":root" && rule.properties.length === 0;
    if (isRootOnly)
        return;
    const found = `"${rule.selectors.join(", ")}" at ${where}`;
    throw profileError(`brand ${brand}: only :root rules declaring custom properties are read, found ${found}`);
}
/**
 * The shared stylesheet reader skips at-rules it does not understand and
 * flattens nested `@media`, so a brand file is first held to the one shape it
 * may have: exactly one at-rule, `@media (prefers-color-scheme: dark)`. An
 * `@supports`, `@layer`, `@import`, nested or second `@media` is refused here
 * instead of being silently lost from the compiled output.
 */
function checkAtRules(text, brand) {
    const atRules = [...text.replace(COMMENT, "").matchAll(/@([\w-]+)\s*([^{;]*)/g)];
    const [only] = atRules;
    const isDarkMediaOnly = atRules.length === 1 && only[1] === "media" && only[2].trim() === DARK_MEDIA;
    if (!isDarkMediaOnly) {
        const found = atRules.map((match) => `@${match[1]} ${match[2].trim()}`.trim()).join("; ") || "none";
        const expected = `a brand stylesheet has exactly one at-rule, @media ${DARK_MEDIA}`;
        throw profileError(`brand ${brand}: ${expected}; found ${found}`);
    }
}
function readCssRootScheme(text, brand) {
    checkAtRules(text, brand);
    const rules = parseTokenRules(text);
    for (const rule of rules)
        checkRootRule(rule, brand);
    const light = rules.filter((rule) => rule.media === null);
    const dark = rules.filter((rule) => rule.media === DARK_MEDIA);
    if (light.length !== 1 || dark.length !== 1) {
        throw profileError(`brand ${brand}: expected one light :root rule and one dark :root rule`);
    }
    return { light: light[0].tokens, dark: dark[0].tokens };
}
/**
 * A `json-modes` file. Malformed JSON throws the parser's own SyntaxError,
 * without the brand or the package prefix (recorded as debt: wrapping it
 * would change a public error message).
 */
function readJsonModes(text, brand) {
    const parsed = JSON.parse(text);
    if (!isObject(parsed) || Object.keys(parsed).sort().join() !== "dark,light") {
        throw profileError(`brand ${brand}: expected an object with exactly "light" and "dark"`);
    }
    const mode = (name) => {
        const values = parsed[name];
        if (!isObject(values) || !Object.values(values).every((value) => typeof value === "string")) {
            throw profileError(`brand ${brand}: "${name}" must map names to string values`);
        }
        return new Map(Object.entries(values));
    };
    return { light: mode("light"), dark: mode("dark") };
}
function checkExactVocabulary(values, vocabulary, where) {
    const missing = vocabulary.filter((name) => !values.has(name));
    const extra = [...values.keys()].filter((name) => !vocabulary.includes(name));
    const names = (list) => list.map((name) => "--" + name).join(", ");
    if (missing.length > 0)
        throw profileError(`${where} does not declare ${names(missing)}`);
    if (extra.length > 0)
        throw profileError(`${where} declares ${names(extra)}, which the vocabulary does not list`);
}
/**
 * Every vocabulary name and constant in force for one mode, followed to
 * literals. Throws on a dangling or cyclic reference.
 */
export function resolvedScope(values, constants, where) {
    try {
        return resolveTokens(new Map([...Object.entries(constants), ...values]));
    }
    catch (error) {
        throw profileError(`${where}: ${error.message}`);
    }
}
/** Every value is emitted as a declaration, so none may end it or open or close a block. */
function checkDeclarationValues(values, where) {
    for (const [name, value] of values) {
        if (!/[;{}]/.test(value) && value.trim() !== "")
            continue;
        throw profileError(`${where}: --${name} has the value "${value}", which is not a single CSS value`);
    }
}
/** One brand's value file, read by the profile's reader, checked against the vocabulary and resolved per mode. */
export function readBrandValues(profile, brand, text) {
    const values = profile.reader === "css-root-scheme" ? readCssRootScheme(text, brand) : readJsonModes(text, brand);
    for (const mode of ["light", "dark"]) {
        const where = `brand ${brand} (${mode})`;
        checkExactVocabulary(values[mode], profile.vocabulary, where);
        checkDeclarationValues(values[mode], where);
        resolvedScope(values[mode], profile.constants, where);
    }
    return values;
}
