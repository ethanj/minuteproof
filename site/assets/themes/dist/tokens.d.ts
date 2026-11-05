/**
 * The semantic token contract, version 1.
 *
 * Every canonical theme, and each colour-scheme block of Minimal, gives a
 * value to every name here; `css/tokens/base.css` gives each a safe default.
 * Names are written without the leading `--`. Product token families (graph,
 * gate, category, workflow) are not part of the contract and stay with the
 * product that owns them.
 */
/** Tokens painted as a page or panel background. */
export declare const SURFACE_TOKENS: readonly ["canvas", "surface-base", "surface-raised", "surface-muted", "surface-recessed", "surface-glass"];
/** Per status: the decorative accent, the readable text ink, and the tinted fill that ink sits on. */
export declare const STATUS_TOKENS: string[];
export declare const TOKEN_NAMES: readonly string[];
/** Text roles that must stay readable on every surface of their theme. */
export declare const TEXT_TOKENS: readonly ["text-primary", "text-muted", "text-interactive", "interactive-secondary-text", ...string[]];
/** Each tinted fill with the only text token meant to sit on it. */
export declare const SOFT_FILL_PAIRS: ReadonlyArray<readonly [string, string]>;
