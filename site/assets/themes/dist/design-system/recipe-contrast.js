/**
 * Recipe contrast, judged at compile time against what the emitted CSS paints.
 *
 * For every role held to `contrast: "text"`, every variant (or the base
 * alone) and every reachable combination of its states, the declarations are
 * cascaded in exactly the emitted order (`STATE_ORDER`, base before variant
 * within a state, zero specificity throughout). The unqualified base is
 * measured as well as each variant. Disabled combinations are not judged
 * (WCAG exempts inactive controls); `active` is measured with and without
 * `hover`, since a keyboard press is active and not hovered. Then:
 *
 * - **text:** the label colour (the scope ink when the recipe sets none),
 *   composited over the background, which is composited over the role's
 *   surface, against that background, at the text floor;
 * - **focus:** a focus outline's colour composited over the surface, against
 *   the surface, at the non-text floor (offsets are non-negative, so the
 *   outline sits on the surface);
 * - **boundary** (fields only): the border as painted (over the field's own
 *   composited fill, since backgrounds reach under the border) against both
 *   the surface outside it and that fill inside it, the lower of the two, at
 *   the non-text floor. Other roles' borders are decorative and are
 *   not judged.
 *
 * Natively this runs per compiled brand and mode, with the accessibility
 * overrides applied; under the theme appearance, per canonical theme and
 * scheme with the adapted vocabulary. A shortfall fails the compile unless
 * an exception pins that exact combination, and an exception that no longer
 * matches a shortfall fails too. The same file judges overrides: every profile pair they change
 * is re-measured, and any regression fails.
 */
import { composite, contrast, parseColour } from "../checks/colour.js";
import { floorOf, judge, measurePair } from "./contrast.js";
import { profileError } from "./validate.js";
import { ROLE_STATES, STATE_ORDER, } from "./recipe-types.js";
const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };
/** Every set of a role's non-rest states without `disabled`. */
export function stateSets(role) {
    const states = ROLE_STATES[role].filter((state) => state !== "rest" && state !== "disabled");
    let sets = [[]];
    for (const state of states)
        sets = sets.flatMap((set) => [set, [...set, state]]);
    return sets;
}
/** The declarations in force for one variant and state set, in emitted order. */
export function cascaded(recipe, variant, states) {
    var _a, _b;
    var _c, _d;
    const result = {};
    for (const state of STATE_ORDER) {
        if (state !== "rest" && !states.includes(state))
            continue;
        Object.assign(result, (_c = recipe.base[state]) !== null && _c !== void 0 ? _c : {});
        if (variant !== null)
            Object.assign(result, (_d = (_b = (_a = recipe.variants) === null || _a === void 0 ? void 0 : _a[variant]) === null || _b === void 0 ? void 0 : _b[state]) !== null && _d !== void 0 ? _d : {});
    }
    return result;
}
/** `text` as a colour (`transparent` included), or a compile error naming `where`. */
function measurableColour(text, where) {
    if (text === "transparent")
        return TRANSPARENT;
    const colour = parseColour(text !== null && text !== void 0 ? text : "");
    if (colour === null)
        throw profileError(`${where}: "${text}" is not a measurable colour`);
    return colour;
}
function colourOf(value, values, where) {
    if ("ref" in value)
        return measurableColour(values.names.get(value.ref), `${where} --${value.ref}`);
    if ("literal" in value)
        return measurableColour(value.literal, where);
    if ("gap" in value)
        return measurableColour(values.gap(value.gap), `${where} gap --${value.gap}`);
    const { ref, over, percent } = value.mix;
    const first = measurableColour(values.names.get(ref), `${where} --${ref}`);
    return mixed(first, measurableColour(values.names.get(over), `${where} --${over}`), percent / 100);
}
/** `color-mix(in srgb, first <share>, second)`: premultiplied-alpha interpolation, as CSS Color 5 defines it. */
function mixed(first, second, share) {
    const alpha = first.a * share + second.a * (1 - share);
    if (alpha === 0)
        return TRANSPARENT;
    const channel = (top, bottom) => (top * first.a * share + bottom * second.a * (1 - share)) / alpha;
    return { r: channel(first.r, second.r), g: channel(first.g, second.g), b: channel(first.b, second.b), a: alpha };
}
/**
 * The role's opaque surface: its own, or the profile's scope background,
 * composited over the scope background when translucent.
 */
function surfaceOf({ profile, recipe, values }, where) {
    const pageColour = colourOf(profile.scope.background, values, `${where} scope background`);
    if (pageColour.a < 1)
        throw profileError(`${where}: the scope background must be opaque`);
    if (recipe.surface === undefined)
        return pageColour;
    return composite(colourOf(recipe.surface, values, `${where} surface`), pageColour);
}
function ratios(scene, declared, where) {
    var _a;
    const { profile, values } = scene;
    const surface = surfaceOf(scene, where);
    const fill = declared["background-color"];
    const fillColour = fill === undefined ? TRANSPARENT : colourOf(fill, values, `${where} background`);
    const background = composite(fillColour, surface);
    const ink = composite(colourOf((_a = declared.color) !== null && _a !== void 0 ? _a : profile.scope.color, values, `${where} color`), background);
    const measured = { text: contrast(ink, background) };
    const outline = declared["outline-color"];
    if (outline !== undefined) {
        measured.focus = contrast(composite(colourOf(outline, values, `${where} outline`), surface), surface);
    }
    const edge = declared["border-color"];
    if (scene.role === "field" && edge !== undefined) {
        const painted = composite(colourOf(edge, values, `${where} border`), background);
        measured.boundary = Math.min(contrast(painted, surface), contrast(painted, background));
    }
    return measured;
}
const sameContext = (exception, context) => ("brand" in context
    ? exception.brand === context.brand && exception.mode === context.mode
    : exception.theme === context.theme && exception.scheme === context.scheme && exception.os === context.os);
