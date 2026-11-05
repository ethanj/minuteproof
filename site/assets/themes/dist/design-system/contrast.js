/**
 * The profile's contrast policy, applied to every brand and mode at compile time.
 *
 * Each listed pair is measured at full precision: a translucent background is
 * first painted over its `over` name, then the ink over that. A pair below its
 * threshold must be a declared exception for that brand and mode, and the
 * measurement must equal the exception's ratio within its declared tolerance.
 * An exception that no longer matches a shortfall fails too, so an upstream
 * fix is noticed and the exception removed. Nothing is rounded.
 *
 * The theme appearance is judged the same way, once per canonical theme and
 * scheme, with the vocabulary resolved from that theme's contract tokens.
 */
import { composite, contrast, parseColour } from "../checks/colour.js";
import { samePair } from "./grammar.js";
import { profileError } from "./validate.js";
function colourOf(resolved, name, where) {
    var _a;
    const colour = parseColour((_a = resolved.get(name)) !== null && _a !== void 0 ? _a : "");
    if (colour === null) {
        throw profileError(`${where}: --${name} is "${resolved.get(name)}", which is not a measurable colour`);
    }
    return colour;
}
/** The ratio of `pair` in one resolved map. */
export function measurePair(resolved, pair, where) {
    let background = colourOf(resolved, pair.bg, where);
    if (background.a < 1) {
        if (pair.over === undefined) {
            throw profileError(`${where}: --${pair.bg} is translucent; name the opaque surface it sits on with "over"`);
        }
        const under = colourOf(resolved, pair.over, where);
        if (under.a < 1)
            throw profileError(`${where}: --${pair.over} must be opaque to sit under --${pair.bg}`);
        background = composite(background, under);
    }
    return contrast(composite(colourOf(resolved, pair.fg, where), background), background);
}
function exceptionFor(profile, pair, brand, mode) {
    return profile.contrast.exceptions
        .find((entry) => samePair(entry, pair) && entry.mode === mode && entry.brands.includes(brand));
}
/** The profile's floor for a pair of this kind. */
export function floorOf(profile, kind) {
    return kind === "text" ? profile.contrast.text : profile.contrast.nonText;
}
/** Pass, or a matching pinned exception; anything else throws naming `where`. */
export function judge({ floor, ratio, exception, where }) {
    if (exception === undefined) {
        if (ratio < floor) {
            throw profileError(`${where} measures ${ratio}, below ${floor}, and is not a declared exception`);
        }
        return "pass";
    }
    if (ratio >= floor) {
        throw profileError(`${where} measures ${ratio}, which meets ${floor}: remove the stale exception`);
    }
    if (Math.abs(ratio - exception.ratio) > exception.tolerance) {
        const pinned = `${exception.ratio} (tolerance ${exception.tolerance})`;
        throw profileError(`${where} measures ${ratio}, but the exception pins ${pinned}`);
    }
    return "exception";
}
/**
 * Every pair for one brand and mode. Throws on an undeclared shortfall or a
 * drifted or stale exception. The positional shape matches `measureAdapted`,
 * which is a public export.
 */
export function measureBrand(profile, brand, mode, resolved) {
    return profile.contrast.pairs.map((pair) => {
        const ratio = measurePair(resolved, pair, `contrast (${brand}, ${mode})`);
        const exception = exceptionFor(profile, pair, brand, mode);
        const where = `contrast ${pair.fg} on ${pair.bg} (${brand}, ${mode})`;
        const status = judge({ floor: floorOf(profile, pair.kind), ratio, exception, where });
        return { ...pair, brand, mode, ratio, status };
    });
}
/** The contract's own opaque canvas, under a name no vocabulary can have. */
const CANVAS = "@canvas";
/** The vocabulary as the theme appearance resolves it under one theme's resolved contract tokens. */
export function adaptedValues(profile, contract) {
    var _a, _b, _c;
    const values = new Map([[CANVAS, (_a = contract.get("canvas")) !== null && _a !== void 0 ? _a : ""]]);
    for (const [name, value] of Object.entries(profile.adaptation.values)) {
        values.set(name, "ref" in value ? (_b = contract.get(value.ref)) !== null && _b !== void 0 ? _b : "" : value.literal);
    }
    for (const name of profile.overridesContract)
        values.set(name, (_c = contract.get(name)) !== null && _c !== void 0 ? _c : "");
    return values;
}
/**
 * Every pair under the theme appearance in one canonical theme and scheme. A
 * translucent background with no `over` sits on the contract's canvas, the
 * same model the package's own contrast guarantee uses.
 */
export function measureAdapted(profile, theme, scheme, contract, os) {
    const resolved = adaptedValues(profile, contract);
    const state = os === undefined ? `${theme}, ${scheme}` : `${theme}, ${scheme} on ${os}`;
    return profile.contrast.pairs.map((pair) => {
        const where = `theme appearance: contrast ${pair.fg} on ${pair.bg} (${state})`;
        const ratio = measurePair(resolved, onCanvas(pair, resolved), where);
        const exception = profile.adaptation.exceptions.find((entry) => samePair(entry, pair) && entry.theme === theme && entry.scheme === scheme && entry.os === os);
        const status = judge({ floor: floorOf(profile, pair.kind), ratio, exception, where });
        return os === undefined ? { ...pair, theme, scheme, ratio, status } : { ...pair, theme, scheme, os, ratio, status };
    });
}
/** `pair`, sitting on the contract's canvas when its background is translucent and it names nothing else to sit on. */
function onCanvas(pair, resolved) {
    var _a;
    if (pair.over !== undefined)
        return pair;
    const background = parseColour((_a = resolved.get(pair.bg)) !== null && _a !== void 0 ? _a : "");
    return background !== null && background.a < 1 ? { ...pair, over: CANVAS } : pair;
}
/**
 * The adapter's forced backgrounds must be colours the guarantee can stand
 * on, in this theme and scheme: a hover fill and a surface's `over` are
 * opaque, and a surface's `fill` is a measurable colour (it may be
 * translucent; it is painted over `over`). A profile whose tokens do not
 * meet that fails the compile, naming the slot.
 */
export function checkAdaptedFills(profile, theme, scheme, contract) {
    var _a;
    const colour = (token, where, opaque) => {
        var _a;
        const parsed = parseColour((_a = contract.get(token)) !== null && _a !== void 0 ? _a : "");
        if (parsed !== null && !(opaque && parsed.a < 1))
            return;
        const wanted = opaque ? "an opaque" : "a measurable";
        const found = `--${token} is "${contract.get(token)}" in ${theme} (${scheme})`;
        throw profileError(`theme appearance: ${where} ${found}, not ${wanted} colour`);
    };
    for (const [slot, shape] of Object.entries(profile.adaptation.slots)) {
        for (const [variant, { hoverFill }] of Object.entries((_a = shape.variants) !== null && _a !== void 0 ? _a : {})) {
            colour(hoverFill.ref, `slot ${slot} variant ${variant} hoverFill`, true);
        }
        if (shape.surface === undefined)
            continue;
        colour(shape.surface.over, `slot ${slot} surface over`, true);
        colour(shape.surface.fill, `slot ${slot} surface fill`, false);
    }
}
