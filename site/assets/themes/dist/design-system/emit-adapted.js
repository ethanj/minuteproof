/**
 * Writing the theme appearance's rules, appended to the scope layer.
 *
 * They stay inside the existing scope layer, so the consumer's layer order
 * is unchanged, and they are written after the brand and region rules. There
 * are two parts:
 *
 * - The adapted scope element, `[system][appearance=theme]`, on any element
 *   except a root whose theme is `product`. Vocabulary and listed properties
 *   are defined from contract tokens. A contract-token constant (Strata's
 *   `--font-mono`) takes the root's own value of that token, snapshotted on
 *   `:root`, so an adapted scope below a native one (where the constant is
 *   in force) still follows the theme. On the root the snapshot reads the
 *   winning declaration of the package's layer or the bridge, never the
 *   adaptation, so it forms no cycle. The selector's specificity (0,4,0) is above
 *   every brand and mode rule (at most (0,3,0)), so source order inside the
 *   layer never decides. On a `product` root the bound bridge defines
 *   contract tokens from the vocabulary. Leaving that element out is what
 *   keeps the two directions from meeting on one element, where they would
 *   form a cycle.
 * - The component adapter: an `@scope` from each adapted scope element to the
 *   next element carrying any design system. Inside it, each listed
 *   `data-slot` takes the theme's radius and shadows, and forced framework
 *   properties. The lower boundary is exclusive, so a nested region of any
 *   system or appearance, native or adapted, is never reached. A nested
 *   adapted region is its own scope root again. A portaled popup carrying
 *   the attributes is a scope root itself and matches through `:scope`.
 *   Outside every adapted scope these rules do not apply at all, so native
 *   components are untouched.
 *
 * Selectors are built only from validated slugs.
 */
import { contractSnapshot } from "./adaptation.js";
import { adaptedSelector, block, customDeclarations, scopeValue, SLOT_ATTRIBUTE, systemSelector, VARIANT_ATTRIBUTE, } from "./css-writer.js";
import { DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, THEME_APPEARANCE, } from "./types.js";
/** Scope values as custom-property declarations, each followed by `suffix` (` !important` for forced properties). */
function scopeDeclarations(values, suffix = "") {
    return customDeclarations(Object.entries(values).map(([name, value]) => [name, scopeValue(value) + suffix]));
}
/** A slot's declarations at rest: its radius, shadow, forced properties and forced surface. */
function restDeclarations(slot) {
    var _a;
    const rest = [];
    if (slot.radius !== undefined) {
        const radius = `var(--${slot.radius})`;
        rest.push(["border-radius", slot.maxRadius === undefined ? radius : `min(${radius}, ${slot.maxRadius})`]);
    }
    if (slot.shadow !== undefined)
        rest.push(["box-shadow", `var(--${slot.shadow})`]);
    rest.push(...scopeDeclarations((_a = slot.properties) !== null && _a !== void 0 ? _a : {}, " !important"));
    if (slot.surface !== undefined) {
        const fill = `var(--${slot.surface.fill})`;
        rest.push(["background-color", `var(--${slot.surface.over}) !important`], ["background-image", `linear-gradient(${fill}, ${fill})`]);
    }
    return rest;
}
function slotBlocks(name, slot) {
    var _a;
    const slotted = `[${SLOT_ATTRIBUTE}="${name}"]`;
    const element = (state) => `:scope${slotted}${state}, ${slotted}${state}`;
    const rest = restDeclarations(slot);
    const blocks = rest.length > 0 ? [block(element(""), rest, "    ")] : [];
    for (const [variant, { hoverFill }] of Object.entries((_a = slot.variants) !== null && _a !== void 0 ? _a : {})) {
        const hovered = element(`[${VARIANT_ATTRIBUTE}="${variant}"]:hover`);
        blocks.push(block(hovered, [["background-color", `var(--${hoverFill.ref}) !important`]], "    "));
    }
    if (slot.hoverShadow !== undefined) {
        blocks.push(block(element(":hover"), [["box-shadow", `var(--${slot.hoverShadow})`]], "    "));
    }
    if (slot.activeShadow !== undefined) {
        blocks.push(block(element(":active"), [["box-shadow", `var(--${slot.activeShadow})`]], "    "));
    }
    return blocks;
}
/** The theme appearance's rules for the scope layer; empty when the profile has no adaptation. */
export function emitAdapted(profile) {
    const adaptation = profile.adaptation;
    if (adaptation === undefined)
        return [];
    const values = [
        ...scopeDeclarations(adaptation.values),
        ...profile.overridesContract.map((name) => [`--${name}`, `var(${contractSnapshot(profile, name)})`]),
        ...scopeDeclarations(adaptation.properties),
    ];
    const scope = adaptedSelector(profile);
    const snapshots = profile.overridesContract
        .map((name) => [contractSnapshot(profile, name), `var(--${name})`]);
    const adaptedRegion = `${systemSelector(profile)}[${DESIGN_APPEARANCE_ATTRIBUTE}="${THEME_APPEARANCE}"]:not(:root)`;
    const rules = [
        ...(snapshots.length > 0 ? [block(":root", snapshots)] : []),
        block(scope, values),
        block(adaptedRegion, [["color-scheme", "inherit"]]),
    ];
    const slots = Object.entries(adaptation.slots).flatMap(([name, slot]) => slotBlocks(name, slot));
    if (slots.length > 0)
        rules.push(`  @scope (${scope}) to ([${DESIGN_SYSTEM_ATTRIBUTE}]) {\n${slots.join("\n")}\n  }`);
    return rules;
}
