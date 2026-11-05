/**
 * The semantic token contract, version 1.
 *
 * Every canonical theme, and each colour-scheme block of Minimal, gives a
 * value to every name here; `css/tokens/base.css` gives each a safe default.
 * Names are written without the leading `--`. Product token families (graph,
 * gate, category, workflow) are not part of the contract and stay with the
 * product that owns them.
 */
const STATUSES = ["success", "info", "warning", "danger"];
/** Tokens painted as a page or panel background. */
export const SURFACE_TOKENS = [
    "canvas", "surface-base", "surface-raised", "surface-muted", "surface-recessed", "surface-glass",
];
/** Per status: the decorative accent, the readable text ink, and the tinted fill that ink sits on. */
export const STATUS_TOKENS = STATUSES.flatMap((status) => [
    `status-${status}`, `status-${status}-text`, `status-${status}-soft`,
]);
export const TOKEN_NAMES = Object.freeze([
    ...SURFACE_TOKENS,
    "text-primary", "text-muted", "text-inverse", "text-interactive", "border-subtle", "focus-ring",
    "interactive-primary", "interactive-primary-soft", "interactive-secondary", "interactive-secondary-text",
    ...STATUS_TOKENS, "status-danger-border",
    "font-body", "font-heading", "font-mono", "font-weight-heading", "max-content-width",
    "radius-container", "radius-card", "radius-control",
    "shadow-surface", "shadow-card", "shadow-button", "shadow-hover", "shadow-pressed",
    "motion-fast", "motion-standard", "motion-easing",
    "ambient-violet", "ambient-pink", "ambient-sky",
]);
/** Text roles that must stay readable on every surface of their theme. */
export const TEXT_TOKENS = [
    "text-primary", "text-muted", "text-interactive", "interactive-secondary-text",
    ...STATUSES.map((status) => `status-${status}-text`),
];
/** Each tinted fill with the only text token meant to sit on it. */
export const SOFT_FILL_PAIRS = [
    ...STATUSES.map((status) => [`status-${status}-soft`, `status-${status}-text`]),
    ["interactive-primary-soft", "text-interactive"],
];
