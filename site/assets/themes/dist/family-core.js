/**
 * The optional theme families (Clay, Minimal, Nebula and the product's own),
 * with one System/Light/Dark preference shared by all of them.
 *
 * A configuration opts in with `families` beside `designMode`. The person
 * then chooses a family and, separately, a mode; switching family keeps the
 * mode. The resolver turns the pair into the existing root contract:
 *
 * - `data-theme` stays a canonical id or `product`. Nebula resolves to
 *   `nebula-light` or `nebula-dark`, so no new theme id exists.
 * - `data-theme-scheme` (new, only on family pages) is the scheme resolved
 *   from the mode and, for "system", from `prefers-color-scheme`. Clay's dark
 *   palette and Minimal's explicit modes are keyed on it; a page without
 *   families never carries it, so its stylesheets render exactly as before.
 * - `data-design-mode` is the mode in force (`mode-core.ts`), so explicit-mode
 *   design systems under `product` keep following the same preference.
 *
 * Each family supports a set of modes. Clay and Minimal support all three;
 * Nebula supports what its offered ids allow; the product declares its own
 * (`productModes`), so a single-mode system reports one mode honestly and the
 * preference is kept, unapplied, for the families that can show it.
 *
 * State: the theme key keeps holding a canonical id (the family is derived
 * from it; selections write the resolved id, so a page without families on
 * the same key still reads a valid id) and the mode key keeps the preference
 * itself. An operating-system change re-resolves and notifies but never
 * writes storage. Every transition computes the complete state, stamps it,
 * then notifies, so subscribers never see a partial state.
 *
 * Like `boot-core.ts` and `mode-core.ts`, every function in `familyParts` is
 * self-contained: it may call functions listed in `bootParts`, `modeParts`
 * and `familyParts`, and nothing else from module scope, because the
 * classic scripts are assembled from their source text.
 */
import { configError, isFilledString, readItem, resolveConfig, validTheme, writeItem, } from "./boot-core.js";
import { checkModeRoot, designModes, resolveModeConfig, splitModeConfig, stampMode, validMode, } from "./mode-core.js";
/** The family a theme id belongs to. */
export function familyOfTheme(theme) {
    if (theme === "scientific-clay")
        return "clay";
    if (theme === "nebula-light" || theme === "nebula-dark")
        return "nebula";
    return theme;
}
/** The theme id a family shows in a resolved scheme. */
export function themeOfFamily(family, scheme) {
    if (family === "clay")
        return "scientific-clay";
    if (family === "nebula")
        return scheme === "dark" ? "nebula-dark" : "nebula-light";
    return family;
}
/**
 * The product's modes. The accepted sets are exactly: one mode alone,
 * `light` with `dark`, and all three. "system" beside a single pin is
 * refused: following the system needs both schemes.
 */
function resolveProductModes(given) {
    if (!Array.isArray(given) || given.length === 0) {
        throw configError("families.productModes must be a non-empty list of \"system\", \"light\" and \"dark\"");
    }
    const chosen = [];
    for (const mode of given) {
        if (designModes().indexOf(mode) < 0)
            throw configError('families.productModes contains "' + String(mode) + '"');
        if (chosen.indexOf(mode) >= 0)
            throw configError('families.productModes lists "' + mode + '" more than once');
        chosen.push(mode);
    }
    if (chosen.length === 2 && chosen.indexOf("system") >= 0) {
        throw configError("families.productModes may list \"system\" alone or with both \"light\" and \"dark\"");
    }
    return chosen;
}
/** The modes a canonical family supports, given which of its ids are offered. */
function canonicalModes(family, ids) {
    if (family !== "nebula")
        return designModes();
    const light = ids.indexOf("nebula-light") >= 0;
    const dark = ids.indexOf("nebula-dark") >= 0;
    if (light && dark)
        return designModes();
    return light ? ["light"] : ["dark"];
}
/** The offered families in the order their first id is offered, each with its label and modes. */
function familyEntries(theme, productModes) {
    const labels = { clay: "Scientific Clay", minimal: "Minimal", nebula: "Nebula" };
    const entries = [];
    for (const id of theme.ids) {
        const family = familyOfTheme(id);
        if (entries.some((entry) => entry.id === family))
            continue;
        const isProduct = family === "product";
        const label = isProduct ? theme.labels.product : labels[family];
        const modes = isProduct ? productModes : canonicalModes(family, theme.ids);
        entries.push({ id: family, label: label, modes: modes });
    }
    return entries;
}
/** Check `families` against the already checked theme configuration. */
function resolveFamilies(raw, theme) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw))
        throw configError("families must be an object");
    const given = raw;
    for (const key of Object.keys(given)) {
        if (key !== "productModes" && key !== "migrateMode")
            throw configError('unknown families option "' + key + '"');
    }
    if (given.migrateMode !== undefined && given.migrateMode !== "from-theme") {
        throw configError('families.migrateMode must be "from-theme"');
    }
    const offersProduct = theme.ids.indexOf("product") >= 0;
    if (offersProduct !== (given.productModes !== undefined)) {
        const problem = offersProduct ? "is required with productTheme" : "needs productTheme";
        throw configError("families.productModes " + problem);
    }
    const productModes = offersProduct ? resolveProductModes(given.productModes) : null;
    return { entries: familyEntries(theme, productModes), migrate: given.migrateMode === "from-theme" };
}
/**
 * Check a family configuration completely: the theme part (`boot-core`), the
 * mode part (`mode-core`) and `families`. Migration needs both keys.
 */
