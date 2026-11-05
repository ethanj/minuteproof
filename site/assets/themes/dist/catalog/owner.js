/**
 * The catalog controller's owner: its state and every transition.
 *
 * Invariants:
 *
 * - **One decision.** Whether a theme's stylesheet is ready, must be
 *   verified, must be loaded or is unavailable is decided by `decide`
 *   (`readiness.ts`), from the applied asset (complete identity: build plus
 *   URL and integrity, or a verified static delivery) and the page's static
 *   readiness. Selection and restore go through `pursue`; upgrade and
 *   adoption use the same identity check.
 * - **Latest intent wins.** Every theme selection, and a restore, takes the
 *   next `generation`. Work that completes later commits only if its
 *   generation is still the newest and its stylesheet is still the one on
 *   offer. A built-in selection commits at once. A mode choice supersedes a
 *   pending restore (the startup network must not override the person) but
 *   not an explicit external selection, which then commits with the mode in
 *   force.
 * - **Nothing shown before it is ready.** Root attributes are stamped,
 *   storage written and the stylesheet activated in one synchronous commit,
 *   after the decision says ready. Storage keeps the preference itself,
 *   never the effective mode, and is never written by a restore, an upgrade,
 *   a fallback or an operating-system change.
 * - **Callback boundaries.** Every `publish` calls subscribers, which may
 *   dispose the controller or choose again; after each, nothing creates a
 *   resource or commits without re-checking disposal and generation.
 * - **Ownership.** Only links the controller created are removed, and
 *   disposal cancels loads and waits so every promise settles at once.
 */
import { writeItem } from "../boot-core.js";
import { familyOfTheme, stampAppearance } from "../family-core.js";
import { stampMode, validMode } from "../mode-core.js";
import { isExternalThemeId } from "../external/id.js";
import { activate, assetKey, loadKey, loadStylesheet, } from "./assets.js";
import { catalogAppearance } from "./boot.js";
import { decide, probeSentinel, sameAsset, sentinelOf, } from "./readiness.js";
import { catalogFailure, choicesOf, stateOf, } from "./state.js";
/**
 * Rebuild the frozen state and notify; a notification in progress stops at
 * a newer one. The choice list is rebuilt only when the offer, the retired
 * theme or an applied asset changed, so renderers can compare it by identity.
 */
