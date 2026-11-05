/**
 * Writing the compiled stylesheet.
 *
 * Two cascade layers, whose order relative to the package's own layer is the
 * whole integration contract (`DESIGN_SYSTEM_LAYERS`):
 *
 * - `atomicstrata-design-system`, before the package: the system's values on
 *   every element that carries its attributes (the root, a region, or a
 *   portaled popup), plus region styles that paint the region's own surface,
 *   ink, type and colour scheme. Being early, it loses on the root to the
 *   theme in force and to any framework component or utility, which is what
 *   lets an inverted tooltip keep its own surface.
 * - `atomicstrata-design-system-bridge`, after the package: contract tokens
 *   for the consumer's `product` id, only on a root that carries both the
 *   product id and the system. Being late, it beats the package's `:root`
 *   defaults; in an earlier layer it would lose to them.
 *
 * A profile whose `os` policy is `explicit` also gets, per brand, region and
 * bound root, one rule per mode pinned by `data-design-mode` on the element
 * or, failing that, on the root (`pinnedSelector`): values, colour scheme and
 * gap fills move together. Without `explicit` nothing extra is written.
 *
 * The bridge layer also paints product palette previews
 * (`productPreviewRules`): an element marked `data-theme-preview` with
 * `data-theme="product"` and a `data-theme-scheme`, below a root bound to
 * the system, takes the root brand's native values in that scheme and the
 * bridge's contract tokens from them. The appearance switch marks its
 * previews so. Nothing on the root changes: the bridge on a `product` root
 * stays the only application of the contract from the vocabulary, the one
 * that styles a page. A preview rule repeats the same declarations on a
 * decorative swatch only, whose values reach nothing but its own
 * descendants.
 *
 * Selectors are built only from validated slugs, so no value can escape its
 * attribute selector.
 */
import { type ColourMode, type DesignSystemProfile } from "./types.ts";
import type { ModeValues } from "./read-values.ts";
/** Gap values per mode, resolved from the package's own canonical maps. */
export type GapValues = Record<ColourMode, Map<string, string>>;
/** Whether `data-design-mode` may pin an `os` system's mode. */
export declare function explicitModes(profile: DesignSystemProfile): boolean;
/**
 * The two selectors for `selector` pinned to `mode`: by its own attribute,
 * and, without one, by the root's preference. Both are one attribute above
 * `selector`, so they beat the media-query rule of the other mode and stay
 * below the theme appearance's adapted scope.
 */
export declare function pinnedSelectors(selector: string, mode: ColourMode): [own: string, viaRoot: string];
/** `pinnedSelectors` as one selector list. */
export declare function pinnedSelector(selector: string, mode: ColourMode): string;
/**
 * The scope layer: constants, each brand's values in both modes, region
 * styles, then the theme appearance (`emit-adapted.ts`).
 */
export declare function emitScope(profile: DesignSystemProfile, brands: Readonly<Record<string, ModeValues>>): string;
/**
 * The bridge layer: contract tokens for the bound product id, with gap
 * values per mode, then the product palette previews.
 */
export declare function emitBridge(profile: DesignSystemProfile, gaps: GapValues, brands: Readonly<Record<string, ModeValues>>): string;
