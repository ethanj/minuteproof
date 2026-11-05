/**
 * The profile's contrast policy, applied to every brand and mode at compile time.
 *
 * Each listed pair is measured at full precision: a translucent background is
 * first painted over its `over` name, then the ink over that. A pair below its
 * threshold must be a declared exception for that brand and mode, and the
 * measurement must equal the exception's ratio within its declared tolerance.
 * An exception that no longer matches a shortfall fails too, so an upstream
 * fix is noticed and the exception removed. Nothing is rounded.
 *
 * The theme appearance is judged the same way, once per canonical theme and
 * scheme, with the vocabulary resolved from that theme's contract tokens.
 */
import type { ColourMode, ContrastPair, DesignSystemProfile } from "./types.ts";
/** One profile pair measured for one brand and mode, as the ledger records it. */
export interface ContrastMeasurement extends ContrastPair {
    brand: string;
    mode: ColourMode;
    ratio: number;
    status: "pass" | "exception";
}
/** The ratio of `pair` in one resolved map. */
export declare function measurePair(resolved: ReadonlyMap<string, string>, pair: ContrastPair, where: string): number;
/** The profile's floor for a pair of this kind. */
export declare function floorOf(profile: DesignSystemProfile, kind: ContrastPair["kind"]): number;
/** A measured ratio, the floor it is held to, the exception pinning it if any, and where it was taken. */
export interface Judgement {
    floor: number;
    ratio: number;
    exception: {
        ratio: number;
        tolerance: number;
    } | undefined;
    where: string;
}
/** Pass, or a matching pinned exception; anything else throws naming `where`. */
export declare function judge({ floor, ratio, exception, where }: Judgement): "pass" | "exception";
/**
 * Every pair for one brand and mode. Throws on an undeclared shortfall or a
 * drifted or stale exception. The positional shape matches `measureAdapted`,
 * which is a public export.
 */
export declare function measureBrand(profile: DesignSystemProfile, brand: string, mode: ColourMode, resolved: ReadonlyMap<string, string>): ContrastMeasurement[];
/** One profile pair measured under the theme appearance in one canonical theme and scheme. */
export interface AdaptedContrastMeasurement extends ContrastPair {
    theme: string;
    scheme: ColourMode;
    /** Only for a theme-family state: the operating system's scheme behind the shown `scheme`. */
    os?: ColourMode;
    ratio: number;
    status: "pass" | "exception";
}
/** The vocabulary as the theme appearance resolves it under one theme's resolved contract tokens. */
export declare function adaptedValues(profile: DesignSystemProfile, contract: ReadonlyMap<string, string>): Map<string, string>;
/**
 * Every pair under the theme appearance in one canonical theme and scheme. A
 * translucent background with no `over` sits on the contract's canvas, the
 * same model the package's own contrast guarantee uses.
 */
export declare function measureAdapted(profile: DesignSystemProfile, theme: string, scheme: ColourMode, contract: ReadonlyMap<string, string>, os?: ColourMode): AdaptedContrastMeasurement[];
/**
 * The adapter's forced backgrounds must be colours the guarantee can stand
 * on, in this theme and scheme: a hover fill and a surface's `over` are
 * opaque, and a surface's `fill` is a measurable colour (it may be
 * translucent; it is painted over `over`). A profile whose tokens do not
 * meet that fails the compile, naming the slot.
 */
export declare function checkAdaptedFills(profile: DesignSystemProfile, theme: string, scheme: ColourMode, contract: ReadonlyMap<string, string>): void;
