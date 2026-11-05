/**
 * The single implementation of theme resolution.
 *
 * Every delivery of the pre-paint behaviour is built from the functions in
 * this file: the module controller imports them, and the classic scripts (the
 * generated ones with embedded configuration and the prebuilt ones that read
 * their own `data-*` attributes, each with or without the mode preference)
 * are assembled from their source text by `prepaint.ts`. For that to work each function here must be self-contained:
 * it may call the other functions listed in `bootParts`, and nothing else from
 * module scope. `tests/boot-deliveries.test.ts` runs the assembled text in an
 * empty context, so a stray outer reference fails there.
 *
 * Order of work is fixed: configuration is checked completely before storage
 * is read or the document is touched, so a malformed configuration leaves the
 * page on the stylesheet's safe `:root` defaults and changes nothing.
 */
/** The canonical ids and their labels, in selector order. The only place they are written. */
export function canonicalThemes() {
    return [
        ["scientific-clay", "Scientific Clay"],
        ["minimal", "Minimal (system)"],
        ["nebula-light", "Nebula Light"],
        ["nebula-dark", "Nebula Dark"],
    ];
}
/** The error every configuration problem throws: the package prefix, then the problem. Shared with `mode-core.ts`. */
export function configError(message) {
    return new Error("@atomicstrata/themes: invalid theme configuration: " + message);
}
/** A non-empty string. Shared with `mode-core.ts`. */
export function isFilledString(value) {
    return typeof value === "string" && value.length > 0;
}
/** Reject a misspelt option instead of ignoring it. */
function rejectUnknownKeys(raw) {
    const known = ["storageKey", "themes", "productTheme", "defaultTheme", "legacyPreference"];
    for (const key of Object.keys(raw)) {
        if (known.indexOf(key) < 0)
            throw configError('unknown option "' + key + '"');
    }
}
/** The storage key, or null for a session-only choice; anything else is a configuration error. */
function resolveStorageKey(raw) {
    const key = raw.storageKey;
    if (key === null)
        return null;
    if (!isFilledString(key)) {
        throw configError("storageKey must be a non-empty string, or null for a session-only choice");
    }
    return key;
}
/**
 * The offered canonical ids: the given subset in the given order, or all four.
 * An empty list is allowed only beside a product palette, so a product can
 * offer its own palette alone; the offered set is never empty.
 */
function resolveThemes(raw) {
    const all = canonicalThemes().map((entry) => entry[0]);
    if (raw.themes === undefined)
        return all;
    const themes = raw.themes;
    if (!Array.isArray(themes) || (themes.length === 0 && raw.productTheme === undefined)) {
        throw configError("themes must be an array of canonical theme ids, empty only when productTheme is set");
    }
    const chosen = [];
    for (const id of themes) {
        if (all.indexOf(id) < 0)
            throw configError('themes contains "' + String(id) + '", which is not a canonical theme id');
        if (chosen.indexOf(id) >= 0)
            throw configError('themes lists "' + id + '" more than once');
        chosen.push(id);
    }
    return chosen;
}
/** The label of the consumer's own palette, or null when it has none. */
function resolveProductLabel(raw) {
    if (raw.productTheme === undefined)
        return null;
    const product = raw.productTheme;
    if (product === null || typeof product !== "object" || !isFilledString(product.label)) {
        throw configError("productTheme must be an object with a non-empty label");
    }
    return product.label;
}
/** The theme with nothing stored: the given `defaultTheme`, which must be offered, or the first offered theme. */
function resolveDefault(raw, ids) {
    if (raw.defaultTheme === undefined)
        return ids[0];
    if (ids.indexOf(raw.defaultTheme) < 0) {
        throw configError('defaultTheme "' + String(raw.defaultTheme) + '" is not one of the offered themes');
    }
    return raw.defaultTheme;
}
/** The old stored values and the offered theme each one becomes. */
function resolveLegacyValues(given, ids) {
    if (given === null || typeof given !== "object") {
        throw configError("legacyPreference.values must map old stored values to offered themes");
    }
    const values = {};
    for (const old of Object.keys(given)) {
        const target = given[old];
        if (ids.indexOf(target) < 0)
            throw configError('legacyPreference maps "' + old + '" to a theme that is not offered');
        values[old] = target;
    }
    return values;
}
/**
 * The legacy preference to migrate from, or null: its key must be filled and
 * differ from `storageKey`, which must exist, and its values must map to
 * offered themes.
 */
function resolveLegacy(raw, ids, storageKey) {
    if (raw.legacyPreference === undefined)
        return null;
    const legacy = raw.legacyPreference;
    if (legacy === null || typeof legacy !== "object" || !isFilledString(legacy.key)) {
        throw configError("legacyPreference.key must be a non-empty string");
    }
    if (storageKey === null)
        throw configError("legacyPreference needs a storageKey to migrate into");
    if (legacy.key === storageKey)
        throw configError("legacyPreference.key must differ from storageKey");
    return { key: legacy.key, values: resolveLegacyValues(legacy.values, ids) };
}
/** Check a configuration completely. Throws before anything is read or written. */
export function resolveConfig(raw) {
    if (raw === null || typeof raw !== "object")
        throw configError("expected a configuration object");
    const given = raw;
    rejectUnknownKeys(given);
    const storageKey = resolveStorageKey(given);
    const canonical = resolveThemes(given);
    const productLabel = resolveProductLabel(given);
    const labels = {};
    for (const entry of canonicalThemes()) {
        if (canonical.indexOf(entry[0]) >= 0)
            labels[entry[0]] = entry[1];
    }
    let ids = canonical;
    if (productLabel !== null) {
        labels.product = productLabel;
        ids = ["product"].concat(canonical);
    }
    const defaultTheme = resolveDefault(given, ids);
    return { storageKey: storageKey, ids: ids, labels: labels, defaultTheme: defaultTheme, legacy: resolveLegacy(given, ids, storageKey) };
}
/**
 * An offered id is itself; anything else is the default. The length bound is
 * applied before membership so an untrusted stored value is never compared in
 * full against the set.
 */
