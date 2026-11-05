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
export const PROFILE_SCHEMA = "atomicstrata-design-system-profile/1";
export const MANIFEST_SCHEMA = "atomicstrata-design-system-manifest/1";
/** The attributes that select a system, a brand and (for `attribute` mode systems) a colour mode. */
export const DESIGN_SYSTEM_ATTRIBUTE = "data-design-system";
export const DESIGN_BRAND_ATTRIBUTE = "data-design-brand";
export const DESIGN_MODE_ATTRIBUTE = "data-design-mode";
/**
 * Present with the value `theme` on a scope whose components take the
 * canonical theme's identity; absent for the system's native look.
 */
export const DESIGN_APPEARANCE_ATTRIBUTE = "data-design-appearance";
/** The one value of `DESIGN_APPEARANCE_ATTRIBUTE`. */
export const THEME_APPEARANCE = "theme";
/** The cascade layer holding scoped vocabulary values and region styles. Must come before the package's layer. */
export const SCOPE_LAYER = "atomicstrata-design-system";
/** The layer the consumer imports the package's own CSS into. */
export const CORE_LAYER = "atomicstrata";
/**
 * The layer holding the product-slot bridge. Must come after the package's
 * layer and before components and utilities.
 */
export const BRIDGE_LAYER = "atomicstrata-design-system-bridge";
/** The required relative order of the three layers. Other layers (a framework's base or utilities) go around them. */
export const DESIGN_SYSTEM_LAYERS = Object.freeze([SCOPE_LAYER, CORE_LAYER, BRIDGE_LAYER]);
/** The largest tolerance an exception may declare: a numerical allowance, not a rounding of the ratio. */
export const MAX_TOLERANCE = 1e-6;
/** Whether a profile or manifest was written for the theme appearance. */
export function takesThemeAppearance(system) {
    if (system.appearances !== undefined)
        return system.appearances.includes(THEME_APPEARANCE);
    return system.adaptation !== undefined && system.adaptation !== null;
}
/**
 * The profile's brand `id`, or undefined; only the profile's own keys count,
 * never inherited ones such as `constructor`.
 */
export function brandOf(profile, id) {
    return Object.prototype.hasOwnProperty.call(profile.brands, id) ? profile.brands[id] : undefined;
}