export function resolveFamilyBoot(raw) {
    if (raw === null || typeof raw !== "object")
        throw configError("expected a configuration object");
    const rest = {};
    for (const key of Object.keys(raw)) {
        if (key !== "families")
            rest[key] = raw[key];
    }
    if (rest.designMode === undefined) {
        throw configError("families needs designMode, which holds the shared mode preference");
    }
    const parts = splitModeConfig(rest);
    const theme = resolveConfig(parts.theme);
    const mode = resolveModeConfig(parts.mode, theme);
    const families = resolveFamilies(raw.families, theme);
    if (families.migrate && (theme.storageKey === null || mode.storageKey === null)) {
        throw configError("families.migrateMode needs both a theme and a mode storageKey");
    }
    return { theme: theme, mode: mode, families: families };
}
/** The theme in force and whether it came from storage (directly or through `legacyPreference`). */
export function storedFamilyTheme(config, host) {
    const fallback = { theme: config.defaultTheme, stored: false };
    if (config.storageKey === null)
        return fallback;
    const read = readItem(host, config.storageKey);
    if (!read.read)
        return fallback;
    if (read.value !== null) {
        const theme = validTheme(read.value, config);
        return { theme: theme, stored: theme === read.value };
    }
    const legacy = config.legacy;
    const old = legacy === null ? null : readItem(host, legacy.key).value;
    if (legacy === null || old === null || !Object.prototype.hasOwnProperty.call(legacy.values, old))
        return fallback;
    const migrated = legacy.values[old];
    writeItem(host, config.storageKey, migrated);
    return { theme: migrated, stored: true };
}
/**
 * The mode preference in force. A stored mode always wins; an unreadable or
 * invalid one is the default. Only a mode key read successfully as empty,
 * with `migrateMode` set and a theme that really came from storage, is
 * migrated: from what that theme showed before families existed.
 */
export function familyMode(config, theme, host) {
    const mode = config.mode;
    if (mode.storageKey === null)
        return mode.defaultMode;
    const stored = readItem(host, mode.storageKey);
    if (!stored.read)
        return mode.defaultMode;
    if (stored.value !== null)
        return validMode(stored.value, mode);
    if (!config.families.migrate || !theme.stored)
        return mode.defaultMode;
    const migrated = migratedMode(theme.theme);
    writeItem(host, mode.storageKey, migrated);
    return migrated;
}
/** What a stored theme id showed before families: Clay and Nebula Light were light, Nebula Dark dark. */
function migratedMode(theme) {
    if (theme === "scientific-clay" || theme === "nebula-light")
        return "light";
    return theme === "nebula-dark" ? "dark" : "system";
}
function familyEntry(families, family) {
    return families.entries.filter((entry) => entry.id === family)[0];
}
/** The complete state for a family, a preference and the operating system's scheme. */
function appearanceState(entry, preference, prefersDark) {
    const effective = entry.modes.indexOf(preference) >= 0 ? preference : entry.modes[0];
    const scheme = effective === "system" ? (prefersDark ? "dark" : "light") : effective;
    const theme = themeOfFamily(entry.id, scheme);
    return Object.freeze({ theme: theme, family: entry.id, mode: preference, effectiveMode: effective, scheme: scheme });
}
/** Write the three root attributes of a state (a family page's, or a catalog page's with an external id). */
export function stampAppearance(host, state) {
    const root = host.document.documentElement;
    root.setAttribute("data-theme", state.theme);
    root.setAttribute("data-theme-scheme", state.scheme);
    stampMode(root, state.effectiveMode);
}
/**
 * Call every subscriber of every kind with the state now in force. A
 * subscriber that makes a selection starts a newer notification of everyone;
 * this one then stops, so no subscriber hears an older state after a newer.
 */
