/**
 * The validator of compiled theme manifests (`atomicstrata-theme-manifest/1`).
 *
 * One positive grammar, shared by the compiler (which validates what it is
 * about to write), the `check` command and the run time. A manifest is
 * accepted only in exactly this shape: every key known, every path an
 * `ASSET_PATH`, every digest a full SHA-256, the CSS integrity a SHA-384 SRI
 * value, the modes one of the accepted sets, a preview for exactly the
 * schemes those modes imply, and every font's CSS family the namespaced name
 * its id, build and family give. Anything else throws, naming the problem.
 *
 * What validation cannot do: prove that the stylesheet the manifest names
 * contains only what the compiler writes. That is established when the theme
 * is compiled; at run time the browser checks the bytes against the
 * integrity value, and the bytes are trusted as the publisher's.
 */
import { type Check } from "../design-system/grammar.ts";
import { type ThemeManifest } from "./schema.ts";
/** The error every manifest problem throws. */
export declare function manifestError(message: string): Error;
/** The generator record: the package and version that compiled the document. */
export declare function checkGenerator(test: Check, raw: unknown, where: string): void;
/** A cascade layer name, or null for unlayered output. */
export declare function checkLayer(test: Check, raw: unknown, where: string): void;
/** Where a manifest or index may hold `null`: its unlayered `layer`. */
export declare const LAYER_MAY_BE_NULL: (path: string) => boolean;
/** Validate a parsed manifest, returning it typed. Throws on the first problem. */
export declare function validateThemeManifest(raw: unknown): ThemeManifest;
