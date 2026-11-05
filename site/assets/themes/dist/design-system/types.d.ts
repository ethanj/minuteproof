/**
 * Types and fixed names of the design-system integration.
 *
 * A design-system profile describes an external system (its custom-property
 * vocabulary, its brands, its colour-mode policy) and a one-way bridge from
 * that vocabulary onto this package's contract tokens. The compiler turns a
 * profile plus digest-verified value files into scoped CSS and a manifest;
 * the runtime only stamps attributes. The profile schema is versioned on its
 * own (`PROFILE_SCHEMA`), independently of the npm package version.
 *
 * Nothing here is specific to one system: Strata and the synthetic Lumen
 * fixture are both just profiles.
 */
export declare const PROFILE_SCHEMA = "atomicstrata-design-system-profile/1";
export declare const MANIFEST_SCHEMA = "atomicstrata-design-system-manifest/1";
/** The attributes that select a system, a brand and (for `attribute` mode systems) a colour mode. */
export declare const DESIGN_SYSTEM_ATTRIBUTE = "data-design-system";
export declare const DESIGN_BRAND_ATTRIBUTE = "data-design-brand";
export declare const DESIGN_MODE_ATTRIBUTE = "data-design-mode";
/**
 * Present with the value `theme` on a scope whose components take the
 * canonical theme's identity; absent for the system's native look.
 */
export declare const DESIGN_APPEARANCE_ATTRIBUTE = "data-design-appearance";
/** The one value of `DESIGN_APPEARANCE_ATTRIBUTE`. */
export declare const THEME_APPEARANCE = "theme";
/** `native`: the system's own look. `theme`: its components take the canonical theme in force. */
export type Appearance = "native" | "theme";
/** The cascade layer holding scoped vocabulary values and region styles. Must come before the package's layer. */
export declare const SCOPE_LAYER = "atomicstrata-design-system";
/** The layer the consumer imports the package's own CSS into. */
export declare const CORE_LAYER = "atomicstrata";
/**
 * The layer holding the product-slot bridge. Must come after the package's
 * layer and before components and utilities.
 */
export declare const BRIDGE_LAYER = "atomicstrata-design-system-bridge";
/** The required relative order of the three layers. Other layers (a framework's base or utilities) go around them. */
export declare const DESIGN_SYSTEM_LAYERS: readonly string[];
export type ColourMode = "light" | "dark";
/**
 * `os`: follow `prefers-color-scheme`. With `explicit: true`, `data-design-mode`
 * may also pin `light` or `dark` (on the element, or on the root as the
 * person's preference); without the attribute the operating system decides.
 * `attribute`: `data-design-mode`, with `default` when it is absent.
 */
export type ModePolicy = {
    policy: "os";
    explicit?: true;
} | {
    policy: "attribute";
    default: ColourMode;
};
/**
 * How a value file is read. `css-root-scheme`: `:root` plus
 * `@media (prefers-color-scheme: dark) { :root }`. `json-modes`:
 * `{ "light": {…}, "dark": {…} }`.
 */
export type ValueReader = "css-root-scheme" | "json-modes";
/** A reference to a vocabulary name or constant (no leading `--`), or a fixed CSS value. */
export type ScopeValue = {
    ref: string;
} | {
    literal: string;
};
/** One contract token's value under the bound product slot. */
export type BridgeValue = ScopeValue | {
    gap: {
        fill: string;
    };
    reason: string;
};
/**
 * Where a system's value files come from. A `registry` source names a GitHub
 * repository and pins a full commit, which `acquire` fetches from; a `files`
 * source is supplied by the consumer and never acquired.
 */
