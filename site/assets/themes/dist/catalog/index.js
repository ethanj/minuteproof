/**
 * External themes at run time (`@atomicstrata/themes/catalog`).
 *
 * A catalog page offers the built-in families and external themes, the
 * page's static ones and those its one configured catalog publishes,
 * through one controller. It is a separate controller, not a subtype of
 * `ThemeController`: its ids include external ids, which the closed
 * `ThemeId` union does not, and its selections are asynchronous. A page
 * uses either kind, never both:
 *
 * - `getThemeCatalogController()` adopts the state the catalog pre-paint
 *   script (`prepaintCatalogSource`) stamped, once.
 * - `createThemeCatalogController(config)` checks the configuration and the
 *   host completely, then releases any previous owner (a catalog
 *   controller, or a family page's theme controller), stamps and returns a
 *   new controller. `createThemeController` releases a catalog controller
 *   the same way, so either kind replaces the other.
 *
 * The controller's state is one frozen `ThemeCatalogState` per transition.
 * `select(id)` resolves with an outcome and never rejects: `applied`,
 * `superseded` (a newer intent won), `failed` (nothing changed) or
 * `rejected`. Its `appearance` member drives the shared UI
 * (`bindThemeSelect`, `mountAppearanceSwitch`, React's `AppearanceSwitch`).
 *
 * Importing this module touches no global; the network is used only by
 * discovery and refresh, and only for the configured catalog and the
 * assets its index names.
 */
