/**
 * The optional colour-mode preference (System, Light or Dark), on the same
 * owner as the theme.
 *
 * A design system whose profile opts into explicit modes reads
 * `data-design-mode` on the root: `light` or `dark` pins its native colours,
 * and an absent attribute follows the operating system. This file stores
 * that preference under its own key and stamps the attribute, beside the
 * theme. It adds no theme id, never changes `data-theme`, and never stores
 * the operating system's resolved scheme: "system" is stored as itself and
 * removes the attribute, so the stylesheet's media query decides.
 *
 * It extends `boot-core.ts` without changing it. `bootWithMode` validates the
 * theme configuration (with `boot-core`'s resolver) and the mode
 * configuration completely, reads both preferences, then runs `bootCore`
 * unchanged and adds a `mode` controller to the controller it left. A
 * configuration without `designMode` never reaches this file, so the
 * existing deliveries are byte-for-byte what they were.
 *
 * Like `boot-core.ts`, every function here is self-contained: it may call the
 * functions listed in `modeParts` and `bootParts`, and nothing else from
 * module scope, because the classic scripts are assembled from their source.
 */
import { bootCore, configError, isFilledString, readItem, resolveConfig, writeItem, } from "./boot-core.js";
/** The three preferences, in menu order. The only place they are written. */
export function designModes() {
    return ["system", "light", "dark"];
}
/** Separate the mode configuration from the theme configuration, which `boot-core` checks as before. */
export function splitModeConfig(raw) {
    if (raw === null || typeof raw !== "object")
        throw configError("expected a configuration object");
    const theme = {};
    for (const key of Object.keys(raw)) {
        if (key !== "designMode")
            theme[key] = raw[key];
    }
    return { theme: theme, mode: raw.designMode };
}
/**
 * Check the mode configuration against the already checked theme one. The
 * mode key must differ from the theme key and from the legacy theme key, so
 * neither preference can overwrite the other.
 */
export function resolveModeConfig(raw, theme) {
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
/** An offered preference is itself; anything else, including an over-long value, is the default. */
export function validMode(value, config) {
    const maxModeLength = 6;
    if (typeof value !== "string" || value.length > maxModeLength)
        return config.defaultMode;
    return designModes().indexOf(value) >= 0 ? value : config.defaultMode;
}
/** The stored preference; an unreadable store is the default. */
function storedMode(config, host) {
    if (config.storageKey === null)
        return config.defaultMode;
    const stored = readItem(host, config.storageKey);
    if (!stored.read || stored.value === null)
        return config.defaultMode;
    return validMode(stored.value, config);
}
/** `light` and `dark` set the attribute; `system` removes it. */
export function stampMode(root, mode) {
    if (mode === "system")
        root.removeAttribute("data-design-mode");
    else
        root.setAttribute("data-design-mode", mode);
}
/**
 * The `mode` controller on the page's theme controller. Its `select` and
 * `subscribe` repeat the theme controller's (`createController` in
 * `boot-core.ts`) on purpose: sharing them would change the bytes of every
 * existing pre-paint script, whose output is pinned.
 */
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
/** A mode preference removes the root attribute for "system", so the root must be able to. */
export function checkModeRoot(host) {
    if (typeof host.document.documentElement.removeAttribute !== "function") {
        throw new Error("@atomicstrata/themes: designMode needs a document root with removeAttribute");
    }
}
/**
 * Check both configurations and the host, apply the theme and the mode, and
 * leave one controller carrying both on the host.
 */
export function bootWithMode(raw, host) {
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
/**
 * The prebuilt mode script's configuration: the theme's attributes as
 * before, plus exactly one of `data-mode-storage-key` and the bare
 * `data-mode-session-only`, and optionally `data-mode-default`. Its opening
 * check repeats `configFromScript`'s for the same reason as the controller's
 * `select`: the pinned pre-paint bytes.
 */
export function modeConfigFromScript(script, theme) {
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
/**
 * Whether a configuration asks for the mode preference. Read without
 * assuming its shape, so a malformed one reaches the resolver's own error.
 * Not part of `modeParts`: the classic scripts never call it.
 */
export function asksForMode(config) {
    return config !== null && typeof config === "object"
        && config.designMode !== undefined;
}
/** The functions a mode-aware classic script adds after `bootParts()`. */
export function modeParts() {
    return [
        designModes, splitModeConfig, resolveModeConfig, validMode, storedMode, stampMode, createModeController, checkModeRoot,
        bootWithMode, modeConfigFromScript,
    ];
}
