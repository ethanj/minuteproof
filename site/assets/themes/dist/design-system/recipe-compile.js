/**
 * The compiler's recipe step: optional, after the profile's own work.
 *
 * Given one recipe document, or a shipped one and a consumer's extending it,
 * it validates (and merges) them against the profile, measures every recipe
 * combination natively per compiled brand and mode (with the accessibility
 * overrides applied) and, when the theme appearance is compiled in, per
 * canonical theme and scheme, measures what each override changes in the
 * profile's own pairs, and only then writes the recipe layer block. The
 * profile's native ledger is never altered by an override: the brand's own
 * measurements and exceptions stay what they are.
 */
import { FAMILY_THEME_STATES, THEME_SCHEMES } from "./adaptation.js";
import { adaptedValues } from "./contrast.js";
import { resolvedScope } from "./read-values.js";
import { measureOverrides, measureRecipes, } from "./recipe-contrast.js";
import { emitRecipes } from "./recipe-emit.js";
import { DESIGN_RECIPE_ATTRIBUTE, DESIGN_RECIPE_SIZE_ATTRIBUTE, DESIGN_RECIPE_VARIANT_ATTRIBUTE, } from "./recipe-types.js";
import { mergeRecipes, recipeError, validateRecipes } from "./recipe-validate.js";
import { THEME_APPEARANCE } from "./types.js";
function parse(text, index) {
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw recipeError(`document ${index + 1} is not JSON: ${error.message}`);
    }
}
/** The one document to compile: a shipped one, or a consumer's merged onto the shipped one it extends. */
function documentOf(profile, parsed) {
    if (parsed.length === 2)
        return mergeRecipes(parsed[0], parsed[1], profile);
    if (parsed.length !== 1)
        throw recipeError("give one recipe document, or a shipped one and one that extends it");
    const document = validateRecipes(parsed[0], profile);
    if (document.extends !== undefined) {
        throw recipeError(`these recipes extend "${document.extends}"; give that shipped document too`);
    }
    return document;
}
/** The two appearance lists recipes may be compiled for. */
const APPEARANCE_LISTS = [["native"], ["native", THEME_APPEARANCE]];
function checkAppearances(profile, appearances) {
    const isAllowed = APPEARANCE_LISTS.some((list) => list.length === appearances.length && list.every((entry, index) => entry === appearances[index]));
    if (!isAllowed)
        throw recipeError('recipe appearances are ["native"] or ["native", "theme"]');
    if (appearances.includes(THEME_APPEARANCE) && profile.adaptation === undefined) {
        throw recipeError(`${profile.id} has no adaptation, so recipes cannot apply to the theme appearance`);
    }
    return [...appearances];
}
function applies(override, { brand, mode }) {
    return override.mode === mode && override.brands.includes(brand);
}
function overriddenValues(overrides, target, raw) {
    const values = new Map(raw);
    for (const override of overrides)
        if (applies(override, target))
            values.set(override.name, override.value);
    return values;
}
/** Each override applied alone in one brand and mode, so the pairs it changes are attributed to it only. */
function measureIsolated(profile, overrides, target, raw) {
    const where = `brand ${target.brand} (${target.mode})`;
    const before = resolvedScope(raw, profile.constants, where);
    return overrides.filter((entry) => applies(entry, target)).map((override) => {
        const alone = resolvedScope(overriddenValues([override], target, raw), profile.constants, where);
        return [override, measureOverrides(profile, { ...target, before, after: alone })];
    });
}
function nativeContexts(profile, document, brands, gaps) {
    var _a;
    var _b;
    const overrides = (_b = (_a = document.accessibility) === null || _a === void 0 ? void 0 : _a.overrides) !== null && _b !== void 0 ? _b : [];
    const isolated = new Map(overrides.map((override) => [override, []]));
    const measured = { contexts: [], isolated, combined: [] };
    for (const [brand, values] of Object.entries(brands)) {
        for (const mode of ["light", "dark"]) {
            const target = { brand, mode };
            const where = `brand ${brand} (${mode})`;
            const before = resolvedScope(values[mode], profile.constants, where);
            const after = resolvedScope(overriddenValues(overrides, target, values[mode]), profile.constants, where);
            for (const [override, changed] of measureIsolated(profile, overrides, target, values[mode])) {
                measured.isolated.get(override).push(...changed);
            }
            measured.combined.push(...measureOverrides(profile, { ...target, before, after }));
            measured.contexts.push({ context: target, values: { names: after, gap: (token) => gaps[mode].get(token) } });
        }
    }
    return measured;
}
/** The canonical theme states measured: each theme's schemes, then the family states when asked for. */
export function adaptedStates(themeFamilies) {
    const canonical = Object.entries(THEME_SCHEMES)
        .flatMap(([theme, schemes]) => schemes.map((scheme) => ({ theme, scheme })));
    return themeFamilies ? [...canonical, ...FAMILY_THEME_STATES] : canonical;
}
function adaptedContexts(profile, context) {
    return adaptedStates(context.themeFamilies).map((state) => {
        const contract = context.contractOf(state.theme, state.scheme, state.os);
        const values = { names: adaptedValues(profile, contract), gap: (token) => contract.get(token) };
        return { context: state, values };
    });
}
/** The manifest's record of the documents compiled (each parsed once, digested from its text) and of the roles. */
function recipeManifestOf(document, input, parsed, context) {
    return {
        documents: parsed.map((entry, index) => ({
            id: entry.id,
            version: entry.version,
            sha256: context.digest(input.documents[index]),
            provenance: entry.provenance,
        })),
        attributes: {
            recipe: DESIGN_RECIPE_ATTRIBUTE, variant: DESIGN_RECIPE_VARIANT_ATTRIBUTE, size: DESIGN_RECIPE_SIZE_ATTRIBUTE,
        },
        roles: Object.fromEntries(Object.entries(document.roles).map(([role, recipe]) => { var _a, _b; return [role, { variants: Object.keys((_a = recipe.variants) !== null && _a !== void 0 ? _a : {}), sizes: Object.keys((_b = recipe.sizes) !== null && _b !== void 0 ? _b : {}) }]; })),
    };
}
/** Validate, measure and write the recipes. Throws, naming the problem, before anything is returned. */
export function compileRecipes(profile, input, context) {
    const parsed = input.documents.map(parse);
    const document = documentOf(profile, parsed);
    const appearances = checkAppearances(profile, input.appearances);
    const native = nativeContexts(profile, document, context.brands, context.gaps);
    const contexts = appearances.includes(THEME_APPEARANCE)
        ? [...native.contexts, ...adaptedContexts(profile, context)]
        : native.contexts;
    const contrast = measureRecipes(profile, document, contexts);
    const isolated = [...native.isolated].map(([override, changed]) => ({ ...override, changed }));
    const compiled = Object.keys(context.brands);
    const css = emitRecipes(profile, document, { appearances, gaps: context.gaps, compiled });
    const { documents, attributes, roles } = recipeManifestOf(document, input, parsed, context);
    return {
        css,
        manifest: { documents, appearances, attributes, roles },
        ledger: { contrast, overrides: { isolated, combined: native.combined } },
    };
}
