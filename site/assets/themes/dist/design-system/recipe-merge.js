/**
 * The one-level merge of a consumer's recipe document onto the shipped one
 * it extends.
 *
 * Roles merge down to single declarations: role, then its base, variants,
 * sizes or adapted shape, then state, then property, with whole values
 * replacing whole values. The merge is driven by the grammar's depth, never
 * by key names, so a CSS property called `gap` is merged as a property, not
 * mistaken for a `{ gap }` value. Accessibility overrides and exceptions are
 * appended, shipped first, and every other header key is the consumer's.
 *
 * This file only combines; `mergeRecipes` in `recipe-validate.ts` checks
 * both headers before calling it and validates the merged document after.
 */
import { isObject } from "./grammar.js";
/** Two objects merged key by key with `each`; a key only one side has is taken as it is. */
function mergeBy(each) {
    return (base, extension) => (isObject(base) && isObject(extension) ? mergeKeys(base, extension, each) : extension);
}
function mergeKeys(base, extension, each) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(extension))
        merged[key] = key in base ? each(base[key], value) : value;
    return merged;
}
/** Key by key, the extension's value replacing the base's whole: declarations by property, roles by key. */
const replaceByKey = mergeBy((_base, extension) => extension);
const mergeStateMaps = mergeBy(replaceByKey);
const ROLE_MERGES = {
    base: mergeStateMaps,
    variants: mergeBy(mergeStateMaps),
    sizes: mergeBy(replaceByKey),
    adapted: replaceByKey,
};
/** One role present on both sides: its own keys replaced, its state maps, variants, sizes and shape merged down. */
function mergeRoleEntry(shipped, own) {
    const merged = replaceByKey(shipped, own);
    for (const [key, merge] of Object.entries(ROLE_MERGES)) {
        if (key in shipped && key in own)
            merged[key] = merge(shipped[key], own[key]);
    }
    return merged;
}
const mergeRoles = mergeBy((shipped, own) => (isObject(shipped) && isObject(own) ? mergeRoleEntry(shipped, own) : own));
/**
 * `own` on top of `shipped`, both with checked headers. The result is not yet
 * validated. Overrides are spread before validation, so a non-iterable
 * `overrides` throws the engine's TypeError here rather than the grammar's
 * message (recorded as debt; the expression is kept as it was so the thrown
 * text is unchanged).
 */
export function mergeRecipeDocuments(shipped, own) {
    var _a, _b;
    var _c, _d, _e, _f;
    const overrides = [
        ...((_c = (_a = shipped.accessibility) === null || _a === void 0 ? void 0 : _a.overrides) !== null && _c !== void 0 ? _c : []),
        ...((_d = (_b = own.accessibility) === null || _b === void 0 ? void 0 : _b.overrides) !== null && _d !== void 0 ? _d : []),
    ];
    const merged = { ...own, roles: mergeRoles(shipped.roles, own.roles) };
    if (overrides.length > 0)
        merged.accessibility = { overrides };
    const exceptions = [...((_e = shipped.exceptions) !== null && _e !== void 0 ? _e : []), ...((_f = own.exceptions) !== null && _f !== void 0 ? _f : [])];
    if (exceptions.length > 0)
        merged.exceptions = exceptions;
    return merged;
}
