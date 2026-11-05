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
import { isExternalThemeId } from "./id.js";
export const THEME_SOURCE_SCHEMA = "atomicstrata-theme-source/1";
export const THEME_MANIFEST_SCHEMA = "atomicstrata-theme-manifest/1";
export const THEME_LEDGER_SCHEMA = "atomicstrata-theme-ledger/1";
export const THEME_CATALOG_SCHEMA = "atomicstrata-theme-catalog/1";
/**
 * The private custom property every compiled theme declares on its own
 * selector: `"<id>@<version>+<build>"`. Reading it on the root tells which
 * compiled build is in force; it is not a contract token.
 */
export const BUILD_PROPERTY = "--atomicstrata-theme-build";
/** The tokens the appearance switch's palette previews read, and the only ones a catalog's preview sheet sets. */
export const PREVIEW_TOKENS = Object.freeze(["canvas", "surface-raised", "interactive-primary"]);
/** Hex characters of a content hash used in a file or family name: 128 bits of a SHA-256. */
export const NAME_HASH_LENGTH = 32;
export const SHA256_HEX = /^[0-9a-f]{64}$/;
/** Subresource integrity, one algorithm only: SHA-384, 48 bytes, 64 base64 characters. */
export const SRI_SHA384 = /^sha384-[A-Za-z0-9+/]{64}$/;
/** A relative asset path: lower-case segments joined by `/`, each starting with a letter or digit. */
export const ASSET_PATH = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;
/** A cascade layer name the compiled output may be wrapped in. */
export const LAYER_NAME = /^[a-z][a-z0-9-]{0,63}$/;
/** A catalog id: lower-case words joined by single hyphens, at most 32 characters. */
export const CATALOG_ID = /^(?=.{1,32}$)[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const SEMVER_TEXT = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
/** A licence identifier as written in SPDX expressions (`OFL-1.1`, `MIT`). */
export const LICENCE_ID = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/;
/** An npm package name, as the generator record names the compiler. */
export const PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
/** An npm package version: x.y.z with an optional pre-release. */
export const PACKAGE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
/**
 * The modes a theme supports, from the schemes it compiled: one scheme is
 * that mode alone; both are System, Light and Dark. These are the only
 * accepted sets.
 */
export function modesOfSchemes(schemes) {
    if (schemes.length === 2)
        return ["system", "light", "dark"];
    return [schemes[0]];
}
/** The schemes behind an accepted mode set; null for any other value, including lists of non-strings. */
export function schemesOfModes(modes) {
    if (!Array.isArray(modes) || !modes.every((mode) => typeof mode === "string"))
        return null;
    const text = modes.join(",");
    if (text === "system,light,dark")
        return ["light", "dark"];
    return text === "light" || text === "dark" ? [text] : null;
}
/**
 * The CSS family name of a self-hosted face: the theme id and 128 bits of
 * its build, then the family as authored. `@font-face` is global to a
 * document, so the name must not collide with the package's families, the
 * consumer's, another theme's or another build of the same theme.
 */
export function namespacedFamily(id, build, family) {
    return `${id}-${build.slice(0, NAME_HASH_LENGTH)} ${family}`;
}
/** An external theme id, re-exported for the validators. */
export { isExternalThemeId };
