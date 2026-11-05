/**
 * The stylesheets a catalog controller loads, and which one is in effect for
 * each external theme.
 *
 * Every external stylesheet is loaded **staged**: a `<link rel="stylesheet">`
 * appended to `<head>` with `media="not all"`, so its rules apply nowhere
 * while it loads, and with `integrity` (the index's SHA-384) and
 * `crossorigin` (`anonymous`, or `use-credentials` when the catalog is
 * configured with `include`). A browser fetches and verifies a staged sheet
 * like any other and fires `load` or `error`. Readiness is the stylesheet's
 * readiness only: fonts load later under `font-display: swap`, so no
 * selection waits on a font.
 *
 * Activation (removing `media`) is a separate, synchronous step, taken only
 * when a selection commits. That is what lets a new build of the theme in
 * force load beside the active one without changing the page: both carry the
 * same selectors, and the staged one matches nothing until it is activated
 * and the old one removed in the same step.
 *
 * The applied asset of a theme (its build and link) is kept apart from what
 * the catalog offers. Links the controller created are marked
 * `data-atomicstrata-theme-asset="<id> <build>"` and are the only ones it
 * ever removes; a stylesheet the consumer linked or inlined for a static
 * theme is recorded with no link, and never touched.
 */
import type { ExternalThemeId } from "../external/id.ts";
import type { CatalogSource } from "./boot.ts";
import type { OfferEntry } from "./offer.ts";
/** The members of a `<link>` element the controller uses. */
export interface LinkLike {
    rel: string;
    href: string;
    integrity: string;
    crossOrigin: string | null;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    addEventListener(type: "load" | "error", listener: () => void): void;
    removeEventListener(type: "load" | "error", listener: () => void): void;
    remove(): void;
}
/** The document members the controller uses beyond the root. */
export interface CatalogDocument {
    readonly readyState: string;
    readonly head: {
        append(node: LinkLike): void;
    };
    createElement(tag: "link"): LinkLike;
    querySelectorAll(selector: string): ArrayLike<LinkLike>;
}
/** The attribute marking the controller's preview sheet. */
export declare const PREVIEWS_ATTRIBUTE = "data-atomicstrata-theme-previews";
/**
 * The stylesheet in effect for one external theme (`readiness.ts` holds the
 * table of legal states):
 *
 * - `static`: the page's own delivery (linked or inline in `<head>`), never
 *   touched; its identity is the descriptor's build, trusted once verified.
 * - `owned`: a link this controller loaded (or adopted from an earlier
 *   controller), identified by build plus the URL and integrity it was
 *   actually loaded with. `entry` is the offer entry it was applied from,
 *   whose label and modes stay in force until another build commits; it is
 *   null only for an adopted link not yet matched against an offer.
 */
export type AppliedAsset = {
    readonly kind: "static";
    readonly id: ExternalThemeId;
    readonly build: string;
    readonly link: null;
    readonly entry: OfferEntry;
} | {
    readonly kind: "owned";
    readonly id: ExternalThemeId;
    readonly build: string;
    readonly link: LinkLike;
    readonly href: string;
    readonly integrity: string;
    readonly entry: OfferEntry | null;
};
/** A stylesheet load that can be cancelled: the link is removed and the promise rejects. */
export interface StylesheetLoad {
    readonly promise: Promise<LinkLike>;
    cancel(): void;
}
/** The key a stylesheet load is shared by: its URL and integrity, the identity of its bytes. */
export declare function loadKey(css: {
    href: string;
    integrity: string;
}): string;
/** The marker value of an owned link: theme id and build. */
export declare function assetKey(id: string, build: string): string;
/**
 * Append a stylesheet link and resolve with it on `load`, or reject (and
 * remove it) on `error` or `cancel`. `staged` links are inactive until
 * `activate`. Cancelling settles the promise at once, whatever the network
 * does, so a disposed controller never waits on a request.
 */
export declare function loadStylesheet(doc: CatalogDocument, source: CatalogSource, css: {
    href: string;
    integrity: string;
}, marker: [name: string, value: string], staged: boolean): StylesheetLoad;
/** Make a staged link apply. Synchronous: it is part of a commit. */
export declare function activate(link: LinkLike): void;
/** The owned links already in the document, as `[id, build, link]`, left by an earlier controller. */
export declare function ownedLinks(doc: CatalogDocument): Array<[string, string, LinkLike]>;
