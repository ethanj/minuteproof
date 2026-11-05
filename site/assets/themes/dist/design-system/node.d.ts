/**
 * The compiler's Node entry (`@atomicstrata/themes/design-system/compiler`).
 *
 * Wraps the pure compiler with the file system: reading a profile (a path, or
 * the name of a profile this package ships under `design-systems/`), reading
 * recipe documents (a path or a shipped name, with the shipped document a
 * consumer's `extends` names), reading brand files, writing or checking the
 * generated stylesheet and manifest, and acquiring pinned brand files from
 * their source with the GitHub CLI.
 *
 * Acquisition is the only step that touches the network, and it is separate:
 * upstream bytes are fetched once, by an authenticated `gh`, at the commit the
 * profile pins, and verified against the profile's digests before they are
 * written. Compiling afterwards is offline. This package never contains those
 * bytes or anything generated from them.
 */
import { type CompileOutput } from "./compile.ts";
import type { RecipeInput } from "./recipe-compile.ts";
import { type DesignSystemProfile } from "./types.ts";
export { compileDesignSystem, sha256, type CompileInput, type CompileOutput, type DesignSystemLedger, type DesignSystemManifest, } from "./compile.ts";
export { validateProfile } from "./validate.ts";
export { measureAdapted, measurePair, type AdaptedContrastMeasurement } from "./contrast.ts";
export { THEME_SCHEMES } from "./adaptation.ts";
export { mergeRecipes, validateRecipes } from "./recipe-validate.ts";
export type { RecipeInput, RecipeLedger, RecipeManifest } from "./recipe-compile.ts";
export type { OverrideMeasurement, RecipeMeasurement } from "./recipe-contrast.ts";
export * from "./recipe-types.ts";
export * from "./types.ts";
/** The package's own name and version, recorded in generated files. */
export declare function generatorInfo(): {
    package: string;
    version: string;
};
/** The package's canonical maps as one stylesheet, for gap values. */
export declare function canonicalCss(): string;
/** A profile by file path, or by the name of one this package ships (`strata`). Validated. */
export declare function readProfile(pathOrName: string): DesignSystemProfile;
/**
 * A recipe document's text, preceded by the shipped document it `extends`,
 * if any: the order `compileDesignSystem` takes.
 */
export declare function readRecipes(pathOrName: string): string[];
export interface CompileFilesOptions {
    profile: DesignSystemProfile;
    /** Brand id to value-file path. */
    brandFiles: Readonly<Record<string, string>>;
    bindProductSlot: boolean;
    /** Optional recipe documents (`readRecipes`) and the appearances they apply to. */
    recipes?: RecipeInput;
    /** Also qualify the theme-family states (`CompileInput.themeFamilies`). */
    themeFamilies?: boolean;
}
/** Compile from files on disk. */
export declare function compileFiles(options: CompileFilesOptions): CompileOutput;
/** The brand-to-file map for brands acquired under `sourcesDir` at their profile paths. */
export declare function brandFilesIn(profile: DesignSystemProfile, sourcesDir: string, brands: readonly string[]): Record<string, string>;
/** The three generated files' paths and text: stylesheet, run-time manifest, review ledger (`ledgerJson`). */
export declare function outputFiles(output: CompileOutput, outDir: string): Array<[string, string]>;
/** Write the generated files. */
export declare function writeOutput(output: CompileOutput, outDir: string): string[];
/** The generated files that are missing or differ from what is on disk. */
export declare function staleOutput(output: CompileOutput, outDir: string): string[];
/** Runs `gh` with arguments and returns stdout; replaceable in tests. */
export type GhRunner = (args: readonly string[]) => string;
/** Fetch each chosen brand's value file at the pinned commit, verify its digest, and write it under `outDir`. */
export declare function acquireBrandFiles(profile: DesignSystemProfile, outDir: string, brands: readonly string[], gh?: GhRunner): string[];
