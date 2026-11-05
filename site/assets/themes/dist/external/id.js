/**
 * The reserved namespace of external theme ids.
 *
 * Built-in ids (`scientific-clay`, `minimal`, `nebula-light`, `nebula-dark`),
 * the consumer's single `product` slot and the family names (`clay`,
 * `minimal`, `nebula`, `product`) form a closed set. An external theme, one
 * compiled from a theme source and published in a catalog, lives in a
 * separate namespace that cannot meet it: every external id starts with
 * `ext-`, a prefix no built-in id will ever use. The rest is lower-case words
 * joined by single hyphens, and the whole id is at most 32 characters, the
 * bound the resolver already applies to every stored value.
 *
 * This one function is the grammar. The theme compiler, the manifest and
 * catalog validators and, later, the pre-paint parts and the catalog
 * controller all call it, so the namespace cannot be spelt two ways. It is
 * self-contained (no module-scope reference) so that a classic pre-paint
 * script can be assembled from its source text, like `boot-core.ts`.
 */
/** The prefix every external id carries. */
const EXTERNAL_THEME_PREFIX = "ext-";
/** The longest external id, equal to the resolver's bound on any stored theme value. */
export const MAX_EXTERNAL_THEME_ID_LENGTH = 32;
/**
 * The id grammar as a pattern, for the authoring JSON Schemas. `isExternalThemeId`
 * spells the same pattern inline, because it must stay self-contained; a test
 * holds the two equal.
 */
export const EXTERNAL_THEME_ID_PATTERN = /^ext-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** Whether `value` is an external theme id: `ext-` and lower-case words joined by single hyphens, at most 32 long. */
export function isExternalThemeId(value) {
    const maxLength = 32;
    return typeof value === "string" && value.length <= maxLength && /^ext-[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value);
}