export interface ProfileSource {
    kind: "registry" | "files";
    /** `owner/name`; required for a `registry` source. */
    repository?: string;
    /** The release the pinned commit belongs to, for people; the commit is what is fetched. */
    tag?: string;
    /** The full commit hash the value files are fetched at; required for a `registry` source. */
    commit?: string;
    /** A second pinned repository recorded beside the source for review; nothing is fetched from it. */
    rules?: {
        repository: string;
        commit: string;
    };
    /** The licence the source declares, in words ("none declared" is an answer). */
    licence: string;
}
export interface ProfileBrand {
    label: string;
    /** The value file's path inside the source, as acquired. */
    file: string;
    sha256: string;
}
/** A font family the system's values name, and the npm package that provides it; recorded, not loaded. */
export interface FontRequirement {
    family: string;
    package: string;
    version: string;
    licence: string;
}
/** Two names measured against each other: ink `fg` on background `bg`, judged at the text or non-text floor. */
export interface ContrastPair {
    fg: string;
    bg: string;
    /** The opaque name `bg` is painted over when `bg` is translucent. */
    over?: string;
    kind: "text" | "non-text";
}
/** A pair below its floor for some brands in one mode, pinned with its measured ratio and a reason. */
export interface ContrastException extends ContrastPair {
    brands: string[];
    mode: ColourMode;
    /** The measured ratio at full precision. */
    ratio: number;
    /** How far a measurement may differ from `ratio`; at most `MAX_TOLERANCE`. */
    tolerance: number;
    reason: string;
}
/** The floors every pair is held to, the pairs measured per brand and mode, and the pinned shortfalls. */
export interface ContrastPolicy {
    /** The minimum ratio for `text` pairs. */
    text: number;
    /** The minimum ratio for `non-text` pairs. */
    nonText: number;
    pairs: ContrastPair[];
    exceptions: ContrastException[];
}
/** How one component slot (`data-slot="<name>"`) takes the theme's shape and depth under the theme appearance. */
export interface AdaptedSlot {
    /** A contract radius token (`radius-control`). */
    radius?: string;
    /** A cap on the radius, in px, for small controls. Needs `radius`. */
    maxRadius?: string;
    /** Contract shadow tokens at rest, on hover and while pressed. */
    shadow?: string;
    hoverShadow?: string;
    activeShadow?: string;
    /** Framework custom properties the component's own utilities pin, forced (`!important`) inside the adapted scope. */
    properties?: Record<string, ScopeValue>;
    /**
     * Per `data-variant`: an opaque hover fill (a contract token), forced over
     * the component's own translucent hover modifier.
     */
    variants?: Record<string, {
        hoverFill: {
            ref: string;
        };
    }>;
    /**
     * Paint the slot's surface `fill` over the opaque `over` (contract tokens),
     * so a translucent theme surface never shows the page through.
     */
    surface?: {
        fill: string;
        over: string;
    };
}
/** A contrast pair below its floor under one canonical theme and scheme, pinned like a brand exception. */
export interface AdaptedContrastException extends ContrastPair {
    theme: string;
    scheme: ColourMode;
    /** Only for a theme-family state (`FAMILY_THEME_STATES`): the system scheme behind `scheme`. */
    os?: ColourMode;
    ratio: number;
    tolerance: number;
    reason: string;
}
/**
 * The theme appearance: every vocabulary name (and every constant that is not
 * a contract token) defined from a contract token or a literal, so the
 * system's components take the canonical theme in force. The direction is
 * the reverse of the bridge, and the two never apply to one element.
 */
export interface Adaptation {
    values: Record<string, ScopeValue>;
    /** Custom properties the components consume that are neither vocabulary nor contract (framework motion defaults). */
    properties: Record<string, ScopeValue>;
    slots: Record<string, AdaptedSlot>;
    exceptions: AdaptedContrastException[];
}
/** The properties a region style may set (`scope`); `background` is written as `background-color`. */
export type ScopeProperty = "background" | "color" | "font-family" | "line-height";
/** A validated design-system profile (`validateProfile`); see the file header for what it describes. */
export interface DesignSystemProfile {
    schema: typeof PROFILE_SCHEMA;
    /** The value of `data-design-system`; a slug. */
    id: string;
    /** The profile's own version, which recipe documents pin. */
    version: string;
    label: string;
    source: ProfileSource;
    reader: ValueReader;
    modes: ModePolicy;
    /** The custom properties (without `--`) every brand's value file defines in each mode. */
    vocabulary: string[];
    /** Custom properties with one value for every brand and mode, such as font stacks. */
    constants: Record<string, string>;
    /** The constants that are also contract tokens, listed so that redefining a token is never accidental. */
    overridesContract: string[];
    brands: Record<string, ProfileBrand>;
    /** Every contract token under the bound `product` id: from the vocabulary, a literal, or a canonical gap fill. */
    bridge: Record<string, BridgeValue>;
    /** The region styles that paint a system region's own surface, ink and type. */
    scope: Partial<Record<ScopeProperty, ScopeValue>> & Record<"background" | "color", ScopeValue>;
    /** Recorded for review; the compiler validates it and emits nothing from it. */
    fonts: FontRequirement[];
    contrast: ContrastPolicy;
    /** The system's component names, recorded for review; the compiler validates them and emits nothing from them. */
    components: string[];
    /** Optional: enables the theme appearance. */
    adaptation?: Adaptation;
}
/** The largest tolerance an exception may declare: a numerical allowance, not a rounding of the ratio. */
export declare const MAX_TOLERANCE = 0.000001;
/** What the runtime needs: a profile or a manifest both carry these. */
export interface DesignSystemDescriptor {
    id: string;
    brands: Readonly<Record<string, unknown>>;
    modes: ModePolicy;
    /** A manifest lists its appearances; a profile has `adaptation` when it takes the theme appearance. */
    appearances?: readonly Appearance[];
    adaptation?: unknown;
    /** A manifest compiled with recipes lists each role's variants and sizes. */
    recipes?: {
        roles: Readonly<Record<string, {
            variants: readonly string[];
            sizes: readonly string[];
        }>>;
    };
}
/** Whether a profile or manifest was written for the theme appearance. */
export declare function takesThemeAppearance(system: DesignSystemDescriptor): boolean;
/**
 * The profile's brand `id`, or undefined; only the profile's own keys count,
 * never inherited ones such as `constructor`.
 */
export declare function brandOf(profile: DesignSystemProfile, id: string): ProfileBrand | undefined;
