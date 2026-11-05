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
/**
 * The first way `value` is not plain JSON data, or null when it is.
 * `allowNull(path)` says where `null` is a legal value (`$.layer`).
 */
export declare function jsonDataProblem(value: unknown, path?: string, allowNull?: (path: string) => boolean, depth?: number): string | null;