export function validTheme(value, config) {
    const maxThemeIdLength = 32;
    if (typeof value !== "string" || value.length > maxThemeIdLength)
        return config.defaultTheme;
    return config.ids.indexOf(value) >= 0 ? value : config.defaultTheme;
}
/**
 * Read one stored value, reporting whether the read itself worked. Storage
 * that throws on access or on read (private modes, blocked site data) is not
 * the same as storage that holds nothing: only a successful read of nothing
 * may fall through to a legacy preference. A missing `localStorage` is a
 * successful read of nothing.
 */
export function readItem(host, key) {
    try {
        const storage = host.localStorage;
        return { read: true, value: storage ? storage.getItem(key) : null };
    }
    catch (error) {
        return { read: false, value: null };
    }
}
/** Persist best-effort. A refused write leaves the selection in force for this page only. */
export function writeItem(host, key, value) {
    try {
        const storage = host.localStorage;
        if (storage)
            storage.setItem(key, value);
    }
    catch (error) {
        /* Selection still applies to the document; there is nowhere to keep it. */
    }
}
/**
 * The preference in force. A stored value wins (an unknown one is the
 * default). An unreadable store is the default, with no migration and no
 * write. Only a store that was read and held nothing consults the legacy key.
 */
function storedTheme(config, host) {
    if (config.storageKey === null)
        return config.defaultTheme;
    const stored = readItem(host, config.storageKey);
    if (!stored.read)
        return config.defaultTheme;
    if (stored.value !== null)
        return validTheme(stored.value, config);
    if (config.legacy === null)
        return config.defaultTheme;
    const old = readItem(host, config.legacy.key).value;
    if (old === null || !Object.prototype.hasOwnProperty.call(config.legacy.values, old))
        return config.defaultTheme;
    const migrated = config.legacy.values[old];
    writeItem(host, config.storageKey, migrated);
    return migrated;
}
/** The controller a page uses after pre-paint. Selecting touches the root attribute and one key. */
function createController(config, host) {
    const root = host.document.documentElement;
    let listeners = [];
    function current() {
        return validTheme(root.getAttribute("data-theme"), config);
    }
    function select(value) {
        const theme = validTheme(value, config);
        root.setAttribute("data-theme", theme);
        if (config.storageKey !== null)
            writeItem(host, config.storageKey, theme);
        for (const listener of listeners.slice())
            listener(theme);
        return theme;
    }
    function subscribe(listener) {
        listeners.push(listener);
        return function unsubscribe() {
            listeners = listeners.filter((entry) => entry !== listener);
        };
    }
    return Object.freeze({
        ids: Object.freeze(config.ids.slice()),
        labels: Object.freeze(config.labels),
        defaultTheme: config.defaultTheme,
        current: current,
        select: select,
        subscribe: subscribe,
    });
}
/** Check the configuration, stamp the theme in force on the root, and leave the controller on the host. */
export function bootCore(raw, host) {
    const config = resolveConfig(raw);
    const theme = storedTheme(config, host);
    host.document.documentElement.setAttribute("data-theme", theme);
    const controller = createController(config, host);
    host.__atomicstrataTheme = controller;
    return controller;
}
/**
 * Read a configuration from the classic script's own tag:
 * `data-storage-key="…"` or the bare attribute `data-session-only` (exactly
 * one), and optionally `data-themes` (space separated), `data-product-label`
 * and `data-default`. Legacy migration needs the generated script instead.
 */
export function configFromScript(script) {
    if (!script)
        throw configError("the pre-paint script must run from its own <script> element");
    const hasKey = script.hasAttribute("data-storage-key");
    if (hasKey === script.hasAttribute("data-session-only")) {
        throw configError("set exactly one of data-storage-key and data-session-only on the script element");
    }
    const config = { storageKey: hasKey ? script.getAttribute("data-storage-key") : null };
    const themes = script.getAttribute("data-themes");
    if (themes !== null)
        config.themes = themes.split(/\s+/).filter((id) => id.length > 0);
    const label = script.getAttribute("data-product-label");
    if (label !== null)
        config.productTheme = { label: label };
    const chosen = script.getAttribute("data-default");
    if (chosen !== null)
        config.defaultTheme = chosen;
    return config;
}
/** Every function a classic script needs, in an order where each is declared before the call that starts it. */
export function bootParts() {
    return [
        canonicalThemes, configError, isFilledString, rejectUnknownKeys, resolveStorageKey, resolveThemes,
        resolveProductLabel, resolveDefault, resolveLegacyValues, resolveLegacy, resolveConfig, validTheme, readItem, writeItem,
        storedTheme, createController, bootCore, configFromScript,
    ];
}
