/**
 * What a catalog controller does over time, beyond a person's choices:
 * discovery, refresh, restoring a stored theme, upgrading the stylesheet of
 * the theme in force, the preview sheet, and checking the static stylesheet
 * the page booted with.
 *
 * - **Fetches run one after another.** Discovery and every refresh are
 *   queued on one chain, so index responses are applied in request order and
 *   an older response can never replace a newer one. Only the fetch and the
 *   offer's replacement are queued; the loads they start (restore, upgrade,
 *   previews) run outside the chain, each guarded by identity, so a
 *   stylesheet that never answers cannot block a later refresh.
 * - **Revisions govern offers.** A higher revision replaces the offer as a
 *   whole; the same content again changes nothing; a lower revision, or the
 *   same revision with other content, is refused and the offer stays.
 * - **Applying an offer never changes what is shown.** A theme in force the
 *   new offer lacks stays in force as a retired choice (its applied entry).
 * - **Upgrade.** When the offer names other bytes for the theme in force
 *   (build, URL or integrity), they are staged and swapped in when they load,
 *   with their label and modes, writing nothing. A failed upgrade keeps the
 *   build in force. The catalog withdrawing a newer build (the offer falling
 *   back to the page's static descriptor) never downgrades the build in
 *   force: a static entry is not an upgrade.
 * - **Restore.** A stored external theme that was not delivered statically
 *   is pursued after discovery as a restore intent (`pursue`), which any
 *   later theme or mode choice supersedes. If the offer lacks it, the page
 *   stays as it is, storage is not touched, and `lastError` is "unavailable".
 * - **Boot check.** When the theme painted first is a static one, its
 *   stylesheet is verified with the same probe the decision uses
 *   (`staticReady`). If it is missing while still shown, the page moves to
 *   `external.fallback` without writing storage (`settleStaticReadiness`).
 *
 * Every step re-checks disposal after each notification it causes, so a
 * subscriber that disposes the controller stops all later work.
 */
import { loadStylesheet, PREVIEWS_ATTRIBUTE } from "./assets.js";
import { catalogAssetUrl, fetchCatalogIndex } from "./discovery.js";
import { mergeOffer } from "./offer.js";
import { applyOwned, commit, declaredStatic, publish, pursue, settleStaticReadiness, stage, staticReady, } from "./owner.js";
import { appliedMatches, sameAsset } from "./readiness.js";
import { catalogFailure } from "./state.js";
const settled = (status, revision) => Object.freeze({ status, revision });
/** Replace the offer with an index's (and the static themes'); what is shown does not change. */
function applyIndex(owner, index, text) {
    var _a;
    var _b, _c, _d;
    const source = owner.boot.external.catalog;
    const merged = mergeOffer(owner.boot.external.statics, index, (href) => catalogAssetUrl(source, href));
    const current = owner.appearance.family;
    const inForce = (_c = (_b = (_a = owner.applied.get(current)) === null || _a === void 0 ? void 0 : _a.entry) !== null && _b !== void 0 ? _b : owner.offer.find((entry) => entry.id === current)) !== null && _c !== void 0 ? _c : owner.retired;
    owner.retired = inForce !== null && inForce !== undefined && !merged.entries.some((entry) => entry.id === current) ? inForce : null;
    owner.offer = merged.entries;
    owner.indexText = text;
    owner.catalog = { status: "ready", revision: index.revision };
    if (merged.conflicts.length > 0) {
        const ids = merged.conflicts.join(", ");
        owner.lastError = catalogFailure("conflict", (_d = merged.conflicts[0]) !== null && _d !== void 0 ? _d : null, `The catalog describes the page's build of ${ids} differently; the page's own is kept`);
    }
    publish(owner);
}
/**
 * Load the index's preview sheet, replacing the previous one once it has
 * loaded. Only the newest request may replace it or report.
 */
async function loadPreviews(owner, index) {
    var _a, _b, _c;
    const source = owner.boot.external.catalog;
    const css = { href: catalogAssetUrl(source, index.previews.href), integrity: index.previews.integrity };
    if (owner.disposed || (((_a = owner.previews) === null || _a === void 0 ? void 0 : _a.href) === css.href && owner.previews.integrity === css.integrity))
        return;
    const load = loadStylesheet(owner.host.document, source, css, [PREVIEWS_ATTRIBUTE, String(index.revision)], false);
    (_b = owner.previewsLoad) === null || _b === void 0 ? void 0 : _b.cancel();
    owner.previewsLoad = load;
    const newest = () => !owner.disposed && owner.previewsLoad === load;
    try {
        const link = await load.promise;
        if (!newest()) {
            link.remove();
            return;
        }
        owner.previewsLoad = null;
        (_c = owner.previews) === null || _c === void 0 ? void 0 : _c.remove();
        owner.previews = link;
    }
    catch (error) {
        if (!newest())
            return;
        owner.previewsLoad = null;
        owner.lastError = catalogFailure("previews-failed", null, `Theme previews could not be loaded: ${error.message}`);
        publish(owner);
    }
}
/**
 * Stage other bytes for the theme in force and swap them in when they load;
 * never a selection, never a write. Only this upgrade's own entry, still
 * offered and still the theme in force, may commit or report. A publisher's
 * rollback (a newer revision naming an older build, even the page's static
 * one) is an upgrade like any other: revisions, not versions, govern.
 */
