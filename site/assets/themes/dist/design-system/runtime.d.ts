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
import { type Appearance, type ColourMode, type DesignSystemDescriptor } from "./types.ts";
import type { DesignModePreference } from "../mode-core.ts";
export { BRIDGE_LAYER, CORE_LAYER, DESIGN_APPEARANCE_ATTRIBUTE, DESIGN_BRAND_ATTRIBUTE, DESIGN_MODE_ATTRIBUTE, DESIGN_SYSTEM_ATTRIBUTE, DESIGN_SYSTEM_LAYERS, SCOPE_LAYER, THEME_APPEARANCE, } from "./types.ts";
export type { Appearance, ColourMode, DesignSystemDescriptor, ModePolicy } from "./types.ts";
export { DESIGN_RECIPE_ATTRIBUTE, DESIGN_RECIPE_SIZE_ATTRIBUTE, DESIGN_RECIPE_VARIANT_ATTRIBUTE, RECIPE_ROLES, } from "./recipe-types.ts";
export type { RecipeRole } from "./recipe-types.ts";
export interface DesignSystemSelection {
    /** Required for the native appearance; optional under the theme appearance. */
    brand?: string;
    /**
     * Only with a brand, for systems whose mode policy is `attribute` or
     * explicit `os`; omitted, an explicit `os` system follows the root's
     * preference, then the operating system.
     */
    mode?: ColourMode;
    /** `native` (the default) or `theme`, for systems compiled with an adaptation. */
    appearance?: Appearance;
}
/** An element the scope can be stamped on. */
export interface ScopeElement {
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    /** A DOM element's document; it tells whether the element is the root. */
    ownerDocument?: {
        documentElement: unknown;
    } | null;
}
/**
 * The attributes selecting `selection` in `system`. Throws on an unknown
 * brand, a missing native brand, or a mode or appearance the system does not
 * take.
 */
export declare function designSystemAttributes(system: DesignSystemDescriptor, selection: DesignSystemSelection): Readonly<Record<string, string>>;
/** Stamp the selection on `element`. The returned function restores the four attributes as they were. */
export declare function applyDesignSystemScope(element: ScopeElement, system: DesignSystemDescriptor, selection: DesignSystemSelection): () => void;
/** Which compiled variant and size of a recipe role to use; both optional. */
export interface RecipeSelection {
    variant?: string;
    size?: string;
}
/**
 * The opt-in attributes for one recipe role, checked against a manifest
 * compiled with recipes. Throws on an unknown role, variant or size.
 */
export declare function recipeAttributes(system: DesignSystemDescriptor, role: string, selection?: RecipeSelection): Readonly<Record<string, string>>;
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
export declare function productModesOf(system: Pick<DesignSystemDescriptor, "modes">): DesignModePreference[];
