/**
 * The compact switch's loading and failure state, rendered into the four
 * elements it touches: the polite status line, the theme rows' fieldset
 * (`aria-busy` while a theme loads), each theme row (`data-pending` on the
 * one loading) and the disclosure's accessible summary (which names a
 * failure). Separate from `appearance-switch.ts` so it can be exercised
 * without a document: it reads nothing but the view it is given.
 */
import type { AppearanceView } from "./appearance-source.ts";
import type { SwitchElements } from "./appearance-switch-dom.ts";
/** The elements the status rendering writes. */
export type StatusElements = Pick<SwitchElements, "status" | "familySet" | "familyInputs" | "summary">;
/** The loading and failure line, the busy state of the theme rows, and a failure in the summary. */
export declare function renderStatus(parts: StatusElements, state: AppearanceView): void;
