/**
 * Runtime of the design-system integration (`@atomicstrata/themes/design-system`).
 *
 * Selecting a design system is markup, not a preference: attributes on the
 * root or on a region say which system, which brand, (for systems whose
 * profile chooses `attribute` mode, or `os` mode with `explicit`) which colour mode, and (for systems
 * compiled with an adaptation) whether its components take the canonical
 * theme's appearance instead of their native one. Nothing
 * here reads or writes storage, touches `data-theme` or the theme controller,
 * or loads CSS. The compiled stylesheet does the rest.
 *
 * `recipeAttributes` returns the opt-in attributes of a component appearance
 * recipe (`data-design-recipe` and, optionally, its variant and size),
 * checked against a manifest compiled with recipes.
 *
 * `designSystemAttributes` returns the attributes as a plain object, checked
 * against a profile or compiled manifest, for spreading onto elements a
 * framework renders elsewhere (portaled popups). `applyDesignSystemScope`
 * sets them on an element and returns a function that restores what was
 * there.
 *
 * `productModesOf` states what a system bound to the `product` id can show,
 * as the theme families' `productModes` (`family-core.ts`).
 *
 * Under the theme appearance the brand (and mode) are optional on a region:
 * they give the native values the system keeps on a root whose theme is
 * `product`, where the bound bridge reads them. On the document root they
 * are therefore required, and `applyDesignSystemScope` refuses a root
 * without one. Everywhere else the components follow the theme in force.
 */
import { DESIGN_RECIPE_ATTRIBUTE, DESIGN_RECIPE_SIZE_ATTRIBUTE, DESIGN_RECIPE_VARIANT_ATTRIBUTE, } from "./recipe-types.js";
import { DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, takesThemeAppearance, THEME_APPEARANCE, } from "./types.js";
export { BRIDGE_LAYER, CORE_LAYER, DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, DESIGN_SYSTEM_LAYERS, SCOPE_LAYER, THEME_APPEARANCE, } from "./types.js";
export { DESIGN_RECIPE_ATTRIBUTE, DESIGN_RECIPE_SIZE_ATTRIBUTE, DESIGN_RECIPE_VARIANT_ATTRIBUTE, RECIPE_ROLES, } from "./recipe-types.js";
function selectionError(message) {
    return new Error("@atomicstrata/themes: invalid design-system selection: " + message);
}
function appearanceAttributes(system, appearance) {
    const attributes = { [DESIGN_SYSTEM_ATTRIBUTE]: system.id };
    if (appearance === undefined || appearance === "native")
        return attributes;
    if (appearance !== THEME_APPEARANCE) {
        throw selectionError(`appearance must be "native" or "theme", not "${String(appearance)}"`);
    }
    if (!takesThemeAppearance(system)) {
        throw selectionError(`${system.id} was compiled without an adaptation and takes only the native appearance`);
    }
    attributes[DESIGN_APPEARANCE_ATTRIBUTE] = THEME_APPEARANCE;
    return attributes;
}
/**
 * The attributes selecting `selection` in `system`. Throws on an unknown
 * brand, a missing native brand, or a mode or appearance the system does not
 * take.
 */
