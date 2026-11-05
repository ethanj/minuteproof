/**
 * Shared names, shapes and grammars of compiled external themes.
 *
 * The theme compiler writes three kinds of document: a theme **manifest**
 * beside each compiled stylesheet, a **ledger** of its contrast measurements,
 * and a catalog **index** listing published themes. The compiler, its
 * `check` command and the forthcoming run-time catalog controller all read
 * them through the validators in `manifest.ts` and `catalog-index.ts`, which
 * are built from the grammars here. Nothing in this directory uses Node or
 * the DOM, so the run time can import it without the compiler.
 *
 * Asset paths are a positive grammar, not a URL policy bolted on later: a
 * path is one or more lower-case segments joined by `/`, each starting with
 * a letter or digit. A path therefore has no scheme, host, query, fragment,
 * backslash, percent escape or dot segment, and resolves inside the
 * directory of the document that names it.
 */
import type { ThemeScheme } from "../family-core.ts";
import { isExternalThemeId, type ExternalThemeId } from "./id.ts";
export declare const THEME_SOURCE_SCHEMA = "atomicstrata-theme-source/1";
export declare const THEME_MANIFEST_SCHEMA = "atomicstrata-theme-manifest/1";
export declare const THEME_LEDGER_SCHEMA = "atomicstrata-theme-ledger/1";
export declare const THEME_CATALOG_SCHEMA = "atomicstrata-theme-catalog/1";
/**
 * The private custom property every compiled theme declares on its own
 * selector: `"<id>@<version>+<build>"`. Reading it on the root tells which
 * compiled build is in force; it is not a contract token.
 */
export declare const BUILD_PROPERTY = "--atomicstrata-theme-build";
/** The tokens the appearance switch's palette previews read, and the only ones a catalog's preview sheet sets. */
export declare const PREVIEW_TOKENS: readonly ["canvas", "surface-raised", "interactive-primary"];
export type PreviewToken = (typeof PREVIEW_TOKENS)[number];
/** A colour scheme, as theme families name it. */
export type { ThemeScheme } from "../family-core.ts";
export type ThemeMode = "system" | "light" | "dark";
/** Hex characters of a content hash used in a file or family name: 128 bits of a SHA-256. */
export declare const NAME_HASH_LENGTH = 32;
export declare const SHA256_HEX: RegExp;
/** Subresource integrity, one algorithm only: SHA-384, 48 bytes, 64 base64 characters. */
export declare const SRI_SHA384: RegExp;
/** A relative asset path: lower-case segments joined by `/`, each starting with a letter or digit. */
export declare const ASSET_PATH: RegExp;
/** A cascade layer name the compiled output may be wrapped in. */
export declare const LAYER_NAME: RegExp;
/** A catalog id: lower-case words joined by single hyphens, at most 32 characters. */
export declare const CATALOG_ID: RegExp;
export declare const SEMVER_TEXT: RegExp;
/** A licence identifier as written in SPDX expressions (`OFL-1.1`, `MIT`). */
export declare const LICENCE_ID: RegExp;
/** An npm package name, as the generator record names the compiler. */
export declare const PACKAGE_NAME: RegExp;
/** An npm package version: x.y.z with an optional pre-release. */
export declare const PACKAGE_VERSION: RegExp;
/** A file the document names, with the SHA-256 of its bytes. */
export interface DigestedFile {
    file: string;
    sha256: string;
}
export interface ThemeFontFace extends DigestedFile {
    weight: number;
    style: "normal" | "italic";
}
/** One self-hosted family: the family as authored, its namespaced CSS name, its licence text and provenance. */
export interface ThemeFontRecord {
    family: string;
    cssFamily: string;
    licence: string;
    copyright: string;
    source: string;
    licenceFile: DigestedFile;
    faces: ThemeFontFace[];
}
export interface ThemeManifest {
    schema: typeof THEME_MANIFEST_SCHEMA;
    id: ExternalThemeId;
    version: string;
    label: string;
    contract: number;
    modes: ThemeMode[];
    build: string;
    generator: {
        package: string;
        version: string;
    };
    layer: string | null;
    css: DigestedFile & {
        integrity: string;
    };
    ledger: DigestedFile;
    fonts: ThemeFontRecord[];
    preview: Partial<Record<ThemeScheme, Record<PreviewToken, string>>>;
    provenance: {
        author: string;
        licence: string;
        notes?: string;
    };
    /** The material roles the build sets (`material-table.ts`); absent when the source carried no materials. */
    materials?: string[];
}
/** An asset a catalog names, relative to the catalog document, with the integrity a browser checks. */
export interface CatalogAsset {
    href: string;
    integrity: string;
}
export interface CatalogEntry {
    id: ExternalThemeId;
    version: string;
    label: string;
    modes: ThemeMode[];
    build: string;
    css: CatalogAsset;
}
export interface CatalogIndex {
    schema: typeof THEME_CATALOG_SCHEMA;
    catalog: string;
    revision: number;
    contract: number;
    layer: string | null;
    generator: {
        package: string;
        version: string;
    };
    previews: CatalogAsset;
    themes: CatalogEntry[];
}
/**
 * The modes a theme supports, from the schemes it compiled: one scheme is
 * that mode alone; both are System, Light and Dark. These are the only
 * accepted sets.
 */
export declare function modesOfSchemes(schemes: readonly ThemeScheme[]): ThemeMode[];
/** The schemes behind an accepted mode set; null for any other value, including lists of non-strings. */
export declare function schemesOfModes(modes: unknown): ThemeScheme[] | null;
/**
 * The CSS family name of a self-hosted face: the theme id and 128 bits of
 * its build, then the family as authored. `@font-face` is global to a
 * document, so the name must not collide with the package's families, the
 * consumer's, another theme's or another build of the same theme.
 */
export declare function namespacedFamily(id: ExternalThemeId, build: string, family: string): string;
/** An external theme id, re-exported for the validators. */
export { isExternalThemeId };
