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
/** The attribute marking a link the controller owns. */
const ASSET_ATTRIBUTE = "data-atomicstrata-theme-asset";
/** The attribute marking the controller's preview sheet. */
export const PREVIEWS_ATTRIBUTE = "data-atomicstrata-theme-previews";
const STAGED_MEDIA = "not all";
/** The key a stylesheet load is shared by: its URL and integrity, the identity of its bytes. */
export function loadKey(css) {
    return `${css.href} ${css.integrity}`;
}
/** The marker value of an owned link: theme id and build. */
export function assetKey(id, build) {
    return `${id} ${build}`;
}
function crossOriginOf(source) {
    return source.credentials === "include" ? "use-credentials" : "anonymous";
}
/**
 * Append a stylesheet link and resolve with it on `load`, or reject (and
 * remove it) on `error` or `cancel`. `staged` links are inactive until
 * `activate`. Cancelling settles the promise at once, whatever the network
 * does, so a disposed controller never waits on a request.
 */
export function loadStylesheet(doc, source, css, marker, staged) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    if (staged)
        link.setAttribute("media", STAGED_MEDIA);
    link.crossOrigin = crossOriginOf(source);
    link.integrity = css.integrity;
    link.setAttribute(marker[0], marker[1]);
    let settle = () => undefined;
    const promise = new Promise((resolve, reject) => {
        settle = (outcome) => {
            settle = () => undefined;
            link.removeEventListener("load", onLoad);
            link.removeEventListener("error", onError);
            if (outcome === "load") {
                resolve(link);
                return;
            }
            link.remove();
            const reason = outcome === "cancel" ? "was cancelled" : "did not load (network, CORS, CSP or integrity)";
            reject(new Error(`the stylesheet ${css.href} ${reason}`));
        };
    });
    const onLoad = () => settle("load");
    const onError = () => settle("error");
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
    link.href = css.href;
    doc.head.append(link);
    return { promise, cancel: () => settle("cancel") };
}
/** Make a staged link apply. Synchronous: it is part of a commit. */
export function activate(link) {
    link.removeAttribute("media");
}
/** The owned links already in the document, as `[id, build, link]`, left by an earlier controller. */
export function ownedLinks(doc) {
    return Array.from(doc.querySelectorAll(`link[${ASSET_ATTRIBUTE}]`)).map((link) => {
        var _a;
        const [id, build] = ((_a = link.getAttribute(ASSET_ATTRIBUTE)) !== null && _a !== void 0 ? _a : "").split(" ");
        return [id, build, link];
    });
}