export function designSystemAttributes(system, selection) {
    var _a;
    const attributes = appearanceAttributes(system, selection.appearance);
    if (selection.brand === undefined) {
        if (attributes[DESIGN_APPEARANCE_ATTRIBUTE] === undefined) {
            throw selectionError(`the native appearance of ${system.id} needs a brand`);
        }
        if (selection.mode !== undefined)
            throw selectionError("a mode applies to a brand; give the brand too");
        return Object.freeze(attributes);
    }
    if (!Object.prototype.hasOwnProperty.call(system.brands, selection.brand)) {
        const offered = Object.keys(system.brands).join(", ");
        throw selectionError(`"${selection.brand}" is not a brand of ${system.id}; it has ${offered}`);
    }
    attributes[DESIGN_BRAND_ATTRIBUTE] = selection.brand;
    if (system.modes.policy === "os") {
        // Without a mode an `os` system follows the root's preference, then the OS; only an explicit one takes a mode.
        if (selection.mode === undefined)
            return Object.freeze(attributes);
        if (system.modes.explicit !== true) {
            throw selectionError(`${system.id} follows the operating system's colour scheme and takes no mode`);
        }
    }
    const mode = (_a = selection.mode) !== null && _a !== void 0 ? _a : system.modes.default;
    if (mode !== "light" && mode !== "dark") {
        throw selectionError(`mode must be "light" or "dark", not "${String(mode)}"`);
    }
    attributes[DESIGN_MODE_ATTRIBUTE] = mode;
    return Object.freeze(attributes);
}
/** Stamp the selection on `element`. The returned function restores the four attributes as they were. */
export function applyDesignSystemScope(element, system, selection) {
    var _a;
    const attributes = designSystemAttributes(system, selection);
    const isRoot = ((_a = element.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === element;
    const isBrandlessTheme = attributes[DESIGN_APPEARANCE_ATTRIBUTE] !== undefined && attributes[DESIGN_BRAND_ATTRIBUTE] === undefined;
    if (isRoot && isBrandlessTheme) {
        throw selectionError("the theme appearance on the document root needs a brand: "
            + `under the product id the root is native ${system.id}, read from that brand`);
    }
    const names = [DESIGN_SYSTEM_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_APPEARANCE_ATTRIBUTE];
    const before = names.map((name) => [name, element.getAttribute(name)]);
    for (const name of names) {
        const value = attributes[name];
        if (value === undefined)
            element.removeAttribute(name);
        else
            element.setAttribute(name, value);
    }
    return function release() {
        for (const [name, value] of before) {
            if (value === null)
                element.removeAttribute(name);
            else
                element.setAttribute(name, value);
        }
    };
}
/**
 * The opt-in attributes for one recipe role, checked against a manifest
 * compiled with recipes. Throws on an unknown role, variant or size.
 */
export function recipeAttributes(system, role, selection = {}) {
    var _a;
    const roles = (_a = system.recipes) === null || _a === void 0 ? void 0 : _a.roles;
    if (roles === undefined)
        throw selectionError(`${system.id} was compiled without recipes`);
    if (!Object.prototype.hasOwnProperty.call(roles, role)) {
        throw selectionError(`"${role}" is not a recipe role of ${system.id}; it has ${Object.keys(roles).join(", ")}`);
    }
    const compiled = roles[role];
    const attributes = { [DESIGN_RECIPE_ATTRIBUTE]: role };
    const qualifiers = [
        {
            kind: "variant", value: selection.variant, offered: compiled.variants, attribute: DESIGN_RECIPE_VARIANT_ATTRIBUTE,
        },
        { kind: "size", value: selection.size, offered: compiled.sizes, attribute: DESIGN_RECIPE_SIZE_ATTRIBUTE },
    ];
    for (const { kind, value, offered, attribute } of qualifiers) {
        if (value === undefined)
            continue;
        if (!offered.includes(value)) {
            throw selectionError(`"${value}" is not a ${kind} of recipe ${role}; it has ${offered.join(", ") || "none"}`);
        }
        attributes[attribute] = value;
    }
    return Object.freeze(attributes);
}
/**
 * The modes a system can show when it is the product's palette, for
 * `families.productModes`:
 *
 * - `os` with `explicit`: System, Light and Dark.
 * - `os` alone: System only; it cannot be pinned.
 * - `attribute`: its default, then the other. It never follows the
 *   operating system, so System is not offered: a System preference shows
 *   the default.
 */
export function productModesOf(system) {
    const modes = system.modes;
    if (modes.policy === "os")
        return modes.explicit === true ? ["system", "light", "dark"] : ["system"];
    return modes.default === "light" ? ["light", "dark"] : ["dark", "light"];
}
