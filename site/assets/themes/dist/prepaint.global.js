(function(){
function canonicalThemes() {
    return [
        ["scientific-clay", "Scientific Clay"],
        ["minimal", "Minimal (system)"],
        ["nebula-light", "Nebula Light"],
        ["nebula-dark", "Nebula Dark"],
    ];
}
function configError(message) {
    return new Error("@atomicstrata/themes: invalid theme configuration: " + message);
}
function isFilledString(value) {
    return typeof value === "string" && value.length > 0;
}
function rejectUnknownKeys(raw) {
    const known = ["storageKey", "themes", "productTheme", "defaultTheme", "legacyPreference"];
    for (const key of Object.keys(raw)) {
        if (known.indexOf(key) < 0)
            throw configError('unknown option "' + key + '"');
    }
}
function resolveStorageKey(raw) {
    const key = raw.storageKey;
    if (key === null)
        return null;
    if (!isFilledString(key)) {
        throw configError("storageKey must be a non-empty string, or null for a session-only choice");
    }
    return key;
}
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
function resolveProductLabel(raw) {
    if (raw.productTheme === undefined)
        return null;
    const product = raw.productTheme;
    if (product === null || typeof product !== "object" || !isFilledString(product.label)) {
        throw configError("productTheme must be an object with a non-empty label");
    }
    return product.label;
}
function resolveDefault(raw, ids) {
    if (raw.defaultTheme === undefined)
        return ids[0];
    if (ids.indexOf(raw.defaultTheme) < 0) {
        throw configError('defaultTheme "' + String(raw.defaultTheme) + '" is not one of the offered themes');
    }
    return raw.defaultTheme;
}
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
function resolveConfig(raw) {
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
function validTheme(value, config) {
    const maxThemeIdLength = 32;
    if (typeof value !== "string" || value.length > maxThemeIdLength)
        return config.defaultTheme;
    return config.ids.indexOf(value) >= 0 ? value : config.defaultTheme;
}
function readItem(host, key) {
    try {
        const storage = host.localStorage;
        return { read: true, value: storage ? storage.getItem(key) : null };
    }
    catch (error) {
        return { read: false, value: null };
    }
}
function writeItem(host, key, value) {
    try {
        const storage = host.localStorage;
        if (storage)
            storage.setItem(key, value);
    }
    catch (error) {
        /* Selection still applies to the document; there is nowhere to keep it. */
    }
}
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
function bootCore(raw, host) {
    const config = resolveConfig(raw);
    const theme = storedTheme(config, host);
    host.document.documentElement.setAttribute("data-theme", theme);
    const controller = createController(config, host);
    host.__atomicstrataTheme = controller;
    return controller;
}
function configFromScript(script) {
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
bootCore(configFromScript(document.currentScript),window);
})();
