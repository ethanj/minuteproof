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
import { type DesignSystemProfile } from "./types.ts";
/** The theme appearance's rules for the scope layer; empty when the profile has no adaptation. */
export declare function emitAdapted(profile: DesignSystemProfile): string[];
