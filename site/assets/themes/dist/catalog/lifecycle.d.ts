/**
 * What a catalog controller does over time, beyond a person's choices:
 * discovery, refresh, restoring a stored theme, upgrading the stylesheet of
 * the theme in force, the preview sheet, and checking the static stylesheet
 * the page booted with.
 *
 * - **Fetches run one after another.** Discovery and every refresh are
 *   queued on one chain, so index responses are applied in request order and
 *   an older response can never replace a newer one. Only the fetch and the
 *   offer's replacement are queued; the loads they start (restore, upgrade,
 *   previews) run outside the chain, each guarded by identity, so a
 *   stylesheet that never answers cannot block a later refresh.
 * - **Revisions govern offers.** A higher revision replaces the offer as a
 *   whole; the same content again changes nothing; a lower revision, or the
 *   same revision with other content, is refused and the offer stays.
 * - **Applying an offer never changes what is shown.** A theme in force the
 *   new offer lacks stays in force as a retired choice (its applied entry).
 * - **Upgrade.** When the offer names other bytes for the theme in force
 *   (build, URL or integrity), they are staged and swapped in when they load,
 *   with their label and modes, writing nothing. A failed upgrade keeps the
 *   build in force. The catalog withdrawing a newer build (the offer falling
 *   back to the page's static descriptor) never downgrades the build in
 *   force: a static entry is not an upgrade.
 * - **Restore.** A stored external theme that was not delivered statically
 *   is pursued after discovery as a restore intent (`pursue`), which any
 *   later theme or mode choice supersedes. If the offer lacks it, the page
 *   stays as it is, storage is not touched, and `lastError` is "unavailable".
 * - **Boot check.** When the theme painted first is a static one, its
 *   stylesheet is verified with the same probe the decision uses
 *   (`staticReady`). If it is missing while still shown, the page moves to
 *   `external.fallback` without writing storage (`settleStaticReadiness`).
 *
 * Every step re-checks disposal after each notification it causes, so a
 * subscriber that disposes the controller stops all later work.
 */
import { type Owner } from "./owner.ts";
import { type CatalogSettled } from "./state.ts";
/** Discovery: started once; later calls return the same promise. After disposal, nothing is fetched. */
export declare function discover(owner: Owner): Promise<CatalogSettled>;
/** Refresh: fetch again, queued after discovery and any earlier refresh. */
export declare function refresh(owner: Owner): Promise<CatalogSettled>;
/**
 * Verify the static stylesheet the page booted with, with the decision's
 * own probe, and record the result where every path reacts to it
 * (`settleStaticReadiness`): if it is missing while still shown, the page
 * moves to the fallback, writing nothing.
 */
export declare function verifyBootStatic(owner: Owner): Promise<void>;
