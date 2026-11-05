/**
 * Writing recipes into the compiled stylesheet.
 *
 * Everything goes into the existing late layer (`BRIDGE_LAYER`): after the
 * package, so the package's own `:focus-visible` outline does not win over
 * a recipe's, and before a framework's components and utilities, so a
 * product's own styles still do. The consumer's layer order is unchanged.
 *
 * - **Scopes.** Recipes apply inside native scopes: a bound product root and
 *   every native region (`[system]:not(:root)` without the theme appearance).
 *   With `theme` in the compiled appearances they also apply inside adapted
 *   scopes, where the vocabulary already comes from the theme in force. A
 *   root under a canonical id is never a native scope, so compiling for
 *   `native` alone leaves every canonical theme untouched. Each scope stops
 *   at the next element carrying any design system.
 * - **Order.** Every recipe selector is wrapped in `:where()`, so all have
 *   zero specificity and source order alone decides: per role, rest (base,
 *   variants, sizes), then each state of `STATE_ORDER` (base, then
 *   variants). The contrast evaluator replays exactly this order.
 * - **Gap values** are private properties set on the scope elements: the
 *   profile's gap fill per mode in native scopes, the contract token in
 *   adapted ones. Accessibility overrides are set on native brand scopes,
 *   only while that mode is in force.
 * - **Forced colours.** A selected control, whose state is otherwise a fill
 *   the browser replaces, is outlined with `Highlight`.
 *
 * Selectors are built only from validated slugs.
 */
import { adaptedSelector, block, productRootSelector, SLOT_ATTRIBUTE, systemSelector, } from "./css-writer.js";
import { pinnedSelectors, explicitModes } from "./emit.js";
import { DESIGN_RECIPE_ATTRIBUTE, DESIGN_RECIPE_SIZE_ATTRIBUTE, DESIGN_RECIPE_VARIANT_ATTRIBUTE, gapProperty, STATE_ORDER, STATE_SELECTORS, } from "./recipe-types.js";
import { BRIDGE_LAYER, DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, THEME_APPEARANCE, } from "./types.js";
const MODE = DESIGN_MODE_ATTRIBUTE;
const DARK = "(prefers-color-scheme: dark)";
const NOT_DARK = "not all and (prefers-color-scheme: dark)";
/**
 * In forced colours a selected control's fill is replaced by the browser, so
 * its state is drawn as an outline in the system `Highlight` colour, inset by
 * its own width so it sits inside the control's edge.
 */
const FORCED_SELECTED_OUTLINE = [
    ["outline", "2px solid Highlight"], ["outline-offset", "-2px"],
];
/**
 * The scope element selectors of one system: the bound root and native
 * regions, and adapted scopes (the same elements as the theme appearance's).
 */
function scopeCompounds(profile) {
    const appearance = `[${DESIGN_APPEARANCE_ATTRIBUTE}="${THEME_APPEARANCE}"]`;
    return {
        root: productRootSelector(profile),
        region: `${systemSelector(profile)}:not(:root):not(${appearance})`,
        adapted: adaptedSelector(profile),
    };
}
function cssValue(profile, value) {
    if ("ref" in value)
        return `var(--${value.ref})`;
    if ("literal" in value)
        return value.literal;
    if ("gap" in value)
        return `var(${gapProperty(profile.id, value.gap)})`;
    return `color-mix(in srgb, var(--${value.mix.ref}) ${value.mix.percent}%, var(--${value.mix.over}))`;
}
/**
 * Selectors matching `compound` exactly while `mode` is its mode in force
 * (own attribute, root preference, then the OS or the default).
 */
