/**
 * The compact switch's loading and failure state, rendered into the four
 * elements it touches: the polite status line, the theme rows' fieldset
 * (`aria-busy` while a theme loads), each theme row (`data-pending` on the
 * one loading) and the disclosure's accessible summary (which names a
 * failure). Separate from `appearance-switch.ts` so it can be exercised
 * without a document: it reads nothing but the view it is given.
 */
import { statusOf } from "./select.js";
/** The loading and failure line, the busy state of the theme rows, and a failure in the summary. */
export function renderStatus(parts, state) {
    var _a;
    const status = statusOf(state);
    parts.status.textContent = status;
    parts.status.hidden = status.length === 0;
    if (state.pending === null)
        parts.familySet.removeAttribute("aria-busy");
    else
        parts.familySet.setAttribute("aria-busy", "true");
    for (const input of parts.familyInputs)
        input.toggleAttribute("data-pending", input.value === state.pending);
    if (state.error !== null)
        parts.summary.textContent = `${(_a = parts.summary.textContent) !== null && _a !== void 0 ? _a : ""} ${state.error}`;
}