const sameStates = (first, second) => first.length === second.length && first.every((state) => second.includes(state));
const sameTarget = (exception, entry) => exception.role === entry.role && exception.variant === entry.variant && exception.pair === entry.pair;
/** The exception pinning exactly this combination: same role, variant, pair and context, and the same set of states. */
function exceptionFor(recipes, entry, context) {
    var _a;
    return ((_a = recipes.exceptions) !== null && _a !== void 0 ? _a : []).find((exception) => sameTarget(exception, entry)
        && sameStates(exception.states, entry.states) && sameContext(exception, context));
}
/** The pairs one combination is judged on: its label, its focus outline while focused, a field's edge. */
function pairsOf(measured, states) {
    const pairs = [["text", measured.text]];
    if (measured.focus !== undefined && states.includes("focus-visible"))
        pairs.push(["focus", measured.focus]);
    if (measured.boundary !== undefined)
        pairs.push(["boundary", measured.boundary]);
    return pairs;
}
function contextLabel(context) {
    if ("brand" in context)
        return `${context.brand}, ${context.mode}`;
    const shown = `${context.theme}, ${context.scheme}`;
    return context.os === undefined ? shown : `${shown} on ${context.os}`;
}
/** Every combination of one role in one context. */
function measureRole(scene, recipes, context) {
    var _a;
    const { profile, role, recipe } = scene;
    const variants = [null, ...Object.keys((_a = recipe.variants) !== null && _a !== void 0 ? _a : {})];
    return variants.flatMap((variant) => stateSets(role).flatMap((states) => {
        const variantLabel = variant === null ? "" : ` ${variant}`;
        const where = `recipe ${role}${variantLabel} [${states.join("+") || "rest"}] (${contextLabel(context)})`;
        const measured = ratios(scene, cascaded(recipe, variant, states), where);
        return pairsOf(measured, states).map(([pair, ratio]) => {
            const entry = { ...context, role, variant, states, pair };
            const exception = exceptionFor(recipes, entry, context);
            const floor = floorOf(profile, pair === "text" ? "text" : "non-text");
            const status = judge({ floor, ratio, exception, where: `${where} ${pair}` });
            return { measurement: { ...entry, ratio, status }, exception };
        });
    }));
}
/**
 * Every role held to contrast, in every given context. Throws on an
 * unpinned shortfall or an exception that matched nothing.
 */
export function measureRecipes(profile, recipes, contexts) {
    var _a, _b;
    const roles = Object.keys(recipes.roles).filter((role) => recipes.roles[role].contrast === "text");
    const judged = contexts.flatMap(({ context, values }) => roles.flatMap((role) => measureRole({ profile, role, recipe: recipes.roles[role], values }, recipes, context)));
    const used = new Set(judged.flatMap(({ exception }) => (exception === undefined ? [] : [exception])));
    const stale = ((_a = recipes.exceptions) !== null && _a !== void 0 ? _a : [])
        .filter((exception) => !used.has(exception) && contexts.some(({ context }) => sameContext(exception, context)));
    if (stale.length > 0) {
        const [first] = stale;
        const combination = `${first.role} ${(_b = first.variant) !== null && _b !== void 0 ? _b : ""} [${first.states.join("+")}]`;
        throw profileError(`recipe exception for ${combination} matches no measured combination`);
    }
    return judged.map(({ measurement }) => measurement);
}
/** A pair that met its floor and no longer does, or one below it that got lower. */
function regresses(ratioBefore, ratioAfter, floor) {
    return ratioBefore >= floor ? ratioAfter < floor : ratioAfter < ratioBefore;
}
/**
 * The profile's pairs in one brand and mode before and after the overrides,
 * kept where an override changed the ratio. A pair that met its floor must
 * still meet it, and one below its floor must not get lower.
 */
export function measureOverrides(profile, scene) {
    const { brand, mode } = scene;
    return profile.contrast.pairs.flatMap((pair) => {
        const where = `accessibility override (${brand}, ${mode}) ${pair.fg} on ${pair.bg}`;
        const ratioBefore = measurePair(scene.before, pair, where);
        const ratioAfter = measurePair(scene.after, pair, where);
        if (ratioBefore === ratioAfter)
            return [];
        const floor = floorOf(profile, pair.kind);
        if (regresses(ratioBefore, ratioAfter, floor)) {
            throw profileError(`${where} regresses from ${ratioBefore} to ${ratioAfter} (floor ${floor})`);
        }
        return [{ ...pair, brand, mode, before: ratioBefore, after: ratioAfter }];
    });
}
