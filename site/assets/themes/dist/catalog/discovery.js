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
import { validateCatalogIndex } from "../external/catalog-index.js";
/** The largest index accepted, in UTF-8 bytes. */
const MAX_INDEX_BYTES = 256 * 1024;
/** The absolute URL of an index href, refusing anything outside the index's directory. */
export function catalogAssetUrl(source, href) {
    const base = new URL(source.url);
    const directory = base.href.slice(0, base.href.lastIndexOf("/") + 1);
    const resolved = new URL(href, base);
    if (resolved.origin !== base.origin || !resolved.href.startsWith(directory) || resolved.search !== "" || resolved.hash !== "") {
        throw new Error(`catalog href "${href}" resolves outside the catalog's directory`);
    }
    return resolved.href;
}
/** Fetch, parse and validate the index. Rejects with a message naming the problem. */
export async function fetchCatalogIndex(source, fetch, signal) {
    var _a;
    const response = await fetch(source.url, {
        method: "GET", mode: "cors", credentials: source.credentials, redirect: "error", cache: "no-cache", signal,
        headers: { accept: "application/json" },
    });
    if (!response.ok)
        throw new Error(`the catalog answered HTTP ${response.status}`);
    const type = (_a = response.headers.get("content-type")) !== null && _a !== void 0 ? _a : "";
    if (!/^application\/json(\s*;|$)/i.test(type))
        throw new Error(`the catalog's content type is "${type}", not application/json`);
    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_INDEX_BYTES)
        throw new Error("the catalog index is larger than 256 KiB");
    const index = validateCatalogIndex(JSON.parse(text));
    if (index.catalog !== source.id)
        throw new Error(`the index is catalog "${index.catalog}", not "${source.id}"`);
    if (index.layer !== source.layer)
        throw new Error(`the index is published for layer ${String(index.layer)}, not ${String(source.layer)}`);
    for (const href of [index.previews.href, ...index.themes.map((entry) => entry.css.href)])
        catalogAssetUrl(source, href);
    return index;
}
