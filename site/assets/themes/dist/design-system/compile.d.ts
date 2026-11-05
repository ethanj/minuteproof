/**
 * The design-system compiler: a profile plus its brands' value files in,
 * one stylesheet and one manifest out.
 *
 * Pure apart from hashing: callers hand in file text (see `node.ts` for the
 * file-system wrapper and the CLI). Order of work: the profile is validated,
 * every supplied file's SHA-256 is compared with the profile's pin before it
 * is parsed (no fallback on drift), each brand is read and resolved per mode,
 * contrast is judged, gaps are filled from the package's own canonical maps,
 * and only then is anything emitted. Any failure throws and nothing is
 * returned.
 */
import { type AdaptedContrastMeasurement, type ContrastMeasurement } from "./contrast.ts";
import { type RecipeInput, type RecipeLedger, type RecipeManifest } from "./recipe-compile.ts";
import { MANIFEST_SCHEMA, type Appearance, type ColourMode, type ModePolicy, type ProfileSource } from "./types.ts";
/** What `compileDesignSystem` takes: the profile, its brands' file text, and the package's own canonical CSS. */
export interface CompileInput {
    /** A parsed profile; validated here. */
    profile: unknown;
    /** Value file text for each brand to compile, keyed by brand id. At least one. */
    brandFiles: Readonly<Record<string, string>>;
    /** The package's canonical theme stylesheet text (`css/theme.bundle.css`), for gap values. */
    canonicalCss: string;
    /** Emit the product-slot bridge. */
    bindProductSlot: boolean;
    /** Who generated the output, recorded in the header and manifest. */
    generator: {
        package: string;
        version: string;
    };
    /** Optional component appearance recipes (`recipe-types.ts`); without them the output is exactly what it was. */
    recipes?: RecipeInput;
    /**
     * Also qualify the theme-family states (Clay Dark, Minimal pinned against
     * the system) under the theme appearance and in adapted recipes. Without
     * it the output is exactly what it was.
     */
    themeFamilies?: boolean;
}
/** The run-time manifest: what the runtime and a consumer need to know about the compiled stylesheet. */
export interface DesignSystemManifest {
    schema: typeof MANIFEST_SCHEMA;
    id: string;
    profileVersion: string;
    label: string;
    brands: Record<string, string>;
    modes: ModePolicy;
    /** `native` always; `theme` when the profile has an adaptation. */
    appearances: Appearance[];
    attributes: {
        system: string;
        brand: string;
        mode: string;
        appearance: string;
    };
    layers: readonly string[];
    productSlot: boolean;
    source: ProfileSource;
    files: Record<string, {
        file: string;
        sha256: string;
    }>;
    cssSha256: string;
    generator: {
        package: string;
        version: string;
    };
    /** Only when compiled with recipes. */
    recipes?: RecipeManifest;
}
/** What the compile decided and measured, for review; not needed at run time. */
export interface DesignSystemLedger {
    id: string;
    profileVersion: string;
    cssSha256: string;
    gaps: Array<{
        token: string;
        fill: string;
        reason: string;
        values: Record<ColourMode, string>;
    }>;
    overridesContract: string[];
    contrast: ContrastMeasurement[];
    /** The profile's pairs under the theme appearance, per canonical theme and scheme; only with an adaptation. */
    adaptedContrast?: AdaptedContrastMeasurement[];
    /** Only with recipes: every recipe combination measured, and what each accessibility override changed. */
    recipes?: RecipeLedger;
}
/** The generated stylesheet, its manifest and its review ledger. */
export interface CompileOutput {
    css: string;
    manifest: DesignSystemManifest;
    ledger: DesignSystemLedger;
}
/** The SHA-256 of `text`'s UTF-8 bytes, as lowercase hex: how brand files are pinned and outputs digested. */
export declare function sha256(text: string): string;
/** Compile a profile. Throws, naming the problem, on any invalid input; returns nothing partial. */
export declare function compileDesignSystem(input: CompileInput): CompileOutput;
