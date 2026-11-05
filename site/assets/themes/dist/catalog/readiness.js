/**
 * The one decision about an external theme's stylesheet: is it ready to be
 * shown now, must the page's own (static) stylesheet first be verified, must
 * a stylesheet be loaded, or is there none? Selection, stored restore,
 * automatic upgrade and successor adoption all ask `decide`, and nothing
 * else decides.
 *
 * Legal states of one theme's stylesheets (the applied asset, at most one,
 * and, for a static theme, the readiness of the page's own delivery):
 *
 * | Applied asset | Static readiness | Identity that counts |
 * | --- | --- | --- |
 * | none | — | nothing is shown for this id |
 * | `static` | `declared` (not yet checked) | the descriptor's build; shown only as the boot's first paint |
 * | `static` | `verified` (the compiler's sentinel read back) | the descriptor's build |
 * | `owned`, entry known | any | build + the URL and integrity the link was loaded with |
 * | `owned`, adopted (entry unknown) | any | the same; trusted only once an offer names exactly that URL and integrity |
 *
 * A static readiness of `missing` (the sentinel was read back absent) is a
 * fact about the page: that delivery is never trusted again.
 *
 * Decision for an offer entry (`decide`):
 *
 * 1. The theme in force, chosen again, when its bytes are actually ready
 *    (an owned link, or a verified static delivery): ready; nothing changes
 *    (so a retired theme, or a newer owned build whose catalog entry was
 *    withdrawn, is never silently replaced). A static theme in force whose
 *    delivery is only declared (the boot's check still pending) or missing
 *    is decided like any other entry: verified first.
 * 2. The applied asset has the entry's complete identity: ready.
 * 3. The entry is the page's static build: verified, ready; declared,
 *    verify first; missing, fall through.
 * 4. The entry names a stylesheet (`css`): load it.
 * 5. Otherwise: unavailable.
 *
 * Verification reads the build sentinel on a hidden, connected probe element
 * carrying the theme id, never on the root, with that theme's own owned link
 * (another build of the same id) switched off for the read, so nothing shown
 * changes before the decision and an owned build never hides the page's own. It reads once; if the sentinel is absent and the window has
 * not finished loading, it reads again after `load`.
 */
import { BUILD_PROPERTY } from "../external/schema.js";
/** Whether two offer entries name the same stylesheet bytes: build, URL and integrity. */
export function sameAsset(first, second) {
    var _a, _b, _c, _d;
    return first !== undefined && first.build === second.build && ((_a = first.css) === null || _a === void 0 ? void 0 : _a.href) === ((_b = second.css) === null || _b === void 0 ? void 0 : _b.href)
        && ((_c = first.css) === null || _c === void 0 ? void 0 : _c.integrity) === ((_d = second.css) === null || _d === void 0 ? void 0 : _d.integrity);
}
/**
 * Whether the applied asset has `entry`'s complete identity: a static one
 * only when verified and of the same build; an owned one when its build,
 * URL and integrity are the entry's. A matching build or marker alone never
 * counts for an owned link.
 */
export function appliedMatches(applied, entry, readiness) {
    if (applied === undefined || applied.build !== entry.build)
        return false;
    if (applied.kind === "static")
        return readiness === "verified";
    return entry.css !== null && applied.href === entry.css.href && applied.integrity === entry.css.integrity;
}
/** Whether an applied asset's bytes are known to be in force: an owned link, or a verified static delivery. */
function bytesReady(applied, readiness) {
    return applied !== undefined && (applied.kind === "owned" || readiness === "verified");
}
/** The decision for one offer entry, by the table above. */
export function decide(entry, inputs) {
    if (inputs.inForce && bytesReady(inputs.applied, inputs.readiness))
        return { kind: "ready", via: "in-force" };
    if (appliedMatches(inputs.applied, entry, inputs.readiness))
        return { kind: "ready", via: "applied" };
    const declared = inputs.declared !== undefined && inputs.declared.build === entry.build ? inputs.declared : undefined;
    if (declared !== undefined && inputs.readiness === "verified")
        return { kind: "ready", via: "static" };
    if (declared !== undefined && inputs.readiness === "declared")
        return { kind: "verify", theme: declared };
    if (entry.css !== null)
        return { kind: "load" };
    return { kind: "unavailable" };
}
/** The sentinel a static theme's compiled stylesheet declares. */
export function sentinelOf(theme) {
    return JSON.stringify(`${theme.id}@${theme.version}+${theme.build}`);
}
/** Read the build sentinel the page's stylesheets give an element carrying `id`, without touching the root. */
export function probeSentinel(host, id) {
    var _a;
    const doc = host.document;
    const probe = doc.createElement("span");
    probe.setAttribute("data-theme", id);
    probe.setAttribute("aria-hidden", "true");
    probe.hidden = true;
    const parent = ((_a = doc.body) !== null && _a !== void 0 ? _a : doc.documentElement);
    parent.append(probe);
    try {
        return host.getComputedStyle(probe).getPropertyValue(BUILD_PROPERTY).trim();
    }
    finally {
        probe.remove();
    }
}