async function upgradeInForce(owner) {
    const id = owner.appearance.theme;
    const entry = owner.offer.find((candidate) => candidate.id === id);
    const applied = owner.applied.get(id);
    // An entry without a stylesheet (the catalog withdrew its build; only the page's static descriptor is left) is
    // never an upgrade: the build in force is not silently downgraded.
    if (owner.disposed || entry === undefined || applied === undefined || entry.css === null)
        return;
    if (appliedMatches(applied, entry, owner.staticReadiness.get(id)))
        return;
    const stillCurrent = () => !owner.disposed && owner.appearance.theme === id
        && sameAsset(owner.offer.find((candidate) => candidate.id === id), entry);
    let link;
    try {
        link = await stage(owner, entry);
    }
    catch (error) {
        if (!stillCurrent())
            return;
        owner.lastError = catalogFailure("load-failed", id, `The new build of ${entry.label} could not be loaded; the current one stays: ${error.message}`);
        publish(owner);
        return;
    }
    if (!stillCurrent())
        return;
    applyOwned(owner, entry, link);
    commit(owner, id, owner.appearance.mode, { persist: false, resolves: false, keepError: true });
}
/** Restore the stored theme the page could not show at first paint, unless the person has chosen since. */
async function restoreStored(owner) {
    const id = owner.restoring;
    if (owner.disposed || id === null)
        return;
    const entry = owner.offer.find((candidate) => candidate.id === id);
    if (entry === undefined) {
        owner.restoring = null;
        owner.lastError = catalogFailure("unavailable", id, "Your saved theme is no longer offered; the default is shown");
        publish(owner);
        return;
    }
    await pursue(owner, entry, "restore");
}
/** Why an index may not replace the applied one: "" for the same content again, a message, or null to apply it. */
function revisionRefusal(owner, index, text) {
    const current = owner.catalog.revision;
    if (current === null || owner.indexText === null)
        return null;
    if (index.revision > current)
        return null;
    if (index.revision === current)
        return text === owner.indexText ? "" : `Catalog revision ${current} was served again with other content; the applied offer stays`;
    return `Catalog revision ${index.revision} is older than the applied ${current}; the applied offer stays`;
}
const disposedFetch = () => ({ result: settled("disposed", null), index: null });
/** Record a failed fetch: the page stays as it is. */
function fetchFailed(owner, initial, error) {
    if (initial)
        owner.restoring = null;
    owner.catalog = { status: "failed", revision: owner.catalog.revision };
    owner.lastError = catalogFailure("discovery-failed", null, `The theme catalog could not be loaded: ${error.message}`);
    publish(owner);
    return { result: settled("failed", owner.catalog.revision), index: null };
}
/** The queued part: fetch the index and, under the revision rules, replace the offer. */
async function fetchIndex(owner, initial) {
    if (owner.disposed)
        return disposedFetch();
    const controller = new AbortController();
    owner.abort = controller;
    owner.catalog = { status: "loading", revision: owner.catalog.revision };
    publish(owner);
    if (owner.disposed)
        return disposedFetch();
    let index;
    try {
        index = await fetchCatalogIndex(owner.boot.external.catalog, owner.host.fetch.bind(owner.host), controller.signal);
    }
    catch (error) {
        return owner.disposed ? disposedFetch() : fetchFailed(owner, initial, error);
    }
    if (owner.disposed)
        return disposedFetch();
    const text = JSON.stringify(index);
    const refusal = revisionRefusal(owner, index, text);
    if (refusal !== null) {
        owner.catalog = { status: "ready", revision: owner.catalog.revision };
        if (refusal !== "")
            owner.lastError = catalogFailure("stale-revision", null, refusal);
        publish(owner);
        return { result: settled(refusal === "" ? "ready" : "failed", owner.catalog.revision), index: null };
    }
    applyIndex(owner, index, text);
    return { result: settled("ready", index.revision), index };
}
/** Queue one fetch on the owner's chain; then start (and await) the loads its offer calls for. */
async function queuedFetch(owner, initial) {
    if (owner.boot.external.catalog === null)
        return settled("no-catalog", null);
    const run = owner.fetchChain.then(() => fetchIndex(owner, initial));
    owner.fetchChain = run.catch(() => undefined);
    const fetched = await run;
    if (fetched.index === null)
        return fetched.result;
    if (owner.disposed)
        return settled("disposed", fetched.result.revision);
    await Promise.all([restoreStored(owner), upgradeInForce(owner), loadPreviews(owner, fetched.index)]);
    return owner.disposed ? settled("disposed", fetched.result.revision) : fetched.result;
}
/** Discovery: started once; later calls return the same promise. After disposal, nothing is fetched. */
export function discover(owner) {
    if (owner.disposed)
        return Promise.resolve(settled("disposed", null));
    if (owner.discovery === null)
        owner.discovery = queuedFetch(owner, true);
    return owner.discovery;
}
/** Refresh: fetch again, queued after discovery and any earlier refresh. */
export function refresh(owner) {
    if (owner.disposed)
        return Promise.resolve(settled("disposed", null));
    if (owner.discovery === null)
        owner.discovery = queuedFetch(owner, true);
    return queuedFetch(owner, false);
}
/**
 * Verify the static stylesheet the page booted with, with the decision's
 * own probe, and record the result where every path reacts to it
 * (`settleStaticReadiness`): if it is missing while still shown, the page
 * moves to the fallback, writing nothing.
 */
export async function verifyBootStatic(owner) {
    var _a;
    const theme = declaredStatic(owner, owner.appearance.theme);
    if (theme === undefined || ((_a = owner.applied.get(theme.id)) === null || _a === void 0 ? void 0 : _a.kind) !== "static")
        return;
    const ready = await staticReady(owner, theme);
    if (!owner.disposed)
        settleStaticReadiness(owner, theme, ready);
}
