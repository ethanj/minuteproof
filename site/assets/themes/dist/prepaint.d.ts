/**
 * Classic-script deliveries of the pre-paint resolver.
 *
 * Every script here is assembled from the source text of the functions in
 * `boot-core.ts` (and, with the mode preference, `mode-core.ts`), so none can
 * drift from the module controller: there is no second implementation to
 * keep in step. `prepaintSource` embeds a checked
 * configuration and is for consumers with a build step, who either write the
 * string to a same-origin file (strict content security policies) or splice it
 * inline ahead of the first stylesheet. `prepaintGlobalSource` is the text of
 * the prebuilt `prepaint.global.js`, which reads its configuration from its own
 * tag and so needs no build step at all.
 *
 * A configuration with `designMode` adds the mode functions (`mode-core.ts`)
 * and boots through `bootWithMode`; without it the output is exactly what it
 * was before modes existed. `prepaintModeGlobalSource` is the text of the
 * prebuilt `prepaint-mode.global.js`, the attribute-configured script with
 * the mode preference.
 *
 * Run these generators from an unbundled install at build time. They rely on
 * `Function.prototype.toString`, which returns exactly the shipped source.
 */
import { type ThemeConfig } from "./boot-core.ts";
/** JSON safe to embed in an inline `<script>`: `<` and the two line separators escaped. Shared with `catalog/prepaint.ts`. */
export declare function inlineJson(value: unknown): string;
/**
 * A classic script that applies `config` before first paint.
 * Throws on an invalid configuration, so a bad build fails instead of shipping.
 */
export declare function prepaintSource(config: ThemeConfig): string;
/** The text of `prepaint.global.js`: configuration comes from the script tag's `data-*` attributes. */
export declare function prepaintGlobalSource(): string;
/**
 * The text of `prepaint-mode.global.js`: the theme's attributes plus
 * `data-mode-storage-key` or `data-mode-session-only`, and `data-mode-default`.
 */
export declare function prepaintModeGlobalSource(): string;
/**
 * The text of `prepaint-family.global.js`: the mode script's attributes, plus
 * `data-product-modes` and `data-migrate-mode`.
 */
export declare function prepaintFamilyGlobalSource(): string;
