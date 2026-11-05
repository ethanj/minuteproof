/**
 * The design-system compiler: a profile plus its brands' value files in,
 * one stylesheet and one manifest out.
 *
 * Pure apart from hashing: callers hand in file text (see `node.ts` for the
 * file-system wrapper and the CLI). Order of work: the profile is validated,
 * every supplied file's SHA-256 is compared with the profile's pin before it
 * is parsed (no fallback on drift), each brand is read and resolved per mode,
 * contrast is judged, gaps are filled from the package's own canonical maps,
 * and only then is anything emitted. Any failure throws and nothing is
 * returned.
 */
import { createHash } from "node:crypto";
import { cascadeTokens, parseTokenRules, resolveTokens } from "../checks/css.js";
import { TOKEN_NAMES } from "../tokens.js";
import { checkAdaptedFills, measureAdapted, measureBrand, } from "./contrast.js";
import { emitBridge, emitScope } from "./emit.js";
import { readBrandValues, resolvedScope } from "./read-values.js";
import { adaptedStates, compileRecipes, } from "./recipe-compile.js";
import { profileError, validateProfile } from "./validate.js";
import { brandOf, DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, DESIGN_SYSTEM_LAYERS, MANIFEST_SCHEMA, THEME_APPEARANCE, } from "./types.js";
/** The SHA-256 of `text`'s UTF-8 bytes, as lowercase hex: how brand files are pinned and outputs digested. */
export function sha256(text) {
    return createHash("sha256").update(text, "utf8").digest("hex");
}
function verifiedBrands(profile, files) {
    const ids = Object.keys(files);
    if (ids.length === 0)
        throw profileError("compile needs at least one brand's value file");
    const brands = {};
    for (const id of ids) {
        const pin = brandOf(profile, id);
        if (pin === undefined) {
            throw profileError(`unknown brand "${id}"; the profile has ${Object.keys(profile.brands).join(", ")}`);
        }
        const digest = sha256(files[id]);
        if (digest !== pin.sha256) {
            throw profileError(`brand ${id}: ${pin.file} has SHA-256 ${digest}, but the profile pins ${pin.sha256}`);
        }
        brands[id] = readBrandValues(profile, id, files[id]);
    }
    return brands;
}
function gapValues(profile, rules) {
    const gaps = { light: new Map(), dark: new Map() };
    for (const token of TOKEN_NAMES) {
        const value = profile.bridge[token];
        if (!("gap" in value))
            continue;
        for (const mode of ["light", "dark"]) {
            const resolved = resolveTokens(cascadeTokens(rules, value.gap.fill, mode)).get(token);
            if (resolved === undefined)
                throw profileError(`gap --${token}: ${value.gap.fill} defines no value in ${mode}`);
            gaps[mode].set(token, resolved);
        }
    }
    return gaps;
}
function measureAll(profile, brands) {
    return Object.entries(brands).flatMap(([brand, values]) => ["light", "dark"].flatMap((mode) => measureBrand(profile, brand, mode, resolvedScope(values[mode], profile.constants, `brand ${brand} (${mode})`))));
}
/**
 * Each canonical theme's resolved contract tokens per scheme, resolved on
 * first use and then shared: the theme appearance's contrast and the
 * recipes' adapted contexts read the same maps, in the order they first ask.
 */
function canonicalContracts(rules) {
    const resolved = new Map();
    return (theme, scheme, os) => {
        const key = `${theme} ${scheme} ${os !== null && os !== void 0 ? os : ""}`;
        const tokens = () => os === undefined
            ? cascadeTokens(rules, theme, scheme)
            : cascadeTokens(rules, theme, os, scheme);
        if (!resolved.has(key))
            resolved.set(key, resolveTokens(tokens()));
        return resolved.get(key);
    };
}
function measureAllAdapted(profile, contractOf, themeFamilies) {
    return adaptedStates(themeFamilies).flatMap(({ theme, scheme, os }) => {
        const contract = contractOf(theme, scheme, os);
        checkAdaptedFills(profile, theme, scheme, contract);
        return measureAdapted(profile, theme, scheme, contract, os);
    });
}
/**
 * The recipe documents' digests and appearances, as a header line; empty
 * without recipes, so older output is unchanged.
 */
