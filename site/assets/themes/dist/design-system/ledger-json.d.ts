/**
 * The review ledger's file text: the one place a ledger becomes bytes.
 *
 * Contrast ratios are measured and judged at full precision (`contrast.ts`,
 * `recipe-contrast.ts`), but the sRGB `** 2.4` step behind them is not
 * correctly rounded, and V8 12.x (Node 22) and 13.x (Node 24+) disagree in
 * the last place or two. Written at full precision, the same inputs gave
 * different ledger bytes on different Node versions, and `compile --check`
 * called a ledger from another runtime stale.
 *
 * So each measured ratio is written truncated to `LEDGER_RATIO_DECIMALS`
 * places, at its explicit place in the ledger: `contrast[].ratio`,
 * `adaptedContrast[].ratio`, `recipes.contrast[].ratio`, and `before` and
 * `after` of every override measurement, isolated and combined. Nothing
 * else in the ledger is touched. The compile's own `CompileOutput.ledger`
 * is not changed: only the written copy is.
 *
 * Truncating the shortest decimal form never rounds up across a threshold:
 * a ratio judged below a floor of at most that many decimals (4.5, 3) is
 * written below it, and one judged at or above it is written at or above
 * it. Pass, exception and failure are decided before this step, never from
 * these digits. A written ratio is within 1e-10 of the measurement, so an
 * exception pinned with it needs a tolerance above that (Strata pins 1e-9);
 * a pin with tolerance 0 must use the full-precision ratio the compile's
 * error reports.
 *
 * This is not a universal floating-point identity: two runtimes whose values
 * fall either side of a tenth-decimal boundary would still write different
 * digits. What was measured is stated in `docs/design-systems.md` §8.
 */
import type { DesignSystemLedger } from "./compile.ts";
/** A ratio's shortest decimal form, truncated to `LEDGER_RATIO_DECIMALS` places. */
export declare function ledgerRatio(ratio: number): number;
/** The ledger file's text: two-space JSON with a final newline, ratios truncated. */
export declare function ledgerJson(ledger: DesignSystemLedger): string;
