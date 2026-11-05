/**
 * The optional colour-mode preference (System, Light or Dark), on the same
 * owner as the theme.
 *
 * A design system whose profile opts into explicit modes reads
 * `data-design-mode` on the root: `light` or `dark` pins its native colours,
 * and an absent attribute follows the operating system. This file stores
 * that preference under its own key and stamps the attribute, beside the
 * theme. It adds no theme id, never changes `data-theme`, and never stores
 * the operating system's resolved scheme: "system" is stored as itself and
 * removes the attribute, so the stylesheet's media query decides.
 *
 * It extends `boot-core.ts` without changing it. `bootWithMode` validates the
 * theme configuration (with `boot-core`'s resolver) and the mode
 * configuration completely, reads both preferences, then runs `bootCore`
 * unchanged and adds a `mode` controller to the controller it left. A
 * configuration without `designMode` never reaches this file, so the
 * existing deliveries are byte-for-byte what they were.
 *
 * Like `boot-core.ts`, every function here is self-contained: it may call the
 * functions listed in `modeParts` and `bootParts`, and nothing else from
 * module scope, because the classic scripts are assembled from their source.
 */
import { type ResolvedConfig, type ScriptLike, type ThemeController, type ThemeHost } from "./boot-core.ts";
export type DesignModePreference = "system" | "light" | "dark";
/** The mode preference's own storage. `storageKey` is always explicit; `null` means session-only. */
export interface DesignModeConfig {
    storageKey: string | null;
    /** The preference with nothing stored; "system" when omitted. */
    default?: DesignModePreference;
}
export interface DesignModeController {
    readonly ids: readonly DesignModePreference[];
    readonly defaultMode: DesignModePreference;
    current(): DesignModePreference;
    select(value: unknown): DesignModePreference;
    subscribe(listener: (mode: DesignModePreference) => void): () => void;
}
export interface ResolvedModeConfig {
    storageKey: string | null;
    defaultMode: DesignModePreference;
}
export interface ModeRoot {
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
}
/** The three preferences, in menu order. The only place they are written. */
export declare function designModes(): DesignModePreference[];
/** Separate the mode configuration from the theme configuration, which `boot-core` checks as before. */
export declare function splitModeConfig(raw: unknown): {
    theme: Record<string, unknown>;
    mode: unknown;
};
/**
 * Check the mode configuration against the already checked theme one. The
 * mode key must differ from the theme key and from the legacy theme key, so
 * neither preference can overwrite the other.
 */
export declare function resolveModeConfig(raw: unknown, theme: Pick<ResolvedConfig, "storageKey" | "legacy">): ResolvedModeConfig;
/** An offered preference is itself; anything else, including an over-long value, is the default. */
export declare function validMode(value: unknown, config: ResolvedModeConfig): DesignModePreference;
/** `light` and `dark` set the attribute; `system` removes it. */
export declare function stampMode(root: ModeRoot, mode: DesignModePreference): void;
/** A mode preference removes the root attribute for "system", so the root must be able to. */
export declare function checkModeRoot(host: ThemeHost): void;
/**
 * Check both configurations and the host, apply the theme and the mode, and
 * leave one controller carrying both on the host.
 */
export declare function bootWithMode(raw: unknown, host: ThemeHost): ThemeController;
/**
 * The prebuilt mode script's configuration: the theme's attributes as
 * before, plus exactly one of `data-mode-storage-key` and the bare
 * `data-mode-session-only`, and optionally `data-mode-default`. Its opening
 * check repeats `configFromScript`'s for the same reason as the controller's
 * `select`: the pinned pre-paint bytes.
 */
export declare function modeConfigFromScript(script: ScriptLike | null, theme: Record<string, unknown>): Record<string, unknown>;
/**
 * Whether a configuration asks for the mode preference. Read without
 * assuming its shape, so a malformed one reaches the resolver's own error.
 * Not part of `modeParts`: the classic scripts never call it.
 */
export declare function asksForMode(config: unknown): boolean;
/** The functions a mode-aware classic script adds after `bootParts()`. */
export declare function modeParts(): Array<(...args: never[]) => unknown>;
