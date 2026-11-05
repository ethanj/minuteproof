/**
 * Catalog pages before first paint: the configuration, the stored theme and
 * the first stamp, for pages that offer external themes beside the built-in
 * families.
 *
 * A catalog configuration is a family configuration (`family-core.ts`:
 * `designMode` and `families` are required) plus `external`:
 *
 * - `fallback`: a built-in theme id the page shows when an external theme
 *   cannot be. Always explicit, even beside an external default, so a failed
 *   external default never falls back to itself.
 * - `static`: themes whose compiled stylesheet the page links or inlines in
 *   `<head>` itself, so it is present at first paint. Each is pinned by id,
 *   version, modes and build (`staticThemeEntry` writes one from a
 *   manifest).
 * - `catalog`: the one trusted catalog the page discovers further themes
 *   from: its id, URL (`https:`, or `http:` on a loopback host), credentials
 *   mode and layer.
 * - `discovery`: `"on-create"` or `"manual"`; there is no default.
 *
 * `defaultTheme` may name a static external theme. Every check runs before
 * storage is read or the document touched, as `boot-core.ts` does.
 *
 * Resolution of the stored theme:
 *
 * - A built-in value resolves exactly as on a family page.
 * - A static external id is applied at first paint: its stylesheet is in
 *   `<head>`.
 * - Any other external id cannot be: its stylesheet is not known before
 *   discovery. The page boots on the built-in `external.fallback`, and the
 *   id is kept as `restoring`; storage is not touched. The controller restores it after
 *   discovery unless the person chooses first.
 *
 * Like `boot-core.ts`, every function in `catalogBootParts` is
 * self-contained: it calls only functions listed in `bootParts`,
 * `modeParts`, `familyParts` and `catalogBootParts`, because the generated
 * pre-paint script is assembled from their source text. Beyond what the
 * family script uses they need only the `URL` parser, so that a catalog URL
 * is validated as the browser will read it.
 *
 * External themes are offered on family pages only: `designMode` and
 * `families` are required. Pages without families keep the existing
 * controllers, which are unchanged.
 */
import { configError, isFilledString, readItem } from "../boot-core.js";
import { isExternalThemeId } from "../external/id.js";
import { modesOfSchemes, schemesOfModes } from "../external/schema.js";
import { checkModeRoot, } from "../mode-core.js";
import { familyMode, familyOfTheme, resolveFamilyBoot, schemeMediaOf, stampAppearance, storedFamilyTheme, themeOfFamily, } from "../family-core.js";
/** The accepted mode sets of a theme, by the one grammar the manifest and index use (`schemesOfModes`). */
function catalogModes(raw, where) {
    const schemes = schemesOfModes(raw);
    if (schemes === null)
        throw configError(where + ' must be ["system","light","dark"], ["light"] or ["dark"]');
    return modesOfSchemes(schemes);
}
/** Refuse a key outside `known` on a configuration object. */
function catalogKeys(raw, known, where) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw))
        throw configError(where + " must be an object");
    for (const key of Object.keys(raw)) {
        if (known.indexOf(key) < 0)
            throw configError("unknown " + where + ' option "' + key + '"');
    }
    return raw;
}
/** One static theme descriptor, checked completely. */
function resolveStaticTheme(raw, where) {
    const given = catalogKeys(raw, ["id", "label", "version", "modes", "build", "delivery"], where);
    if (!isExternalThemeId(given.id))
        throw configError(where + ".id must be an external theme id (ext-…)");
    if (!isFilledString(given.label))
        throw configError(where + ".label must be a non-empty string");
    const version = given.version;
    if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw configError(where + ".version must be x.y.z");
    }
    if (typeof given.build !== "string" || !/^[0-9a-f]{64}$/.test(given.build)) {
        throw configError(where + ".build must be the theme's build id (64 hex digits)");
    }
    if (given.delivery !== "linked" && given.delivery !== "inline")
        throw configError(where + '.delivery must be "linked" or "inline"');
    return {
        id: given.id, label: given.label, version: version, modes: catalogModes(given.modes, where + ".modes"),
        build: given.build, delivery: given.delivery,
    };
}
/**
 * Whether `value` is a catalog URL as the browser itself parses it: `https:`,
 * or `http:` on a loopback host; no credentials, query or fragment; and
 * already in the URL parser's canonical form, so the string configured is
 * exactly the URL fetched.
 */