function inMode(profile, compound, mode) {
    const isRoot = compound.startsWith(":root");
    const media = mode === "dark" ? DARK : NOT_DARK;
    if (profile.modes.policy === "attribute") {
        const other = mode === "light" ? "dark" : "light";
        const selector = mode === profile.modes.default
            ? `${compound}:not([${MODE}="${other}"])`
            : `${compound}[${MODE}="${mode}"]`;
        return [{ media: null, selectors: [selector] }];
    }
    if (!explicitModes(profile))
        return [{ media, selectors: [compound] }];
    const following = isRoot ? `${compound}:not([${MODE}])` : `:where(:root:not([${MODE}])) ${compound}:not([${MODE}])`;
    // The root has no ancestor root to inherit a preference from, so only its own attribute pins it.
    const [own, viaRoot] = pinnedSelectors(compound, mode);
    return [{ media: null, selectors: isRoot ? [own] : [own, viaRoot] }, { media, selectors: [following] }];
}
function modeBlocks(profile, compounds, mode, declarations) {
    const groups = compounds.flatMap((compound) => inMode(profile, compound, mode));
    const plain = groups.filter((group) => group.media === null).flatMap((group) => group.selectors);
    const rules = plain.length > 0 ? [block(plain.join(", "), declarations)] : [];
    for (const media of new Set(groups.flatMap((group) => (group.media === null ? [] : [group.media])))) {
        const selectors = groups.filter((group) => group.media === media).flatMap((group) => group.selectors);
        rules.push(`  @media ${media} {\n${block(selectors.join(", "), declarations, "    ")}\n  }`);
    }
    return rules;
}
function usedGaps(recipes) {
    const tokens = new Set();
    const visit = (value) => {
        if (value === null || typeof value !== "object")
            return;
        const gap = "gap" in value ? value.gap : undefined;
        if (typeof gap === "string")
            tokens.add(gap);
        for (const child of Object.values(value))
            visit(child);
    };
    visit(recipes.roles);
    return [...tokens].sort();
}
function gapRules(profile, recipes, targets) {
    const { gaps } = targets;
    const tokens = usedGaps(recipes);
    if (tokens.length === 0)
        return [];
    const { root, region, adapted } = scopeCompounds(profile);
    const rules = ["light", "dark"].flatMap((mode) => {
        const values = tokens.map((token) => [gapProperty(profile.id, token), gaps[mode].get(token)]);
        return modeBlocks(profile, [root, region], mode, values);
    });
    if (targets.appearances.includes(THEME_APPEARANCE)) {
        rules.push(block(adapted, tokens.map((token) => [gapProperty(profile.id, token), `var(--${token})`])));
    }
    return rules;
}
function overrideRules(profile, recipes, compiled) {
    var _a;
    var _b;
    const { root, region } = scopeCompounds(profile);
    const overrides = (_b = (_a = recipes.accessibility) === null || _a === void 0 ? void 0 : _a.overrides) !== null && _b !== void 0 ? _b : [];
    return overrides.flatMap((override) => {
        const brands = override.brands.filter((brand) => compiled.includes(brand));
        return brands.flatMap((brand) => {
            const brandAttribute = `[${DESIGN_BRAND_ATTRIBUTE}="${brand}"]`;
            const compounds = [root + brandAttribute, region + brandAttribute];
            return modeBlocks(profile, compounds, override.mode, [[`--${override.name}`, override.value]]);
        });
    });
}
/** The compound selecting `role`, optionally one variant or size, never a registry component (`data-slot`). */
function roleCompound(role, qualifier = {}) {
    const variant = qualifier.variant === undefined ? "" : `[${DESIGN_RECIPE_VARIANT_ATTRIBUTE}="${qualifier.variant}"]`;
    const size = qualifier.size === undefined ? "" : `[${DESIGN_RECIPE_SIZE_ATTRIBUTE}="${qualifier.size}"]`;
    return `[${DESIGN_RECIPE_ATTRIBUTE}="${role}"]${variant}${size}:not([${SLOT_ATTRIBUTE}])`;
}
/**
 * The scope root itself or any element below it. Both branches name `:scope`
 * explicitly: a selector that mentions `:scope` gets no implicit scope
 * anchor, and an unanchored branch would match outside the scope in Firefox.
 */
