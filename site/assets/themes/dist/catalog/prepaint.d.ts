/**
 * The generated pre-paint script of a catalog page
 * (`@atomicstrata/themes/catalog/prepaint`).
 *
 * `prepaintCatalogSource(config)` checks a catalog configuration completely
 * (and throws, so a bad build fails instead of shipping) and returns one
 * classic script with the configuration embedded. The same text is both
 * deliveries: save it as a same-origin file, or place it in an inline
 * `<script>` allowed by its hash. It must run in `<head>` before the first
 * stylesheet, like the family scripts.
 *
 * The script is assembled from the source text of the resolver's own
 * functions (`boot-core.ts`, `mode-core.ts`, `family-core.ts`,
 * `catalog/boot.ts`), so there is no second implementation. It stamps the
 * first state and leaves a boot record; it never fetches, waits, hides the
 * page or writes `document`. A stored external theme that is not delivered
 * statically is therefore not shown at first paint: the page boots on the
 * default and the controller restores it after discovery.
 *
 * Run it at build time from an unbundled install: like `prepaintSource`, it
 * relies on `Function.prototype.toString` returning the shipped source.
 */
import { type ThemeCatalogConfig } from "./boot.ts";
export type { StaticExternalTheme, ThemeCatalogConfig } from "./boot.ts";
/** A classic script that applies a catalog configuration before first paint. Throws on an invalid configuration. */
export declare function prepaintCatalogSource(config: ThemeCatalogConfig): string;