function notifyAll(owner) {
    const state = owner.state;
    const calls = [];
    const values = { theme: state.theme, mode: state.mode, family: state };
    for (const kind of ["theme", "mode", "family"]) {
        for (const listener of owner.listeners[kind])
            calls.push(() => listener(values[kind]));
    }
    for (const call of calls) {
        if (owner.disposed || owner.state !== state)
            return;
        call();
    }
}
/** Add a subscriber; the list is replaced, never mutated, so a notification in progress is unaffected. */
function subscribeTo(owner, kind, listener) {
    owner.listeners[kind] = owner.listeners[kind].concat([listener]);
    return function unsubscribe() {
        owner.listeners[kind] = owner.listeners[kind].filter((entry) => entry !== listener);
    };
}
/**
 * Apply a family and a preference chosen by the person: stamp, store the
 * preference and the resolved theme id, notify. Storing the preference on
 * every selection keeps the mode key filled once a family page has been
 * used, so `migrateMode` only ever reads a theme chosen before families.
 */
function transition(owner, family, preference) {
    if (owner.disposed)
        throw new Error("@atomicstrata/themes: this theme controller was disposed");
    const entry = familyEntry(owner.config.families, family);
    owner.state = appearanceState(entry, preference, owner.media.matches);
    stampAppearance(owner.host, owner.state);
    if (owner.config.mode.storageKey !== null)
        writeItem(owner.host, owner.config.mode.storageKey, preference);
    if (owner.config.theme.storageKey !== null)
        writeItem(owner.host, owner.config.theme.storageKey, owner.state.theme);
    notifyAll(owner);
    return owner.state;
}
/** The operating system's scheme changed: re-resolve, and notify only if the page changes. Never writes storage. */
function followSystem(owner) {
    if (owner.disposed)
        return;
    const entry = familyEntry(owner.config.families, owner.state.family);
    const next = appearanceState(entry, owner.state.mode, owner.media.matches);
    if (next.theme === owner.state.theme && next.scheme === owner.state.scheme)
        return;
    owner.state = next;
    stampAppearance(owner.host, next);
    notifyAll(owner);
}
/**
 * Release everything this owner holds: the system listener, its subscribers
 * (a notification in progress stops at the next one), and the two root
 * attributes only it stamps, `data-theme-scheme` and `data-design-mode`.
 * `data-theme` stays for the next owner to replace. Idempotent: once
 * disposed, a later call (a stale reference after replacement) touches
 * nothing, so it can never undo the new owner's attributes.
 */
function disposeOwner(owner) {
    if (owner.disposed)
        return;
    owner.disposed = true;
    owner.media.removeEventListener("change", owner.onSystemChange);
    owner.listeners = { theme: [], mode: [], family: [] };
    const root = owner.host.document.documentElement;
    root.removeAttribute("data-theme-scheme");
    root.removeAttribute("data-design-mode");
}
/** An offered family is itself; anything else is the default family. */
function validFamily(owner, value) {
    const entries = owner.config.families.entries;
    const offered = entries.some((entry) => entry.id === value);
    return offered ? value : familyOfTheme(owner.config.theme.defaultTheme);
}
function familyControllerOf(owner) {
    const entries = owner.config.families.entries;
    const labels = {};
    for (const entry of entries)
        labels[entry.id] = entry.label;
    return Object.freeze({
        ids: Object.freeze(entries.map((entry) => entry.id)),
        labels: Object.freeze(labels),
        defaultFamily: familyOfTheme(owner.config.theme.defaultTheme),
        current: () => owner.state.family,
        select: (value) => transition(owner, validFamily(owner, value), owner.state.mode).family,
        modes: (family) => Object.freeze(familyEntry(owner.config.families, family).modes.slice()),
        snapshot: () => owner.state,
        subscribe: (listener) => subscribeTo(owner, "family", listener),
        dispose: () => disposeOwner(owner),
    });
}
/** The mode controller of a family page: the one owner of the mode key. */
function familyModeControllerOf(owner) {
    function select(value) {
        return transition(owner, owner.state.family, validMode(value, owner.config.mode)).mode;
    }
    return Object.freeze({
        ids: Object.freeze(designModes()),
        defaultMode: owner.config.mode.defaultMode,
        current: () => owner.state.mode,
        select: select,
        subscribe: (listener) => subscribeTo(owner, "mode", listener),
    });
}
/**
 * The page's theme controller. `select` takes a theme id and applies its
 * family; the preference decides light or dark, so `select("nebula-light")`
 * under a dark preference shows Nebula Dark.
 */