function scoped(compound, state) {
    const condition = state === "rest" ? "" : STATE_SELECTORS[state];
    return `:where(:scope${compound}${condition}, :scope ${compound}${condition})`;
}
function declarations(profile, values) {
    return Object.entries(values !== null && values !== void 0 ? values : {})
        .map(([property, value]) => [property, cssValue(profile, value)]);
}
/** One role's rules in the fixed precedence order. */
function roleRules(profile, role, recipe) {
    var _a, _b;
    const rules = [];
    const push = (compound, state, values) => {
        const written = declarations(profile, values);
        if (written.length > 0)
            rules.push(block(scoped(compound, state), written, "    "));
    };
    for (const state of STATE_ORDER) {
        push(roleCompound(role), state, recipe.base[state]);
        for (const [variant, states] of Object.entries((_a = recipe.variants) !== null && _a !== void 0 ? _a : {})) {
            push(roleCompound(role, { variant }), state, states[state]);
        }
        if (state !== "rest")
            continue;
        for (const [size, values] of Object.entries((_b = recipe.sizes) !== null && _b !== void 0 ? _b : {}))
            push(roleCompound(role, { size }), "rest", values);
    }
    return rules;
}
/** The roles whose base or any variant styles the selected state. */
function rolesStylingSelected(recipes) {
    return Object.keys(recipes.roles).filter((role) => {
        var _a;
        const recipe = recipes.roles[role];
        return Object.values((_a = recipe.variants) !== null && _a !== void 0 ? _a : {}).concat(recipe.base).some((states) => states.selected !== undefined);
    });
}
function forcedColourRules(recipes) {
    const selected = rolesStylingSelected(recipes);
    if (selected.length === 0)
        return [];
    const selectors = selected.map((role) => scoped(`${roleCompound(role)}:not(:focus-visible)`, "selected"));
    const outlined = block(selectors.join(", "), FORCED_SELECTED_OUTLINE, "      ");
    return [`    @media (forced-colors: active) {\n${outlined}\n    }`];
}
/** One role's adapted shape: the contract radius (capped when asked) and shadows, at rest and per state. */
function shapeRules(role, shape) {
    const tokenRadius = `var(--${shape.radius})`;
    const radius = shape.maxRadius === undefined ? tokenRadius : `min(${tokenRadius}, ${shape.maxRadius})`;
    const shadows = [
        ["rest", shape.shadow], ["hover", shape.hoverShadow], ["active", shape.activeShadow],
    ];
    const rules = [];
    for (const [state, shadow] of shadows) {
        const declared = state === "rest" && shape.radius !== undefined ? [["border-radius", radius]] : [];
        if (shadow !== undefined)
            declared.push(["box-shadow", `var(--${shadow})`]);
        if (declared.length > 0)
            rules.push(block(scoped(roleCompound(role), state), declared, "    "));
    }
    return rules;
}
function adaptedRules(recipes) {
    return Object.entries(recipes.roles)
        .flatMap(([role, recipe]) => (recipe.adapted === undefined ? [] : shapeRules(role, recipe.adapted)));
}
/** The recipes' layer block, for the given appearances and compiled brands. */
export function emitRecipes(profile, recipes, targets) {
    const themed = targets.appearances.includes(THEME_APPEARANCE);
    const { root, region, adapted } = scopeCompounds(profile);
    const roots = themed ? [root, region, adapted] : [root, region];
    const boundary = `[${DESIGN_SYSTEM_ATTRIBUTE}]`;
    const body = Object.entries(recipes.roles)
        .flatMap(([role, recipe]) => roleRules(profile, role, recipe));
    const scopedRules = [...body, ...forcedColourRules(recipes)].join("\n");
    const rules = [
        ...gapRules(profile, recipes, targets),
        ...overrideRules(profile, recipes, targets.compiled),
        `  @scope (${roots.join(", ")}) to (${boundary}) {\n${scopedRules}\n  }`,
    ];
    const shapes = themed ? adaptedRules(recipes) : [];
    if (shapes.length > 0)
        rules.push(`  @scope (${adapted}) to (${boundary}) {\n${shapes.join("\n")}\n  }`);
    return `@layer ${BRIDGE_LAYER} {\n${rules.join("\n")}\n}\n`;
}
