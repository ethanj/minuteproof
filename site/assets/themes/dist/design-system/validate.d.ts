/**
 * The profile grammar, as one validator.
 *
 * A profile is accepted only in the shape `types.ts` describes, and every
 * cross-reference inside it is checked before any file is read: names are
 * well formed, the vocabulary does not collide with the contract, the bridge
 * covers exactly the contract, every reference names something the scope
 * declares, every gap names a canonical theme, every exception names a brand.
 * Checks that need the value files (digests, exact vocabulary per mode,
 * dangling or cyclic `var()` inside a mode, contrast) run in the compiler.
 *
 * This is ordinary configuration validation for trusted authors, not a
 * hostile-input framework: it rejects mistakes with a message naming them.
 */
import { type DesignSystemProfile } from "./types.ts";
/** The error every profile problem throws: the package prefix, then the problem. */
export declare function profileError(message: string): Error;
/** Check a parsed profile completely and return it typed. Throws on the first problem, naming it. */
export declare function validateProfile(value: unknown): DesignSystemProfile;