function isCatalogUrl(value) {
    if (typeof value !== "string")
        return false;
    let url;
    try {
        url = new URL(value);
    }
    catch (error) {
        return false;
    }
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
    const scheme = url.protocol === "https:" || (url.protocol === "http:" && loopback);
    return scheme && url.username === "" && url.password === "" && url.search === "" && url.hash === "" && url.href === value;
}
/**
 * The trusted catalog: an id, a URL (`isCatalogUrl`), a credentials mode
 * and a layer name or null.
 */
function resolveCatalogSource(raw) {
    const given = catalogKeys(raw, ["id", "url", "credentials", "layer"], "external.catalog");
    if (typeof given.id !== "string" || !/^(?=.{1,32}$)[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(given.id)) {
        throw configError("external.catalog.id must be a catalog id");
    }
    const url = given.url;
    if (!isCatalogUrl(url)) {
        throw configError("external.catalog.url must be a canonical https URL (or http on a loopback host) without credentials, query or fragment");
    }
    const credentials = given.credentials;
    if (credentials !== "omit" && credentials !== "same-origin" && credentials !== "include") {
        throw configError('external.catalog.credentials must be "omit", "same-origin" or "include"');
    }
    const layer = given.layer;
    if (layer !== null && (typeof layer !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(layer))) {
        throw configError("external.catalog.layer must be a layer name or null");
    }
    return { id: given.id, url: url, credentials: credentials, layer: layer };
}
/** The static themes, each checked, with no id given twice. */
function resolveStaticThemes(raw) {
    if (raw === undefined)
        return [];
    if (!Array.isArray(raw))
        throw configError("external.static must be a list");
    const statics = [];
    for (let index = 0; index < raw.length; index += 1) {
        const entry = resolveStaticTheme(raw[index], "external.static[" + index + "]");
        if (statics.some((other) => other.id === entry.id))
            throw configError('external.static lists "' + entry.id + '" more than once');
        statics.push(entry);
    }
    return statics;
}
/** Check `external` against the already checked family configuration. */
function resolveExternal(raw, boot, defaultExternal) {
    const given = catalogKeys(raw, ["fallback", "static", "catalog", "discovery"], "external");
    if (boot.theme.ids.indexOf(given.fallback) < 0) {
        throw configError("external.fallback must be one of the offered built-in themes");
    }
    const statics = resolveStaticThemes(given.static);
    const catalog = given.catalog === undefined ? null : resolveCatalogSource(given.catalog);
    if (given.discovery !== "on-create" && given.discovery !== "manual") {
        throw configError('external.discovery must be "on-create" or "manual"');
    }
    if (catalog === null && given.discovery === "on-create")
        throw configError('external.discovery "on-create" needs external.catalog');
    if (defaultExternal !== null && !statics.some((entry) => entry.id === defaultExternal)) {
        throw configError("defaultTheme names an external theme that is not a static one; only a static theme can be shown at first paint");
    }
    return {
        fallback: given.fallback, statics: statics, catalog: catalog, discovery: given.discovery,
        defaultExternal: defaultExternal,
    };
}
/** Check a catalog configuration completely: the family part with the existing resolvers, then `external`. */
export function resolveCatalogBoot(raw) {
    if (raw === null || typeof raw !== "object")
        throw configError("expected a configuration object");
    const given = raw;
    if (given.external === undefined)
        throw configError("a catalog configuration needs external");
    if (given.families === undefined)
        throw configError("external themes need families (and designMode)");
    const rest = {};
    for (const key of Object.keys(given)) {
        if (key !== "external")
            rest[key] = given[key];
    }
    const defaultExternal = isExternalThemeId(given.defaultTheme) ? given.defaultTheme : null;
    if (defaultExternal !== null)
        delete rest.defaultTheme;
    const family = resolveFamilyBoot(rest);
    return { family: family, external: resolveExternal(given.external, family, defaultExternal) };
}
/** The family entries offered before discovery: the built-in families, then the static themes. */
function bootFamilyEntries(boot) {
    const entries = boot.family.families.entries.slice();
    for (const entry of boot.external.statics)
        entries.push({ id: entry.id, label: entry.label, modes: entry.modes });
    return entries;
}
/** The complete state for a family entry (built-in or external), a preference and the system's scheme. */
export function catalogAppearance(entry, preference, prefersDark) {
    const effective = entry.modes.indexOf(preference) >= 0 ? preference : entry.modes[0];
    const scheme = effective === "system" ? (prefersDark ? "dark" : "light") : effective;
    const theme = isExternalThemeId(entry.id) ? entry.id : themeOfFamily(entry.id, scheme);
    return Object.freeze({ theme: theme, family: entry.id, mode: preference, effectiveMode: effective, scheme: scheme });
}
/**
 * The theme to boot with: a stored static external id as itself; a stored
 * other external id as the explicit built-in `external.fallback`, kept as
 * `restoring`; anything else as a family page reads it, with a static
 * external default when nothing usable is stored.
 */
function bootCatalogTheme(boot, host) {
    const config = boot.family.theme;
    const fallbackDefault = boot.external.defaultExternal === null ? config.defaultTheme : boot.external.defaultExternal;
    const read = config.storageKey === null ? { read: false, value: null } : readItem(host, config.storageKey);
    if (read.read && isExternalThemeId(read.value)) {
        const value = read.value;
        const isStatic = boot.external.statics.some((entry) => entry.id === value);
        return isStatic ? { theme: value, stored: true, restoring: null } : { theme: boot.external.fallback, stored: false, restoring: value };
    }
    const family = storedFamilyTheme(config, host);
    return { theme: family.stored ? family.theme : fallbackDefault, stored: family.stored, restoring: null };
}
/** Check everything, read both preferences, stamp the first state and leave the boot record. */
export function bootCatalog(raw, host) {
    const boot = resolveCatalogBoot(raw);
    checkModeRoot(host);
    const media = schemeMediaOf(host);
    const chosen = bootCatalogTheme(boot, host);
    const builtIn = !isExternalThemeId(chosen.theme);
    const migratable = { theme: (builtIn ? chosen.theme : boot.family.theme.defaultTheme), stored: builtIn && chosen.stored };
    const preference = familyMode(boot.family, migratable, host);
    const familyId = builtIn ? familyOfTheme(chosen.theme) : chosen.theme;
    const entry = bootFamilyEntries(boot).filter((candidate) => candidate.id === familyId)[0];
    if (entry === undefined)
        throw configError('the theme "' + familyId + '" is not offered');
    const state = catalogAppearance(entry, preference, media.matches);
    stampAppearance(host, state);
    const record = Object.freeze({
        kind: "atomicstrata-theme-catalog-boot", config: raw, state: state, restoring: chosen.restoring,
    });
    host.__atomicstrataThemeCatalog = record;
    return record;
}
/** The functions a catalog classic script adds after `bootParts()`, `modeParts()` and `familyParts()`. */
export function catalogBootParts() {
    return [
        isExternalThemeId, schemesOfModes, modesOfSchemes, catalogModes, catalogKeys, resolveStaticTheme, isCatalogUrl,
        resolveCatalogSource, resolveStaticThemes,
        resolveExternal, resolveCatalogBoot, bootFamilyEntries, catalogAppearance, bootCatalogTheme, bootCatalog,
    ];
}
