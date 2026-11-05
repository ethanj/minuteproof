/**
 * The single implementation of theme resolution.
 *
 * Every delivery of the pre-paint behaviour is built from the functions in
 * this file: the module controller imports them, and the classic scripts (the
 * generated ones with embedded configuration and the prebuilt ones that read
 * their own `data-*` attributes, each with or without the mode preference)
 * are assembled from their source text by `prepaint.ts`. For that to work each function here must be self-contained:
 * it may call the other functions listed in `bootParts`, and nothing else from
 * module scope. `tests/boot-deliveries.test.ts` runs the assembled text in an
 * empty context, so a stray outer reference fails there.
 *
 * Order of work is fixed: configuration is checked completely before storage
 * is read or the document is touched, so a malformed configuration leaves the
 * page on the stylesheet's safe `:root` defaults and changes nothing.
 */
import type { ThemeFamiliesConfig, ThemeFamilyController } from "./family-core.ts";
import type { DesignModeConfig, DesignModeController } from "./mode-core.ts";
export type CanonicalThemeId = "scientific-clay" | "minimal" | "nebula-light" | "nebula-dark";
export type ThemeId = CanonicalThemeId | "product";
/** What a consumer supplies. `storageKey` is always explicit; `null` means session-only. */
export interface ThemeConfig {
    storageKey: string | null;
    themes?: readonly CanonicalThemeId[];
    productTheme?: {
        label: string;
    };
    defaultTheme?: ThemeId;
    legacyPreference?: {
        key: string;
        values: Readonly<Record<string, ThemeId>>;
    };
    /**
     * Optional: the System/Light/Dark preference for design systems with
     * explicit modes, under its own key (`mode-core.ts`).
     */
    designMode?: DesignModeConfig;
    /** Optional: theme families sharing the `designMode` preference (`family-core.ts`). Needs `designMode`. */
    families?: ThemeFamiliesConfig;
}
export interface ThemeController {
    readonly ids: readonly ThemeId[];
    readonly labels: Readonly<Record<string, string>>;
    readonly defaultTheme: ThemeId;
    current(): ThemeId;
    select(value: unknown): ThemeId;
    subscribe(listener: (theme: ThemeId) => void): () => void;
    /** Present when the configuration has `designMode`: the mode preference, with its own snapshot and subscription. */
    readonly mode?: DesignModeController;
    /** Present when the configuration has `families` (`family-core.ts`). */
    readonly family?: ThemeFamilyController;
}
interface ThemedRoot {
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
    /** Needed only with `designMode`, which removes `data-design-mode` for "system"; checked before anything is read. */
    removeAttribute?(name: string): void;
}
interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** The window-shaped object the resolver acts on. Reading `localStorage` may throw. */
export interface ThemeHost {
    document: {
        documentElement: ThemedRoot;
    };
    localStorage?: StorageLike;
    __atomicstrataTheme?: ThemeController;
}
/** The classic script's own `<script>` element, as far as configuration is read from it. Shared with `mode-core.ts`. */
export interface ScriptLike {
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
}
/** A checked configuration (`resolveConfig`). Shared with `mode-core.ts`. */
export interface ResolvedConfig {
    storageKey: string | null;
    ids: ThemeId[];
    labels: Record<string, string>;
    defaultTheme: ThemeId;
    legacy: {
        key: string;
        values: Record<string, ThemeId>;
    } | null;
}
/** The canonical ids and their labels, in selector order. The only place they are written. */
export declare function canonicalThemes(): Array<[CanonicalThemeId, string]>;
/** The error every configuration problem throws: the package prefix, then the problem. Shared with `mode-core.ts`. */
export declare function configError(message: string): Error;
/** A non-empty string. Shared with `mode-core.ts`. */
export declare function isFilledString(value: unknown): value is string;
/** Check a configuration completely. Throws before anything is read or written. */
export declare function resolveConfig(raw: unknown): ResolvedConfig;
/**
 * An offered id is itself; anything else is the default. The length bound is
 * applied before membership so an untrusted stored value is never compared in
 * full against the set.
 */
export declare function validTheme(value: unknown, config: ResolvedConfig): ThemeId;
/**
 * Read one stored value, reporting whether the read itself worked. Storage
 * that throws on access or on read (private modes, blocked site data) is not
 * the same as storage that holds nothing: only a successful read of nothing
 * may fall through to a legacy preference. A missing `localStorage` is a
 * successful read of nothing.
 */
export declare function readItem(host: ThemeHost, key: string): {
    read: boolean;
    value: string | null;
};
/** Persist best-effort. A refused write leaves the selection in force for this page only. */
export declare function writeItem(host: ThemeHost, key: string, value: string): void;
/** Check the configuration, stamp the theme in force on the root, and leave the controller on the host. */
export declare function bootCore(raw: unknown, host: ThemeHost): ThemeController;
/**
 * Read a configuration from the classic script's own tag:
 * `data-storage-key="…"` or the bare attribute `data-session-only` (exactly
 * one), and optionally `data-themes` (space separated), `data-product-label`
 * and `data-default`. Legacy migration needs the generated script instead.
 */
export declare function configFromScript(script: ScriptLike | null): Record<string, unknown>;
/** Every function a classic script needs, in an order where each is declared before the call that starts it. */
export declare function bootParts(): Array<(...args: never[]) => unknown>;
export {};