function familyThemeControllerOf(owner) {
    const theme = owner.config.theme;
    return Object.freeze({
        ids: Object.freeze(theme.ids.slice()),
        labels: Object.freeze(theme.labels),
        defaultTheme: theme.defaultTheme,
        current: () => owner.state.theme,
        select: (value) => transition(owner, familyOfTheme(validTheme(value, theme)), owner.state.mode).theme,
        subscribe: (listener) => subscribeTo(owner, "theme", listener),
        mode: familyModeControllerOf(owner),
        family: familyControllerOf(owner),
    });
}
/**
 * The colour-scheme media list families follow "system" through. The host
 * must have `matchMedia` and the list change listeners; checked before
 * anything is read, released or stamped.
 */
export function schemeMediaOf(host) {
    if (typeof host.matchMedia !== "function")
        throw new Error("@atomicstrata/themes: families need window.matchMedia");
    const media = host.matchMedia("(prefers-color-scheme: dark)");
    if (typeof media.addEventListener !== "function" || typeof media.removeEventListener !== "function") {
        throw new Error("@atomicstrata/themes: families need MediaQueryList.addEventListener and removeEventListener");
    }
    return media;
}
/** Dispose a family controller already on the host, so a page never has two owners following the system. */
export function releasePreviousOwner(host) {
    const previous = host.__atomicstrataTheme;
    if (previous !== undefined && previous.family !== undefined)
        previous.family.dispose();
}
/**
 * Check everything, then release a previous owner, read both preferences,
 * stamp the complete state, follow the system, and leave the controller.
 */
export function bootWithFamilies(raw, host) {
    const config = resolveFamilyBoot(raw);
    checkModeRoot(host);
    const media = schemeMediaOf(host);
    releasePreviousOwner(host);
    const theme = storedFamilyTheme(config.theme, host);
    const preference = familyMode(config, theme, host);
    const entry = familyEntry(config.families, familyOfTheme(theme.theme));
    const owner = {
        config: config, host: host, media: media, state: appearanceState(entry, preference, media.matches),
        listeners: { theme: [], mode: [], family: [] }, disposed: false, onSystemChange: () => followSystem(owner),
    };
    stampAppearance(host, owner.state);
    media.addEventListener("change", owner.onSystemChange);
    const controller = familyThemeControllerOf(owner);
    host.__atomicstrataTheme = controller;
    return controller;
}
/**
 * The prebuilt family script's configuration: the mode script's, plus
 * optionally `data-product-modes` (space separated) and `data-migrate-mode`.
 * The tag itself was already required by the theme's reader.
 */
export function familyConfigFromScript(script, config) {
    const families = {};
    const modes = script.getAttribute("data-product-modes");
    if (modes !== null)
        families.productModes = modes.split(/\s+/).filter((mode) => isFilledString(mode));
    const migrate = script.getAttribute("data-migrate-mode");
    if (migrate !== null)
        families.migrateMode = migrate;
    return Object.assign({}, config, { families: families });
}
/** Whether a configuration asks for families. Not part of `familyParts`: the classic scripts never call it. */
export function asksForFamilies(config) {
    return config !== null && typeof config === "object" && config.families !== undefined;
}
/** The functions a family classic script adds after `bootParts()` and `modeParts()`. */
export function familyParts() {
    return [
        familyOfTheme, themeOfFamily, resolveProductModes, canonicalModes, familyEntries, resolveFamilies,
        resolveFamilyBoot, storedFamilyTheme, familyMode, migratedMode, familyEntry, appearanceState, stampAppearance,
        notifyAll, subscribeTo, transition, followSystem, disposeOwner, validFamily, familyControllerOf,
        familyModeControllerOf, familyThemeControllerOf, schemeMediaOf, releasePreviousOwner, bootWithFamilies,
        familyConfigFromScript,
    ];
}
