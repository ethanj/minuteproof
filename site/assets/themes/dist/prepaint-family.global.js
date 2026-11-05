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
function designModes() {
    return ["system", "light", "dark"];
}
function splitModeConfig(raw) {
    if (raw === null || typeof raw !== "object")
        throw configError("expected a configuration object");
    const theme = {};
    for (const key of Object.keys(raw)) {
        if (key !== "designMode")
            theme[key] = raw[key];
    }
    return { theme: theme, mode: raw.designMode };
}
function resolveModeConfig(raw, theme) {
    if (raw === null || typeof raw !== "object")
        throw configError("designMode must be an object with a storageKey");
    const given = raw;
    for (const key of Object.keys(given)) {
        if (key !== "storageKey" && key !== "default")
            throw configError('unknown designMode option "' + key + '"');
    }
    const key = given.storageKey;
    if (key !== null && !isFilledString(key))
        throw configError("designMode.storageKey must be a non-empty string, or null for a session-only choice");
    if (key !== null && (key === theme.storageKey || (theme.legacy !== null && key === theme.legacy.key))) {
        throw configError("designMode.storageKey must differ from the theme's storage keys");
    }
    const chosen = given.default === undefined ? "system" : given.default;
    if (designModes().indexOf(chosen) < 0)
        throw configError('designMode.default must be "system", "light" or "dark"');
    return { storageKey: key, defaultMode: chosen };
}
function validMode(value, config) {
    const maxModeLength = 6;
    if (typeof value !== "string" || value.length > maxModeLength)
        return config.defaultMode;
    return designModes().indexOf(value) >= 0 ? value : config.defaultMode;
}
function storedMode(config, host) {
    if (config.storageKey === null)
        return config.defaultMode;
    const stored = readItem(host, config.storageKey);
    if (!stored.read || stored.value === null)
        return config.defaultMode;
    return validMode(stored.value, config);
}
function stampMode(root, mode) {
    if (mode === "system")
        root.removeAttribute("data-design-mode");
    else
        root.setAttribute("data-design-mode", mode);
}
function createModeController(config, host) {
    const root = host.document.documentElement;
    let listeners = [];
    function current() {
        const value = root.getAttribute("data-design-mode");
        return value === "light" || value === "dark" ? value : "system";
    }
    function select(value) {
        const mode = validMode(value, config);
        stampMode(root, mode);
        if (config.storageKey !== null)
            writeItem(host, config.storageKey, mode);
        for (const listener of listeners.slice())
            listener(mode);
        return mode;
    }
    // The theme controller's subscription, repeated: sharing it would change the bytes of every existing pre-paint script.
    // fallow-ignore-next-line code-duplication
    function subscribe(listener) {
        listeners.push(listener);
        return function unsubscribe() {
            listeners = listeners.filter((entry) => entry !== listener);
        };
    }
    return Object.freeze({ ids: Object.freeze(designModes()), defaultMode: config.defaultMode, current: current, select: select, subscribe: subscribe });
}
function checkModeRoot(host) {
    if (typeof host.document.documentElement.removeAttribute !== "function") {
        throw new Error("@atomicstrata/themes: designMode needs a document root with removeAttribute");
    }
}
function bootWithMode(raw, host) {
    const parts = splitModeConfig(raw);
    const mode = resolveModeConfig(parts.mode, resolveConfig(parts.theme));
    checkModeRoot(host);
    const preference = storedMode(mode, host);
    const theme = bootCore(parts.theme, host);
    stampMode(host.document.documentElement, preference);
    const controller = Object.freeze(Object.assign({}, theme, { mode: createModeController(mode, host) }));
    host.__atomicstrataTheme = controller;
    return controller;
}
function modeConfigFromScript(script, theme) {
    if (!script)
        throw configError("the pre-paint script must run from its own <script> element");
    const hasKey = script.hasAttribute("data-mode-storage-key");
    if (hasKey === script.hasAttribute("data-mode-session-only")) {
        throw configError("set exactly one of data-mode-storage-key and data-mode-session-only on the script element");
    }
    const designMode = { storageKey: hasKey ? script.getAttribute("data-mode-storage-key") : null };
    const chosen = script.getAttribute("data-mode-default");
    if (chosen !== null)
        designMode.default = chosen;
    return Object.assign({}, theme, { designMode: designMode });
}
function familyOfTheme(theme) {
    if (theme === "scientific-clay")
        return "clay";
    if (theme === "nebula-light" || theme === "nebula-dark")
        return "nebula";
    return theme;
}
function themeOfFamily(family, scheme) {
    if (family === "clay")
        return "scientific-clay";
    if (family === "nebula")
        return scheme === "dark" ? "nebula-dark" : "nebula-light";
    return family;
}
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
function canonicalModes(family, ids) {
    if (family !== "nebula")
        return designModes();
    const light = ids.indexOf("nebula-light") >= 0;
    const dark = ids.indexOf("nebula-dark") >= 0;
    if (light && dark)
        return designModes();
    return light ? ["light"] : ["dark"];
}
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
function resolveFamilyBoot(raw) {
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
function storedFamilyTheme(config, host) {
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
function familyMode(config, theme, host) {
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
function migratedMode(theme) {
    if (theme === "scientific-clay" || theme === "nebula-light")
        return "light";
    return theme === "nebula-dark" ? "dark" : "system";
}
function familyEntry(families, family) {
    return families.entries.filter((entry) => entry.id === family)[0];
}
function appearanceState(entry, preference, prefersDark) {
    const effective = entry.modes.indexOf(preference) >= 0 ? preference : entry.modes[0];
    const scheme = effective === "system" ? (prefersDark ? "dark" : "light") : effective;
    const theme = themeOfFamily(entry.id, scheme);
    return Object.freeze({ theme: theme, family: entry.id, mode: preference, effectiveMode: effective, scheme: scheme });
}
function stampAppearance(host, state) {
    const root = host.document.documentElement;
    root.setAttribute("data-theme", state.theme);
    root.setAttribute("data-theme-scheme", state.scheme);
    stampMode(root, state.effectiveMode);
}
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
function subscribeTo(owner, kind, listener) {
    owner.listeners[kind] = owner.listeners[kind].concat([listener]);
    return function unsubscribe() {
        owner.listeners[kind] = owner.listeners[kind].filter((entry) => entry !== listener);
    };
}
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
function schemeMediaOf(host) {
    if (typeof host.matchMedia !== "function")
        throw new Error("@atomicstrata/themes: families need window.matchMedia");
    const media = host.matchMedia("(prefers-color-scheme: dark)");
    if (typeof media.addEventListener !== "function" || typeof media.removeEventListener !== "function") {
        throw new Error("@atomicstrata/themes: families need MediaQueryList.addEventListener and removeEventListener");
    }
    return media;
}
function releasePreviousOwner(host) {
    const previous = host.__atomicstrataTheme;
    if (previous !== undefined && previous.family !== undefined)
        previous.family.dispose();
}
function bootWithFamilies(raw, host) {
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
function familyConfigFromScript(script, config) {
    const families = {};
    const modes = script.getAttribute("data-product-modes");
    if (modes !== null)
        families.productModes = modes.split(/\s+/).filter((mode) => isFilledString(mode));
    const migrate = script.getAttribute("data-migrate-mode");
    if (migrate !== null)
        families.migrateMode = migrate;
    return Object.assign({}, config, { families: families });
}
bootWithFamilies(familyConfigFromScript(document.currentScript,modeConfigFromScript(document.currentScript,configFromScript(document.currentScript))),window);
})();