export function publish(owner) {
    var _a;
    var _b;
    const retired = owner.retired !== null && owner.retired.id === owner.appearance.family ? owner.retired : null;
    owner.retired = retired;
    const previous = owner.state;
    const from = owner.choicesFrom;
    const family = owner.appearance.family;
    const sameChoices = previous !== undefined && from.offer === owner.offer && from.retired === retired
        && from.applied === owner.appliedVersion && from.family === family;
    const choices = sameChoices ? previous.choices : choicesOf(owner.builtIns, offerAsApplied(owner), retired);
    owner.choicesFrom = { offer: owner.offer, retired, applied: owner.appliedVersion, family };
    const state = stateOf({
        appearance: owner.appearance, choices, pending: (_b = (_a = owner.pending) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        restoring: owner.restoring, catalog: owner.catalog, lastError: owner.lastError, applied: owner.applied.get(owner.appearance.theme),
    });
    owner.state = state;
    for (const listener of owner.listeners.slice()) {
        if (owner.disposed || owner.state !== state)
            return;
        listener(state);
    }
}
/**
 * The offer as a person sees it: the theme in force is described by the
 * bytes in force (the label and modes it was applied with, until another
 * build commits); every other choice by what selecting it would show, the
 * offer.
 */
function offerAsApplied(owner) {
    const inForce = owner.appearance.family;
    return owner.offer.map((entry) => { var _a; var _b; return (entry.id === inForce ? (_b = (_a = owner.applied.get(entry.id)) === null || _a === void 0 ? void 0 : _a.entry) !== null && _b !== void 0 ? _b : entry : entry); });
}
/** The family entry for an id: built-in; else its applied entry; else on offer, or the retired theme in force. */
function entryFor(owner, id) {
    var _a, _b;
    var _c, _d;
    const builtIn = owner.builtIns.find((entry) => entry.id === id);
    if (builtIn !== undefined)
        return builtIn;
    const offered = (_d = (_c = (_a = owner.applied.get(id)) === null || _a === void 0 ? void 0 : _a.entry) !== null && _c !== void 0 ? _c : owner.offer.find((entry) => entry.id === id)) !== null && _d !== void 0 ? _d : (((_b = owner.retired) === null || _b === void 0 ? void 0 : _b.id) === id ? owner.retired : undefined);
    return offered === undefined ? undefined : { id: offered.id, modes: offered.modes.slice() };
}
/** The page's static descriptor for an id. */
export function declaredStatic(owner, id) {
    return owner.boot.external.statics.find((entry) => entry.id === id);
}
/** What `decide` needs to know about one id now. */
function inputsFor(owner, id) {
    return {
        applied: owner.applied.get(id), declared: declaredStatic(owner, id), readiness: owner.staticReadiness.get(id),
        inForce: owner.appearance.family === id,
    };
}
/**
 * Whether the theme in force is shown from bytes known to be in force: a
 * built-in theme, an owned link, or a verified static delivery. Only then is
 * its id stored; a mode chosen while a static theme is still unverified
 * stores the mode alone.
 */
function bytesInForce(owner) {
    var _a;
    const id = owner.appearance.theme;
    if (!isExternalThemeId(id))
        return true;
    return ((_a = owner.applied.get(id)) === null || _a === void 0 ? void 0 : _a.kind) === "owned" || owner.staticReadiness.get(id) === "verified";
}
/** Stamp the complete state for `id` and `preference`, store it if asked, and notify once. */
export function commit(owner, id, preference, options) {
    var _a;
    const entry = entryFor(owner, id);
    if (entry === undefined)
        throw new Error(`@atomicstrata/themes: "${id}" is not offered`);
    owner.appearance = catalogAppearance(entry, preference, owner.media.matches);
    stampAppearance(owner.host, owner.appearance);
    if (options.persist) {
        const { mode, theme } = owner.boot.family;
        if (mode.storageKey !== null)
            writeItem(owner.host, mode.storageKey, preference);
        if (theme.storageKey !== null && bytesInForce(owner))
            writeItem(owner.host, theme.storageKey, owner.appearance.theme);
    }
    if (options.resolves) {
        owner.pending = null;
        owner.restoring = null;
    }
    if (options.keepError !== true)
        owner.lastError = (_a = options.error) !== null && _a !== void 0 ? _a : null;
    publish(owner);
}
/** Load (or reuse) the staged stylesheet of an offer entry; loads are shared by URL and integrity. */
export function stage(owner, entry) {
    const source = owner.boot.external.catalog;
    if (entry.css === null || source === null)
        return Promise.reject(new Error(`no stylesheet is offered for ${entry.label}`));
    const key = loadKey(entry.css);
    const staged = owner.staged.get(key);
    if (staged !== undefined)
        return Promise.resolve(staged);
    const inFlight = owner.loading.get(key);
    if (inFlight !== undefined)
        return inFlight.promise;
    const marker = ["data-atomicstrata-theme-asset", assetKey(entry.id, entry.build)];
    const load = loadStylesheet(owner.host.document, source, entry.css, marker, true);
    owner.loading.set(key, load);
    load.promise.then((link) => {
        owner.loading.delete(key);
        if (owner.disposed)
            link.remove();
        else
            owner.staged.set(key, link);
    }, () => owner.loading.delete(key));
    return load.promise;
}
/** Replace the applied asset of a theme, removing an owned link it replaces. */
function setApplied(owner, asset) {
    const previous = owner.applied.get(asset.id);
    if ((previous === null || previous === void 0 ? void 0 : previous.kind) === "owned" && previous.link !== asset.link)
        previous.link.remove();
    owner.applied.set(asset.id, Object.freeze(asset));
    owner.appliedVersion += 1;
}
/** Make a loaded link the applied stylesheet of its theme, activating it. Part of a commit. */
export function applyOwned(owner, entry, link) {
    activate(link);
    if (entry.css !== null)
        owner.staged.delete(loadKey(entry.css));
    setApplied(owner, { kind: "owned", id: entry.id, build: entry.build, link, href: link.href, integrity: link.integrity, entry });
}
/**
 * An adopted link that matched an offer exactly takes that offer entry as
 * its pinned metadata, so a later offer's label and modes never describe it.
 */
function pinAdoptedEntry(owner, entry) {
    const applied = owner.applied.get(entry.id);
    if ((applied === null || applied === void 0 ? void 0 : applied.kind) !== "owned" || applied.entry !== null)
        return;
    owner.applied.set(entry.id, Object.freeze({ ...applied, entry }));
    owner.appliedVersion += 1;
}
/** Make the page's own verified stylesheet the applied one (an owned link of another build is removed). */
function applyStatic(owner, entry) {
    const applied = owner.applied.get(entry.id);
    if ((applied === null || applied === void 0 ? void 0 : applied.kind) === "static" && applied.build === entry.build)
        return;
    setApplied(owner, { kind: "static", id: entry.id, build: entry.build, link: null, entry });
}
/**
 * Read with the theme's own owned link (another build of the same id, which
 * carries the same selectors and comes later in the document) switched off,
 * so the probe sees the page's own delivery and not the owned one. The read
 * is synchronous and the link restored before returning: nothing is painted
 * in between.
 */
function withOwnedSuspended(owner, id, read) {
    const applied = owner.applied.get(id);
    const link = (applied === null || applied === void 0 ? void 0 : applied.kind) === "owned" && applied.link.getAttribute("media") === null ? applied.link : null;
    link === null || link === void 0 ? void 0 : link.setAttribute("media", "not all");
    try {
        return read();
    }
    finally {
        link === null || link === void 0 ? void 0 : link.removeAttribute("media");
    }
}
/**
 * Whether the page's own stylesheet for `theme` is in force: the sentinel
 * read on a probe now, or, if absent while the window is still loading,
 * after its `load`. Disposal settles the wait with false.
 */
export function staticReady(owner, theme) {
    const present = () => withOwnedSuspended(owner, theme.id, () => probeSentinel(owner.host, theme.id)) === sentinelOf(theme);
    if (present())
        return Promise.resolve(true);
    if (owner.host.document.readyState === "complete")
        return Promise.resolve(false);
    return new Promise((resolve) => {
        const host = owner.host;
        const onLoad = () => {
            host.removeEventListener("load", onLoad);
            resolve(!owner.disposed && present());
        };
        host.addEventListener("load", onLoad);
        owner.cleanups.push(() => {
            host.removeEventListener("load", onLoad);
            resolve(false);
        });
    });
}
/**
 * Record what a probe found about a static delivery: the one place that
 * reacts to it. If it is missing and the theme in force is shown from it,
 * the page moves to `external.fallback` at once, writing nothing, and
 * without taking a generation: a pending intent goes on (to rescue the theme
 * from the catalog, or to fail).
 */
export function settleStaticReadiness(owner, theme, ready) {
    var _a;
    owner.staticReadiness.set(theme.id, ready ? "verified" : "missing");
    if (ready || owner.appearance.theme !== theme.id || ((_a = owner.applied.get(theme.id)) === null || _a === void 0 ? void 0 : _a.kind) !== "static")
        return;
    owner.applied.delete(theme.id);
    owner.appliedVersion += 1;
    const fallback = familyOfTheme(owner.boot.external.fallback);
    const error = catalogFailure("static-css-missing", theme.id, `The stylesheet of ${theme.label} is not in force; ${fallback} is shown instead`);
    commit(owner, fallback, owner.appearance.mode, { persist: false, resolves: false, error });
}
/** End a pending intent without showing it: clear it and report why. */
function failPending(owner, pending, error) {
    owner.pending = null;
    if (pending.kind === "restore")
        owner.restoring = null;
    owner.lastError = error;
    publish(owner);
    return { status: "failed", error };
}
/** Whether work for `pending` may still act: not disposed, still the newest intent. */
function current(owner, pending) {
    return !owner.disposed && owner.generation === pending.generation;
}
/** Commit an intent whose stylesheet is ready. */
function commitIntent(owner, pending) {
    commit(owner, pending.id, owner.appearance.mode, { persist: pending.kind === "select", resolves: true });
    return { status: "applied", state: owner.state };
}
/**
 * After an asynchronous step: superseded or disposed; the theme withdrawn
 * (failed); its offered stylesheet changed (pursue the newest one); or null
 * to go on.
 */
function afterWait(owner, pending, entry) {
    if (!current(owner, pending))
        return { status: "superseded" };
    const offered = owner.offer.find((candidate) => candidate.id === entry.id);
    if (offered === undefined)
        return failPending(owner, pending, catalogFailure("unavailable", entry.id, `${entry.label} is no longer offered`));
    return sameAsset(offered, entry) ? null : advance(owner, pending, offered);
}
/** Verify the page's own stylesheet, then commit it, or rescue it from the catalog, or fail. */
async function verifyThenCommit(owner, pending, entry, theme) {
    const ready = await staticReady(owner, theme);
    if (owner.disposed)
        return { status: "superseded" };
    settleStaticReadiness(owner, theme, ready);
    const changed = afterWait(owner, pending, entry);
    if (changed !== null)
        return changed;
    if (!ready)
        return advance(owner, pending, entry);
    applyStatic(owner, entry);
    return commitIntent(owner, pending);
}
/** Load the offered stylesheet, then commit it, or fail with nothing changed. */
async function loadThenCommit(owner, pending, entry) {
    let link;
    try {
        link = await stage(owner, entry);
    }
    catch (error) {
        const changed = afterWait(owner, pending, entry);
        if (changed !== null)
            return changed;
        return failPending(owner, pending, catalogFailure("load-failed", entry.id, `Could not load ${entry.label}: ${error.message}`));
    }
    const changed = afterWait(owner, pending, entry);
    if (changed !== null)
        return changed;
    applyOwned(owner, entry, link);
    return commitIntent(owner, pending);
}
/** Take the next step of an intent, by the one decision. */
function advance(owner, pending, entry) {
    const decision = decide(entry, inputsFor(owner, entry.id));
    if (decision.kind === "ready") {
        if (decision.via === "static")
            applyStatic(owner, entry);
        if (decision.via === "applied")
            pinAdoptedEntry(owner, entry);
        return commitIntent(owner, pending);
    }
    if (decision.kind === "verify")
        return verifyThenCommit(owner, pending, entry, decision.theme);
    if (decision.kind === "load")
        return loadThenCommit(owner, pending, entry);
    const why = declaredStatic(owner, entry.id) === undefined ? "no stylesheet is offered for it" : "the page's stylesheet for it is not in force";
    return failPending(owner, pending, catalogFailure("static-css-missing", entry.id, `${entry.label} cannot be shown: ${why}`));
}
/** Start an intent for `entry` as the newest of `kind`: decide; announce it unless ready at once; go on. */
export function pursue(owner, entry, kind) {
    owner.generation += 1;
    const pending = { generation: owner.generation, id: entry.id, kind };
    if (decide(entry, inputsFor(owner, entry.id)).kind === "ready")
        return Promise.resolve(advance(owner, pending, entry));
    owner.pending = pending;
    publish(owner);
    // A subscriber may have disposed the controller, or chosen again, while hearing of this intent.
    if (!current(owner, pending))
        return Promise.resolve({ status: "superseded" });
    return Promise.resolve(advance(owner, pending, entry));
}
const rejected = (reason) => Promise.resolve(Object.freeze({ status: "rejected", reason }));
/** A person's theme choice: built-in at once, external once its stylesheet is ready. Cancels a pending restore. */
export function select(owner, value) {
    var _a;
    if (owner.disposed)
        return rejected("disposed");
    const choice = owner.state.choices.find((entry) => entry.id === value);
    if (choice === undefined)
        return rejected("unknown-id");
    if (choice.retired && choice.id !== owner.appearance.family)
        return rejected("retired");
    owner.restoring = null;
    const entry = (_a = owner.offer.find((candidate) => candidate.id === choice.id)) !== null && _a !== void 0 ? _a : (choice.retired ? owner.retired : null);
    if (entry === null) {
        owner.generation += 1;
        commit(owner, choice.id, owner.appearance.mode, { persist: true, resolves: true });
        return Promise.resolve({ status: "applied", state: owner.state });
    }
    return pursue(owner, entry, "select");
}
/** A person's mode choice: applied at once to the theme in force, and stored as the preference. */
export function selectMode(owner, value) {
    var _a;
    if (owner.disposed)
        throw new Error("@atomicstrata/themes: this theme catalog controller was disposed");
    const preference = validMode(value, owner.boot.family.mode);
    if (((_a = owner.pending) === null || _a === void 0 ? void 0 : _a.kind) === "restore") {
        owner.generation += 1;
        owner.pending = null;
    }
    owner.restoring = null;
    commit(owner, owner.appearance.family, preference, { persist: true, resolves: false });
    return preference;
}
/** The operating system's scheme changed: re-resolve and notify if the page changes. Never writes storage. */
export function followSystem(owner) {
    if (owner.disposed)
        return;
    const entry = entryFor(owner, owner.appearance.family);
    if (entry === undefined)
        return;
    const next = catalogAppearance(entry, owner.appearance.mode, owner.media.matches);
    if (next.theme === owner.appearance.theme && next.scheme === owner.appearance.scheme)
        return;
    owner.appearance = next;
    stampAppearance(owner.host, next);
    publish(owner);
}
/**
 * Release everything: later work, loads and waits (settled at once),
 * listeners, owned links (except the applied stylesheet of the theme in
 * force, left marked for a successor to adopt or remove) and the two root
 * attributes only this owner stamps. Idempotent.
 */
export function dispose(owner) {
    var _a, _b, _c;
    if (owner.disposed)
        return;
    owner.disposed = true;
    owner.generation += 1;
    (_a = owner.abort) === null || _a === void 0 ? void 0 : _a.abort();
    for (const load of [...owner.loading.values()])
        load.cancel();
    (_b = owner.previewsLoad) === null || _b === void 0 ? void 0 : _b.cancel();
    for (const cleanup of owner.cleanups.splice(0))
        cleanup();
    for (const link of owner.staged.values())
        link.remove();
    owner.staged.clear();
    (_c = owner.previews) === null || _c === void 0 ? void 0 : _c.remove();
    for (const asset of owner.applied.values()) {
        if (asset.kind === "owned" && asset.id !== owner.appearance.theme)
            asset.link.remove();
    }
    owner.listeners = [];
    const root = owner.host.document.documentElement;
    root.removeAttribute("data-theme-scheme");
    root.removeAttribute("data-design-mode");
}
