/**
 * The one boundary every external-theme document crosses before its grammar
 * is checked: the value must be plain JSON data.
 *
 * Accepted, recursively: strings, booleans, finite numbers, dense arrays and
 * plain objects (prototype `Object.prototype` or null) whose own string keys
 * hold accepted values. Refused: `undefined` (a key that is present but
 * undefined, too), `null` except at paths the caller names, holes in arrays,
 * non-finite numbers, functions, symbols, big integers, symbol keys, a
 * `__proto__` key, class instances, and nesting deeper than
 * `MAX_JSON_DEPTH`.
 *
 * `JSON.parse` output can only differ from this by `null`, `__proto__` and
 * depth; values handed in through the JavaScript API can also carry holes,
 * `undefined` and other types. Enforcing it once here means a grammar never
 * meets a value outside JSON, so an optional field is either absent or
 * well-formed: there is no `null` or hole for a later `??` or `join` to
 * coerce. The theme source, the manifest and the catalog index validators
 * all call it first.
 */
/** Deeper nesting than any document of these schemas needs. */
const MAX_JSON_DEPTH = 16;
function isPlainObject(value) {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function arrayProblem(value, path, allowNull, depth) {
    for (let index = 0; index < value.length; index += 1) {
        if (!(index in value))
            return `${path}[${index}] is a hole in the array`;
        const problem = jsonDataProblem(value[index], `${path}[${index}]`, allowNull, depth + 1);
        if (problem !== null)
            return problem;
    }
    return null;
}
function objectProblem(value, path, allowNull, depth) {
    if (!isPlainObject(value))
        return `${path} is not a plain object`;
    if (Object.getOwnPropertySymbols(value).length > 0)
        return `${path} has a symbol key`;
    for (const key of Object.keys(value)) {
        if (key === "__proto__")
            return `${path} has a "__proto__" key`;
        const problem = jsonDataProblem(value[key], `${path}.${key}`, allowNull, depth + 1);
        if (problem !== null)
            return problem;
    }
    return null;
}
/**
 * The first way `value` is not plain JSON data, or null when it is.
 * `allowNull(path)` says where `null` is a legal value (`$.layer`).
 */
export function jsonDataProblem(value, path = "$", allowNull = () => false, depth = 0) {
    if (depth > MAX_JSON_DEPTH)
        return `${path} is nested deeper than ${MAX_JSON_DEPTH}`;
    if (value === null)
        return allowNull(path) ? null : `${path} is null`;
    if (typeof value === "string" || typeof value === "boolean")
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? null : `${path} is not a finite number`;
    if (Array.isArray(value))
        return arrayProblem(value, path, allowNull, depth);
    if (typeof value === "object")
        return objectProblem(value, path, allowNull, depth);
    return `${path} is ${typeof value}, which is not JSON data`;
}
