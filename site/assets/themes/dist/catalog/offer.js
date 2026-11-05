/**
 * The external themes on offer: the page's static themes merged with the
 * catalog's latest index.
 *
 * The offer is what a person may choose next. It is not what the page is
 * showing: the stylesheet in effect for each theme (the applied asset,
 * `assets.ts`) is kept apart, so a newer offer never changes the page until
 * a load of it commits.
 *
 * Merging a static theme with a catalog entry of the same id. The authority
 * for an update is the accepted catalog revision (the controller accepts
 * only newer revisions), never the themes' own version numbers: every
 * compiler release changes every build while a source version may stay,
 * and a publisher rolling a theme back publishes a higher revision with the
 * older values.
 *
 * - The same build with the same offer (version, label, modes) is the same
 *   theme: one entry, which the page already delivers, with the catalog's
 *   stylesheet available too.
 * - The same build with a different offer is incoherent: the static entry
 *   stays, and the conflict is reported.
 * - Another build is the catalog's update: the offer takes it, and the
 *   controller stages it; the build in force stays until that load commits.
 * - A static theme the catalog does not list stays offered: the page
 *   delivers it, whatever the catalog holds.
 *
 * Catalog-only themes follow in index order.
 */
function staticEntry(theme) {
    return Object.freeze({
        id: theme.id, label: theme.label, version: theme.version, modes: Object.freeze(theme.modes.slice()), build: theme.build,
        css: null, origin: "static",
    });
}
function catalogEntry(entry, href) {
    return Object.freeze({
        id: entry.id, label: entry.label, version: entry.version, modes: Object.freeze(entry.modes.slice()), build: entry.build,
        css: Object.freeze({ href, integrity: entry.css.integrity }), origin: "catalog",
    });
}
/** The static theme or the catalog entry for one id, by the rules above. */
function mergeOne(theme, listed, conflicts) {
    if (listed === undefined)
        return staticEntry(theme);
    if (listed.build !== theme.build)
        return listed;
    const coherent = listed.version === theme.version && listed.label === theme.label && listed.modes.join() === theme.modes.join();
    if (coherent)
        return Object.freeze({ ...staticEntry(theme), css: listed.css });
    conflicts.push(theme.id);
    return staticEntry(theme);
}
/** Merge the static themes with an index (or none); `hrefOf` resolves an index href to its absolute URL. */
export function mergeOffer(statics, index, hrefOf) {
    var _a;
    const listed = new Map(((_a = index === null || index === void 0 ? void 0 : index.themes) !== null && _a !== void 0 ? _a : []).map((entry) => [entry.id, catalogEntry(entry, hrefOf(entry.css.href))]));
    const conflicts = [];
    const entries = statics.map((theme) => mergeOne(theme, listed.get(theme.id), conflicts));
    for (const entry of listed.values()) {
        if (!statics.some((theme) => theme.id === entry.id))
            entries.push(entry);
    }
    return { entries, conflicts };
}
