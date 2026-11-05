/**
 * Fetching the one configured catalog index.
 *
 * The URL is the consumer's (`external.catalog.url`), checked by
 * `resolveCatalogSource`; nothing a person or a stored value says becomes a
 * URL. The request is a CORS fetch with the configured credentials mode,
 * `redirect: "error"` (the index URL must be final) and `cache: "no-cache"`
 * (revalidate, so a published update is seen). The response must be 2xx,
 * `application/json`, and at most `MAX_INDEX_BYTES`; the body is parsed and
 * validated with the shared validator (`validateCatalogIndex`), its catalog
 * id and layer must be the configured ones, and every href is resolved
 * against the index URL and must stay under the index's directory on its
 * origin, as the asset-path grammar already guarantees.
 *
 * What this cannot constrain: a stylesheet is loaded by a `<link>`, whose
 * request a page cannot forbid from following a redirect. Its integrity is
 * still checked on the final response's bytes, so a redirect can only
 * deliver the bytes the index names; it can make the request reach another
 * host, which the page's CSP `style-src` should restrict.
 */
import type { CatalogIndex } from "../external/schema.ts";
import type { CatalogSource } from "./boot.ts";
/** The members of a fetch response the discovery reads. */
export interface ResponseLike {
    readonly ok: boolean;
    readonly status: number;
    readonly headers: {
        get(name: string): string | null;
    };
    text(): Promise<string>;
}
export type FetchLike = (url: string, init: Record<string, unknown>) => Promise<ResponseLike>;
/** The absolute URL of an index href, refusing anything outside the index's directory. */
export declare function catalogAssetUrl(source: CatalogSource, href: string): string;
/** Fetch, parse and validate the index. Rejects with a message naming the problem. */
export declare function fetchCatalogIndex(source: CatalogSource, fetch: FetchLike, signal: unknown): Promise<CatalogIndex>;
