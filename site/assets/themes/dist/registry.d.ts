/**
 * The closed theme registry, as typed constants.
 *
 * The ids and labels are written once, in `boot-core.ts`, because the classic
 * pre-paint scripts are assembled from that file and cannot import this one.
 * Everything here is derived from it. Theme ids are stored in people's
 * browsers and appear in consumers' selectors, so they are permanent API.
 */
import { type CanonicalThemeId } from "./boot-core.ts";
export declare const CANONICAL_THEME_IDS: readonly CanonicalThemeId[];
export declare const CANONICAL_THEME_LABELS: Readonly<Record<CanonicalThemeId, string>>;
/** The single id a consumer may add: its own palette, declared in its own stylesheet. */
export declare const PRODUCT_THEME_ID = "product";
/**
 * Marks an element that previews a theme's palette, beside its `data-theme`
 * and `data-theme-scheme` (the appearance switch's previews carry it). A
 * design system compiled with the bound product slot paints a marked
 * `product` preview in its own values, since its bridge applies only on the
 * root.
 */
export declare const THEME_PREVIEW_ATTRIBUTE = "data-theme-preview";
/** The one canonical theme that follows the operating system's light or dark setting. */
export declare const SYSTEM_SCHEME_THEME_ID: CanonicalThemeId;
/** Version of the token and id contract. A rename, removal or change of role is a new major. */
export declare const CONTRACT_VERSION = 1;
