/**
 * Writing the compiled stylesheet.
 *
 * Two cascade layers, whose order relative to the package's own layer is the
 * whole integration contract (`DESIGN_SYSTEM_LAYERS`):
 *
 * - `atomicstrata-design-system`, before the package: the system's values on
 *   every element that carries its attributes (the root, a region, or a
 *   portaled popup), plus region styles that paint the region's own surface,
 *   ink, type and colour scheme. Being early, it loses on the root to the
 *   theme in force and to any framework component or utility, which is what
 *   lets an inverted tooltip keep its own surface.
 * - `atomicstrata-design-system-bridge`, after the package: contract tokens
 *   for the consumer's `product` id, only on a root that carries both the
 *   product id and the system. Being late, it beats the package's `:root`
 *   defaults; in an earlier layer it would lose to them.
 *
 * A profile whose `os` policy is `explicit` also gets, per brand, region and
 * bound root, one rule per mode pinned by `data-design-mode` on the element
 * or, failing that, on the root (`pinnedSelector`): values, colour scheme and
 * gap fills move together. Without `explicit` nothing extra is written.
 *
 * The bridge layer also paints product palette previews
 * (`productPreviewRules`): an element marked `data-theme-preview` with
 * `data-theme="product"` and a `data-theme-scheme`, below a root bound to
 * the system, takes the root brand's native values in that scheme and the
 * bridge's contract tokens from them. The appearance switch marks its
 * previews so. Nothing on the root changes: the bridge on a `product` root
 * stays the only application of the contract from the vocabulary, the one
 * that styles a page. A preview rule repeats the same declarations on a
 * decorative swatch only, whose values reach nothing but its own
 * descendants.
 *
 * Selectors are built only from validated slugs, so no value can escape its
 * attribute selector.
 */
import { TOKEN_NAMES } from "../tokens.js";
import { block, customDeclarations as custom, productPreviewSelector, productRootSelector, scopeValue, systemSelector, } from "./css-writer.js";
import { emitAdapted } from "./emit-adapted.js";
import { BRIDGE_LAYER, DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, SCOPE_LAYER, THEME_APPEARANCE, } from "./types.js";
const DARK_MEDIA = "@media (prefers-color-scheme: dark)";
/**
 * The mode a plain selector stands for, and the other mode, which is either
 * the OS's dark scheme or a mode attribute.
 */
function modeOrder(profile) {
    const first = profile.modes.policy === "attribute" ? profile.modes.default : "light";
    return [first, first === "light" ? "dark" : "light"];
}
/** Wrap rules for the second mode: inside the dark-scheme media query, or under the mode attribute. */
function secondMode(profile, selector, declarations, other) {
    if (profile.modes.policy === "os")
        return `  ${DARK_MEDIA} {\n${block(selector, declarations, "    ")}\n  }`;
    return block(`${selector}[${DESIGN_MODE_ATTRIBUTE}="${other}"]`, declarations, "  ");
}
/** Whether `data-design-mode` may pin an `os` system's mode. */
export function explicitModes(profile) {
    return profile.modes.policy === "os" && profile.modes.explicit === true;
}
/**
 * The two selectors for `selector` pinned to `mode`: by its own attribute,
 * and, without one, by the root's preference. Both are one attribute above
 * `selector`, so they beat the media-query rule of the other mode and stay
 * below the theme appearance's adapted scope.
 */
