/**
 * The closed theme registry, as typed constants.
 *
 * The ids and labels are written once, in `boot-core.ts`, because the classic
 * pre-paint scripts are assembled from that file and cannot import this one.
 * Everything here is derived from it. Theme ids are stored in people's
 * browsers and appear in consumers' selectors, so they are permanent API.
 */
import { canonicalThemes } from "./boot-core.js";
export const CANONICAL_THEME_IDS = Object.freeze(canonicalThemes().map((entry) => entry[0]));
export const CANONICAL_THEME_LABELS = Object.freeze(Object.fromEntries(canonicalThemes()));
/** The single id a consumer may add: its own palette, declared in its own stylesheet. */
export const PRODUCT_THEME_ID = "product";
/**
 * Marks an element that previews a theme's palette, beside its `data-theme`
 * and `data-theme-scheme` (the appearance switch's previews carry it). A
 * design system compiled with the bound product slot paints a marked
 * `product` preview in its own values, since its bridge applies only on the
 * root.
 */
export const THEME_PREVIEW_ATTRIBUTE = "data-theme-preview";
/** The one canonical theme that follows the operating system's light or dark setting. */
export const SYSTEM_SCHEME_THEME_ID = "minimal";
/** Version of the token and id contract. A rename, removal or change of role is a new major. */
export const CONTRACT_VERSION = 1;