function recipesLine(input) {
    var _a;
    const inRecipes = ((_a = input.recipes) === null || _a === void 0 ? void 0 : _a.appearances.includes(THEME_APPEARANCE)) === true ? " and in adapted recipes" : "";
    const families = input.themeFamilies === true
        ? `   Theme families measured under the theme appearance${inRecipes}: Clay Dark, and Minimal Light and Dark`
            + " pinned against the system.\n"
        : "";
    if (input.recipes === undefined)
        return families;
    const { documents, appearances } = input.recipes;
    return `${families}   Recipes ${documents.map(sha256).join(", ")} for ${appearances.join(" and ")}.\n`;
}
function header(profile, input) {
    const { source } = profile;
    const origin = source.repository === undefined ? source.kind : `${source.repository}@${source.commit}`;
    const files = Object.keys(input.brandFiles).map((brand) => `${brand} ${profile.brands[brand].sha256}`).join("; ");
    const generator = `${input.generator.package} ${input.generator.version}`;
    return `/* Generated by ${generator} from design-system profile ${profile.id} ${profile.version}.\n`
        + `   Source ${origin}; brand files ${files}.\n${recipesLine(input)}`
        + `   Layers in order: ${DESIGN_SYSTEM_LAYERS.join(", ")}. Do not edit; regenerate. */\n`;
}
function manifestOf(profile, input, css) {
    const compiled = Object.keys(input.brandFiles);
    const pinOf = (brand) => {
        const pin = profile.brands[brand];
        return { file: pin.file, sha256: pin.sha256 };
    };
    return {
        schema: MANIFEST_SCHEMA, id: profile.id, profileVersion: profile.version, label: profile.label,
        brands: Object.fromEntries(compiled.map((brand) => [brand, profile.brands[brand].label])),
        modes: profile.modes,
        appearances: profile.adaptation === undefined ? ["native"] : ["native", "theme"],
        attributes: {
            system: DESIGN_SYSTEM_ATTRIBUTE, brand: DESIGN_BRAND_ATTRIBUTE, mode: DESIGN_MODE_ATTRIBUTE,
            appearance: DESIGN_APPEARANCE_ATTRIBUTE,
        },
        layers: DESIGN_SYSTEM_LAYERS, productSlot: input.bindProductSlot, source: profile.source,
        files: Object.fromEntries(compiled.map((brand) => [brand, pinOf(brand)])),
        cssSha256: sha256(css), generator: input.generator,
    };
}
function gapEntries(profile, gaps) {
    return TOKEN_NAMES.flatMap((token) => {
        const value = profile.bridge[token];
        if (!("gap" in value))
            return [];
        const values = { light: gaps.light.get(token), dark: gaps.dark.get(token) };
        return [{ token, fill: value.gap.fill, reason: value.reason, values }];
    });
}
function ledgerOf(profile, css, measured) {
    const ledger = {
        id: profile.id, profileVersion: profile.version, cssSha256: sha256(css),
        gaps: gapEntries(profile, measured.gaps),
        overridesContract: profile.overridesContract, contrast: measured.contrast,
    };
    if (measured.adapted !== undefined)
        ledger.adaptedContrast = measured.adapted;
    return ledger;
}
/** Compile a profile. Throws, naming the problem, on any invalid input; returns nothing partial. */
export function compileDesignSystem(input) {
    var _a;
    const profile = validateProfile(input.profile);
    if (input.themeFamilies === true && profile.adaptation === undefined) {
        throw profileError("themeFamilies measures the theme appearance, and this profile has no adaptation");
    }
    const brands = verifiedBrands(profile, input.brandFiles);
    const contrast = measureAll(profile, brands);
    const canonicalRules = parseTokenRules(input.canonicalCss);
    const contractOf = canonicalContracts(canonicalRules);
    const themeFamilies = input.themeFamilies === true;
    const adapted = profile.adaptation === undefined ? undefined : measureAllAdapted(profile, contractOf, themeFamilies);
    const gaps = gapValues(profile, canonicalRules);
    const bridge = input.bindProductSlot ? emitBridge(profile, gaps, brands) : "";
    const recipes = input.recipes === undefined
        ? undefined
        : compileRecipes(profile, input.recipes, { brands, gaps, contractOf, digest: sha256, themeFamilies });
    const css = header(profile, input) + emitScope(profile, brands) + bridge + ((_a = recipes === null || recipes === void 0 ? void 0 : recipes.css) !== null && _a !== void 0 ? _a : "");
    const output = {
        css, manifest: manifestOf(profile, input, css), ledger: ledgerOf(profile, css, { gaps, contrast, adapted }),
    };
    if (recipes !== undefined) {
        output.manifest.recipes = recipes.manifest;
        output.ledger.recipes = recipes.ledger;
    }
    return output;
}
