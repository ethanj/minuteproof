/**
 * Types and fixed vocabulary of component appearance recipes.
 *
 * A recipe document is optional, typed metadata compiled beside a profile: it
 * gives a bounded set of component roles (an action, a field, a card, a
 * status and running text) a system's treatment, per variant, size and
 * state, from the system's own vocabulary. It is pinned to one profile id and
 * version. The compiler writes it as zero-specificity rules, in a fixed
 * order, scoped like the component adapter, onto elements that opt in with
 * `data-design-recipe`. There is no selector, property or state outside the
 * tables below: this is a closed grammar, not a CSS interpreter.
 *
 * The tables are shared by the validator, the emitter and the contrast
 * evaluator, so the three cannot disagree about which states exist, how they
 * are selected or in which order they win.
 */
import type { AdaptedSlot, ColourMode } from "./types.ts";
export declare const RECIPES_SCHEMA = "atomicstrata-design-system-recipes/1";
/** The opt-in marker and its two qualifiers. Disjoint from a registry's `data-slot` and `data-variant`. */
export declare const DESIGN_RECIPE_ATTRIBUTE = "data-design-recipe";
export declare const DESIGN_RECIPE_VARIANT_ATTRIBUTE = "data-design-variant";
export declare const DESIGN_RECIPE_SIZE_ATTRIBUTE = "data-design-size";
export declare const RECIPE_ROLES: readonly ["action", "field", "card", "status", "text"];
export type RecipeRole = (typeof RECIPE_ROLES)[number];
/** Every state, in the order its rules win: a later state overrides an earlier one where both apply. */
export declare const STATE_ORDER: readonly ["rest", "hover", "active", "selected", "invalid", "focus-visible", "disabled"];
export type RecipeState = (typeof STATE_ORDER)[number];
/** The exact DOM condition of each state. Hover and press never apply to a disabled control. */
export declare const STATE_SELECTORS: Readonly<Record<Exclude<RecipeState, "rest">, string>>;
/** The states each role may style. */
export declare const ROLE_STATES: Readonly<Record<RecipeRole, readonly RecipeState[]>>;
/** The properties that take a colour, and so the `{ gap }` and `{ mix }` value forms. */
export declare const COLOUR_PROPERTIES: readonly ["color", "background-color", "border-color", "outline-color"];
/** Every property a recipe may set. */
export declare const RECIPE_PROPERTIES: readonly ["color", "background-color", "border-color", "outline-color", "border-width", "border-style", "border-radius", "outline-width", "outline-style", "outline-offset", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-decoration-line", "text-underline-offset", "min-height", "min-width", "padding-block", "padding-inline", "gap", "cursor", "opacity"];
export type RecipeProperty = (typeof RECIPE_PROPERTIES)[number];
/** What a size may set: geometry and type size only, never colour or opacity. */
export declare const SIZE_PROPERTIES: readonly RecipeProperty[];
/**
 * A value: a vocabulary name or constant, a literal, a contract token the
 * profile fills from a canonical gap, or an opaque sRGB mix of two
 * vocabulary colours (`color-mix(in srgb, <ref> <percent>%, <over>)`), the
 * form of a registry's `bg-primary/90` hover over its surface.
 */
export type RecipeValue = {
    ref: string;
} | {
    literal: string;
} | {
    gap: string;
} | {
    mix: {
        ref: string;
        over: string;
        percent: number;
    };
};
export type RecipeDeclarations = Partial<Record<RecipeProperty, RecipeValue>>;
export type StateDeclarations = Partial<Record<RecipeState, RecipeDeclarations>>;
/** The theme appearance's shape and depth for a role: the component adapter's radius and shadow keys. */
export type AdaptedShape = Pick<AdaptedSlot, "radius" | "maxRadius" | "shadow" | "hoverShadow" | "activeShadow">;
export interface RoleRecipe {
    /** The opaque vocabulary surface the role sits on; the profile's scope background when absent. */
    surface?: {
        ref: string;
    };
    /**
     * `text`: every reachable state of every variant is held to the text
     * floor, and a focus outline to the non-text floor.
     */
    contrast?: "text";
    base: StateDeclarations;
    variants?: Record<string, StateDeclarations>;
    sizes?: Record<string, RecipeDeclarations>;
    adapted?: AdaptedShape;
}
/** An intentional replacement of one vocabulary value, for one mode and some brands, in native scopes only. */
export interface AccessibilityOverride {
    name: string;
    brands: string[];
    mode: ColourMode;
    /** A measurable colour literal. */
    value: string;
    reason: string;
    /** Where the value comes from (a product's measured correction, an audit). */
    source: string;
}
/** What a measurement judges: the label (`text`), the focus outline (`focus`) or a field's edge (`boundary`). */
export type RecipePair = "text" | "focus" | "boundary";
/**
 * A recipe combination below its floor, pinned with its measured ratio,
 * natively (`brand`, `mode`) or under a canonical theme (`theme`, `scheme`).
 * It covers exactly one combination: its `states`, as a set, with no other
 * state in force.
 */
export interface RecipeException {
    role: RecipeRole;
    variant: string | null;
    states: RecipeState[];
    pair: RecipePair;
    brand?: string;
    mode?: ColourMode;
    theme?: string;
    scheme?: ColourMode;
    /** Only for a theme-family state: the system scheme behind `scheme`. */
    os?: ColourMode;
    ratio: number;
    tolerance: number;
    reason: string;
}
export interface RecipeProvenance {
    authoredBy: "package" | "consumer";
    /** What the treatment is derived from, in words. */
    basis: string;
    sources: Array<{
        repository: string;
        commit: string;
    }>;
    /** Always a qualified statement: an independent treatment, not an official certification. */
    conformance: string;
}
export interface RecipeDocument {
    schema: typeof RECIPES_SCHEMA;
    id: string;
    version: string;
    label: string;
    system: string;
    profileVersion: string;
    provenance: RecipeProvenance;
    /** A shipped recipe this one extends, by name (`strata`); only in a consumer's document. */
    extends?: string;
    roles: Partial<Record<RecipeRole, RoleRecipe>>;
    accessibility?: {
        overrides: AccessibilityOverride[];
    };
    exceptions?: RecipeException[];
}
/** The private custom property carrying a gap-filled contract token's value inside a system's recipe scopes. */
export declare function gapProperty(system: string, token: string): string;