export function pinnedSelectors(selector, mode) {
    const attribute = `[${DESIGN_MODE_ATTRIBUTE}="${mode}"]`;
    return [`${selector}${attribute}`, `:where(:root${attribute}) ${selector}:not([${DESIGN_MODE_ATTRIBUTE}])`];
}
/** `pinnedSelectors` as one selector list. */
export function pinnedSelector(selector, mode) {
    return pinnedSelectors(selector, mode).join(", ");
}
/** For explicit-mode systems, one rule per mode; otherwise nothing. */
function pinnedRules(profile, selector, declarations) {
    if (!explicitModes(profile))
        return [];
    return ["light", "dark"].map((mode) => block(pinnedSelector(selector, mode), declarations(mode), "  "));
}
function regionRules(profile, first, other) {
    const region = `${systemSelector(profile)}:not(:root)`;
    const scheme = profile.modes.policy === "os" ? "light dark" : first;
    const styles = [["color-scheme", scheme]];
    for (const [property, value] of Object.entries(profile.scope)) {
        styles.push([property === "background" ? "background-color" : property, scopeValue(value)]);
    }
    const rules = [block(region, styles, "  ")];
    if (profile.modes.policy === "attribute") {
        rules.push(block(`${region}[${DESIGN_MODE_ATTRIBUTE}="${other}"]`, [["color-scheme", other]], "  "));
    }
    const nativeRegion = `${region}:not([${DESIGN_APPEARANCE_ATTRIBUTE}="${THEME_APPEARANCE}"])`;
    rules.push(...pinnedRules(profile, nativeRegion, (mode) => [["color-scheme", mode]]));
    return rules;
}
/**
 * The scope layer: constants, each brand's values in both modes, region
 * styles, then the theme appearance (`emit-adapted.ts`).
 */
export function emitScope(profile, brands) {
    const [first, other] = modeOrder(profile);
    const system = systemSelector(profile);
    const rules = [];
    if (Object.keys(profile.constants).length > 0) {
        rules.push(block(system, custom(Object.entries(profile.constants)), "  "));
    }
    for (const [brand, values] of Object.entries(brands)) {
        const selector = `${system}[${DESIGN_BRAND_ATTRIBUTE}="${brand}"]`;
        rules.push(block(selector, custom(values[first]), "  "));
        rules.push(secondMode(profile, selector, custom(values[other]), other));
        rules.push(...pinnedRules(profile, selector, (mode) => custom(values[mode])));
    }
    rules.push(...regionRules(profile, first, other), ...emitAdapted(profile));
    return `@layer ${SCOPE_LAYER} {\n${rules.join("\n")}\n}\n`;
}
function bridgeDeclarations(profile, gaps, mode) {
    return TOKEN_NAMES.map((token) => {
        const value = profile.bridge[token];
        return [`--${token}`, "gap" in value ? gaps[mode].get(token) : scopeValue(value)];
    });
}
function gapDeclarations(profile, gaps, mode) {
    return TOKEN_NAMES.filter((token) => "gap" in profile.bridge[token])
        .map((token) => [`--${token}`, gaps[mode].get(token)]);
}
/**
 * One rule per compiled brand and mode for product palette previews below a
 * root carrying that brand: colour scheme, constants, the brand's values in
 * the preview's scheme, then the bridge's contract tokens. They are set on
 * the preview itself, so nothing it would inherit from the root (the theme
 * in force, or the adapted vocabulary) shows through.
 */
function productPreviewRules(profile, gaps, brands) {
    return Object.entries(brands).flatMap(([brand, values]) => ["light", "dark"].map((mode) => {
        const declarations = [
            ["color-scheme", mode], ...custom(Object.entries(profile.constants)), ...custom(values[mode]),
            ...bridgeDeclarations(profile, gaps, mode),
        ];
        return block(productPreviewSelector(profile, brand, mode), declarations, "  ");
    }));
}
/**
 * The bridge layer: contract tokens for the bound product id, with gap
 * values per mode, then the product palette previews.
 */
export function emitBridge(profile, gaps, brands) {
    const [first, other] = modeOrder(profile);
    const root = productRootSelector(profile);
    const scheme = profile.modes.policy === "os" ? "light dark" : first;
    const rules = [block(root, [["color-scheme", scheme], ...bridgeDeclarations(profile, gaps, first)], "  ")];
    const otherGaps = gapDeclarations(profile, gaps, other);
    const otherDeclarations = profile.modes.policy === "os" ? otherGaps : [["color-scheme", other], ...otherGaps];
    if (otherDeclarations.length > 0)
        rules.push(secondMode(profile, root, otherDeclarations, other));
    if (explicitModes(profile)) {
        for (const mode of ["light", "dark"]) {
            const declarations = [["color-scheme", mode], ...gapDeclarations(profile, gaps, mode)];
            rules.push(block(`${root}[${DESIGN_MODE_ATTRIBUTE}="${mode}"]`, declarations, "  "));
        }
    }
    rules.push(...productPreviewRules(profile, gaps, brands));
    return `@layer ${BRIDGE_LAYER} {\n${rules.join("\n")}\n}\n`;
}
