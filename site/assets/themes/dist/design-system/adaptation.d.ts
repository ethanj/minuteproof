/**
 * The theme appearance's grammar: one validator for a profile's optional
 * `adaptation` section, plus the fixed facts the compiler needs about it.
 *
 * The accepted shape, stated positively:
 *
 * - `values` maps exactly the vocabulary and every constant that is not a
 *   contract token. Each is `{ ref: <contract token> }` or `{ literal }`.
 *   A reference never names vocabulary or a constant, so the adaptation reads
 *   only the contract and the direction is one way (contract to vocabulary,
 *   the reverse of the bridge). Constants that are contract tokens
 *   (`overridesContract`) are not listed: under the theme appearance they are
 *   released to the theme with `inherit`, never defined from themselves.
 * - `properties` names custom properties the components consume that are
 *   neither vocabulary, constants, contract tokens nor the package's own
 *   private names, with the same value forms.
 * - `slots` names `data-slot` values: the explicit component adapter for
 *   what a system's components hardcode instead of reading a variable. Each
 *   sets a radius (a contract radius token, optionally capped in px),
 *   contract shadows at rest, on hover and while pressed, and `properties`:
 *   framework custom properties the component's own utilities pin (a fixed
 *   animation duration), emitted `!important` so they win over those
 *   utilities. Two narrow accessibility overrides force a background
 *   instead: `variants.<data-variant>.hoverFill`, an opaque contract fill
 *   on hover in place of the component's translucent hover modifier, and
 *   `surface`, a translucent contract surface painted over an opaque one.
 *   Nothing else is forced: no box shadow, transition or animation
 *   longhand, so the package's reduced-motion rule and the focus ring are
 *   untouched.
 * - `exceptions` pin contrast shortfalls per canonical theme and scheme, or,
 *   with `os`, per theme-family state (`FAMILY_THEME_STATES`): an exception
 *   applies to exactly the state it names, so a canonical exception never
 *   covers a family state and the reverse.
 *
 * Validation runs with the rest of the profile, before any file is read.
 */
import type { CanonicalThemeId } from "../boot-core.ts";
import { type Check, type Raw } from "./grammar.ts";
import type { ColourMode, DesignSystemProfile } from "./types.ts";
/** The schemes each canonical theme can be seen in. Minimal follows the operating system; the others are fixed. */
export declare const THEME_SCHEMES: Readonly<Record<CanonicalThemeId, readonly ColourMode[]>>;
/**
 * The theme-family states (`family-core.ts`) a compile qualifies when asked
 * (`themeFamilies`): Clay Dark, and Minimal pinned against the operating
 * system. `scheme` is what the root shows (`data-theme-scheme`), `os` the
 * system's preference behind it. Clay has no system-dependent rule, so one
 * system scheme stands for both.
 */
export declare const FAMILY_THEME_STATES: ReadonlyArray<{
    theme: CanonicalThemeId;
    scheme: ColourMode;
    os: ColourMode;
}>;
/**
 * The root's own value of a contract token a system's constant overrides,
 * inherited by adapted scopes below any native one.
 */
export declare function contractSnapshot(profile: DesignSystemProfile, token: string): string;
/**
 * A shape's radius (a contract radius, optionally capped in px) and shadows
 * (contract shadows); shared with recipes' adapted shapes.
 */
export declare function checkShape(check: Check, raw: Raw, where: string): void;
/**
 * Whether `theme`, `scheme` and `os` name a measured state: a canonical theme
 * and a scheme it is seen in when `os` is absent, or exactly one of
 * `FAMILY_THEME_STATES` when it is given. Shared with recipe exceptions.
 */
export declare function isThemeState(theme: unknown, scheme: unknown, os: unknown): boolean;
/** Check `profile.adaptation`, when present, against the already validated rest of the profile. */
export declare function checkAdaptation(check: Check, profile: DesignSystemProfile): void;