import { releasePreviousOwner, schemeMediaOf } from "../family-core.js";
import { checkModeRoot, designModes } from "../mode-core.js";
import { ownedLinks } from "./assets.js";
import { bootCatalog, resolveCatalogBoot, } from "./boot.js";
import { discover, refresh, verifyBootStatic } from "./lifecycle.js";
import { mergeOffer } from "./offer.js";
import { dispose, followSystem, publish, select, selectMode } from "./owner.js";
export { isExternalThemeId } from "../external/id.js";
function hostError(message) {
    return new Error(`@atomicstrata/themes: a theme catalog needs ${message}`);
}
/** Check the window has everything the controller will use, before anything is changed. */
function requireCatalogHost(host, boot) {
    const doc = host.document;
    if ((doc === null || doc === void 0 ? void 0 : doc.head) === undefined || typeof doc.createElement !== "function" || typeof doc.querySelectorAll !== "function") {
        throw hostError("a document with head, createElement and querySelectorAll");
    }
    if (typeof host.getComputedStyle !== "function" || typeof host.addEventListener !== "function" || typeof host.removeEventListener !== "function") {
        throw hostError("window.getComputedStyle and window load listeners");
    }
    if (boot.external.catalog !== null && typeof host.fetch !== "function")
        throw hostError("window.fetch for its catalog");
    checkModeRoot(host);
    schemeMediaOf(host);
}
/** Dispose whatever owns the page now: a catalog controller, or a family page's theme controller. */
function releaseOwners(host) {
    const previous = host.__atomicstrataThemeCatalog;
    if (previous !== undefined && typeof previous.dispose === "function")
        previous.dispose();
    delete host.__atomicstrataThemeCatalog;
    releasePreviousOwner(host);
    delete host.__atomicstrataTheme;
}
function initialOwner(host, boot, appearance, restoring) {
    const statics = boot.external.statics;
    const offer = mergeOffer(statics, null, (href) => href).entries;
    // Only the static theme painted first is applied (declared, verified after start); every static delivery starts
    // declared, and is verified by the decision's probe before it is ever shown again.
    const painted = offer.find((entry) => entry.id === appearance.theme);
    const applied = new Map(painted === undefined ? [] : [[painted.id, Object.freeze({
                kind: "static", id: painted.id, build: painted.build, link: null, entry: painted,
            })]]);
    const owner = {
        host, boot, media: schemeMediaOf(host),
        builtIns: boot.family.families.entries.map((entry) => ({ id: entry.id, label: entry.label, modes: entry.modes })),
        appearance, offer, retired: null, choicesFrom: { offer: null, retired: null, applied: 0, family: null }, appliedVersion: 0,
        catalog: { status: boot.external.catalog === null ? "none" : "idle", revision: null }, indexText: null, previews: null, previewsLoad: null,
        applied, staticReadiness: new Map(statics.map((entry) => [entry.id, "declared"])), fetchChain: Promise.resolve(),
        loading: new Map(), staged: new Map(), pending: null, restoring, generation: 0, lastError: null, listeners: [],
        state: undefined, disposed: false, cleanups: [], abort: null, discovery: null,
    };
    // A predecessor's stylesheet for the stored theme to restore is adopted with the URL and integrity it actually
    // has, and trusted only when the offer names exactly those (`decide`). Any other owned link is removed: in
    // particular a newer build of a static theme is never shown under the static descriptor's label and modes.
    for (const [id, build, link] of ownedLinks(host.document)) {
        if (id !== restoring) {
            link.remove();
            continue;
        }
        owner.applied.set(id, Object.freeze({
            kind: "owned", id: id, build, link, href: link.href, integrity: link.integrity, entry: null,
        }));
    }
    publish(owner);
    return owner;
}
function modeFacet(owner) {
    return Object.freeze({
        ids: Object.freeze(designModes()),
        defaultMode: owner.boot.family.mode.defaultMode,
        current: () => owner.appearance.mode,
        select: (value) => selectMode(owner, value),
        subscribe: (listener) => subscribe(owner, (state) => listener(state.mode)),
    });
}
function subscribe(owner, listener) {
    owner.listeners = owner.listeners.concat([listener]);
    return () => {
        owner.listeners = owner.listeners.filter((entry) => entry !== listener);
    };
}
/** The shared UI's view: one frozen view per state, one families array per choice list. */
function appearanceFacet(owner) {
    let families = null;
    let last = null;
    const familiesOf = (state) => {
        if (families === null || families.choices !== state.choices) {
            const list = state.choices.map((choice) => Object.freeze({ id: choice.id, label: choice.label, modes: choice.modes, selectable: !choice.retired }));
            families = { choices: state.choices, list: Object.freeze(list) };
        }
        return families.list;
    };
    const view = () => {
        var _a;
        var _b;
        const state = owner.state;
        if (last === null || last.state !== state) {
            const { theme, family, mode, effectiveMode, scheme } = state;
            const error = (_b = (_a = state.lastError) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : null;
            last = { state, view: Object.freeze({ theme, family, mode, effectiveMode, scheme, families: familiesOf(state), pending: state.pending, error }) };
        }
        return last.view;
    };
    return Object.freeze({
        view,
        subscribe: (listener) => subscribe(owner, () => listener()),
        selectFamily: (id) => {
            void select(owner, id);
        },
        selectMode: (mode) => {
            selectMode(owner, mode);
        },
    });
}
function controllerOf(owner) {
    const controller = Object.freeze({
        snapshot: () => owner.state,
        subscribe: (listener) => subscribe(owner, listener),
        select: (id) => select(owner, id),
        mode: modeFacet(owner),
        discover: () => discover(owner),
        refresh: () => refresh(owner),
        dispose: () => {
            dispose(owner);
            if (owner.host.__atomicstrataThemeCatalog === controller)
                delete owner.host.__atomicstrataThemeCatalog;
        },
        appearance: appearanceFacet(owner),
    });
    return controller;
}
/** Build the controller over a stamped state, follow the system, check a static sheet, start discovery if asked. */
function start(host, boot, record) {
    const owner = initialOwner(host, boot, record.state, record.restoring);
    const onSystemChange = () => followSystem(owner);
    owner.media.addEventListener("change", onSystemChange);
    owner.cleanups.push(() => owner.media.removeEventListener("change", onSystemChange));
    const controller = controllerOf(owner);
    host.__atomicstrataThemeCatalog = controller;
    void verifyBootStatic(owner);
    if (boot.external.discovery === "on-create")
        void discover(owner);
    return controller;
}
/**
 * Check `config` and the host, release any previous owner, stamp the stored
 * or default state and return the controller.
 */
export function createThemeCatalogController(config, host = globalThis) {
    const boot = resolveCatalogBoot(config);
    requireCatalogHost(host, boot);
    releaseOwners(host);
    const record = bootCatalog(config, host);
    return start(host, boot, record);
}
/** The controller of a page whose catalog pre-paint script ran: adopted from its boot record once, then the same. */
export function getThemeCatalogController(host = globalThis) {
    const current = host.__atomicstrataThemeCatalog;
    if (current !== undefined && typeof current.dispose === "function")
        return current;
    if ((current === null || current === void 0 ? void 0 : current.kind) !== "atomicstrata-theme-catalog-boot") {
        throw new Error("@atomicstrata/themes: no catalog pre-paint script has run on this page; load one, or call createThemeCatalogController");
    }
    const record = current;
    const boot = resolveCatalogBoot(record.config);
    requireCatalogHost(host, boot);
    return start(host, boot, record);
}
