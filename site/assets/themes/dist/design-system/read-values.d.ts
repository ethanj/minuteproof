/**
 * Reading one brand's value file into a map per colour mode.
 *
 * Two formats, named by the profile's `reader`:
 *
 * - `css-root-scheme`: a stylesheet with exactly one `:root` rule and one
 *   `:root` rule inside `@media (prefers-color-scheme: dark)`, as shadcn-style
 *   brand files are written. This is a bounded subset: any other rule,
 *   selector, at-rule or media condition is refused, not ignored.
 * - `json-modes`: `{ "light": { "<name>": "<value>" }, "dark": { … } }`,
 *   names without the leading `--`.
 *
 * Each mode must declare exactly the profile's vocabulary. Values may refer
 * to other vocabulary names or constants with `var(--name)`; every mode is
 * resolved here, so a dangling or cyclic reference fails before CSS is
 * written.
 */
import type { ColourMode, DesignSystemProfile } from "./types.ts";
/** One brand's vocabulary values in each colour mode, as written (before `var()` is followed). */
export type ModeValues = Record<ColourMode, Map<string, string>>;
/**
 * Every vocabulary name and constant in force for one mode, followed to
 * literals. Throws on a dangling or cyclic reference.
 */
export declare function resolvedScope(values: Map<string, string>, constants: Record<string, string>, where: string): Map<string, string>;
/** One brand's value file, read by the profile's reader, checked against the vocabulary and resolved per mode. */
export declare function readBrandValues(profile: DesignSystemProfile, brand: string, text: string): ModeValues;
