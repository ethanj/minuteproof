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
import type { StaticExternalTheme } from "./boot.ts";
import type { AppliedAsset } from "./assets.ts";
import type { OfferEntry } from "./offer.ts";
export type StaticReadiness = "declared" | "verified" | "missing";
export type Decision = 
/** `via`: the theme is in force already, its applied asset has the entry's identity, or the page's static build is verified. */
{
    readonly kind: "ready";
    readonly via: "in-force" | "applied" | "static";
} | {
    readonly kind: "verify";
    readonly theme: StaticExternalTheme;
} | {
    readonly kind: "load";
} | {
    readonly kind: "unavailable";
};
/** What `decide` reads: the applied asset, the page's static descriptor and its readiness, the theme in force. */
export interface DecisionInputs {
    readonly applied: AppliedAsset | undefined;
    readonly declared: StaticExternalTheme | undefined;
    readonly readiness: StaticReadiness | undefined;
    readonly inForce: boolean;
}
/** Whether two offer entries name the same stylesheet bytes: build, URL and integrity. */
export declare function sameAsset(first: OfferEntry | undefined, second: OfferEntry): boolean;
/**
 * Whether the applied asset has `entry`'s complete identity: a static one
 * only when verified and of the same build; an owned one when its build,
 * URL and integrity are the entry's. A matching build or marker alone never
 * counts for an owned link.
 */
export declare function appliedMatches(applied: AppliedAsset | undefined, entry: OfferEntry, readiness: StaticReadiness | undefined): boolean;
/** The decision for one offer entry, by the table above. */
export declare function decide(entry: OfferEntry, inputs: DecisionInputs): Decision;
/** The members of the window the probe uses. */
export interface ProbeHost {
    document: {
        readonly readyState: string;
        readonly body: {
            append(node: unknown): void;
        } | null;
        readonly documentElement: unknown;
        createElement(tag: "span"): ProbeElement;
    };
    getComputedStyle?(element: unknown): {
        getPropertyValue(name: string): string;
    };
}
interface ProbeElement {
    hidden: boolean;
    setAttribute(name: string, value: string): void;
    remove(): void;
}
/** The sentinel a static theme's compiled stylesheet declares. */
export declare function sentinelOf(theme: StaticExternalTheme): string;
/** Read the build sentinel the page's stylesheets give an element carrying `id`, without touching the root. */
export declare function probeSentinel(host: ProbeHost, id: string): string;
export {};
