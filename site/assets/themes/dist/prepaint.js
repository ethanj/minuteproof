/**
 * Classic-script deliveries of the pre-paint resolver.
 *
 * Every script here is assembled from the source text of the functions in
 * `boot-core.ts` (and, with the mode preference, `mode-core.ts`), so none can
 * drift from the module controller: there is no second implementation to
 * keep in step. `prepaintSource` embeds a checked
 * configuration and is for consumers with a build step, who either write the
 * string to a same-origin file (strict content security policies) or splice it
 * inline ahead of the first stylesheet. `prepaintGlobalSource` is the text of
 * the prebuilt `prepaint.global.js`, which reads its configuration from its own
 * tag and so needs no build step at all.
 *
 * A configuration with `designMode` adds the mode functions (`mode-core.ts`)
 * and boots through `bootWithMode`; without it the output is exactly what it
 * was before modes existed. `prepaintModeGlobalSource` is the text of the
 * prebuilt `prepaint-mode.global.js`, the attribute-configured script with
 * the mode preference.
 *
 * Run these generators from an unbundled install at build time. They rely on
 * `Function.prototype.toString`, which returns exactly the shipped source.
 */
import { bootCore, bootParts, configFromScript, resolveConfig } from "./boot-core.js";
import { asksForFamilies, bootWithFamilies, familyConfigFromScript, familyParts, resolveFamilyBoot, } from "./family-core.js";
import { asksForMode, bootWithMode, modeConfigFromScript, modeParts, resolveModeConfig, splitModeConfig, } from "./mode-core.js";
/** Characters that would end a script element or a JavaScript line when embedded inline. */
const UNSAFE_INLINE = new RegExp("[<" + String.fromCharCode(0x2028, 0x2029) + "]", "g");
function partsSource(withMode = false, withFamilies = false) {
    const parts = [...bootParts(), ...(withMode ? modeParts() : []), ...(withFamilies ? familyParts() : [])];
    return parts.map((part) => part.toString()).join("\n");
}
/** JSON safe to embed in an inline `<script>`: `<` and the two line separators escaped. Shared with `catalog/prepaint.ts`. */
export function inlineJson(value) {
    const escaped = (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
    return JSON.stringify(value).replace(UNSAFE_INLINE, escaped);
}
/**
 * A classic script that applies `config` before first paint.
 * Throws on an invalid configuration, so a bad build fails instead of shipping.
 */
export function prepaintSource(config) {
    if (asksForFamilies(config)) {
        resolveFamilyBoot(config);
        return `(function(){\n${partsSource(true, true)}\n${bootWithFamilies.name}(${inlineJson(config)},window);\n})();\n`;
    }
    if (asksForMode(config)) {
        const parts = splitModeConfig(config);
        resolveModeConfig(parts.mode, resolveConfig(parts.theme));
        return `(function(){\n${partsSource(true)}\n${bootWithMode.name}(${inlineJson(config)},window);\n})();\n`;
    }
    resolveConfig(config);
    return `(function(){\n${partsSource()}\n${bootCore.name}(${inlineJson(config)},window);\n})();\n`;
}
/** The text of `prepaint.global.js`: configuration comes from the script tag's `data-*` attributes. */
export function prepaintGlobalSource() {
    const configured = `${configFromScript.name}(document.currentScript)`;
    return `(function(){\n${partsSource()}\n${bootCore.name}(${configured},window);\n})();\n`;
}
/**
 * The text of `prepaint-mode.global.js`: the theme's attributes plus
 * `data-mode-storage-key` or `data-mode-session-only`, and `data-mode-default`.
 */
export function prepaintModeGlobalSource() {
    const themeConfigured = `${configFromScript.name}(document.currentScript)`;
    const configured = `${modeConfigFromScript.name}(document.currentScript,${themeConfigured})`;
    return `(function(){\n${partsSource(true)}\n${bootWithMode.name}(${configured},window);\n})();\n`;
}
/**
 * The text of `prepaint-family.global.js`: the mode script's attributes, plus
 * `data-product-modes` and `data-migrate-mode`.
 */
export function prepaintFamilyGlobalSource() {
    const script = "document.currentScript";
    const themeConfigured = `${configFromScript.name}(${script})`;
    const modeConfigured = `${modeConfigFromScript.name}(${script},${themeConfigured})`;
    const configured = `${familyConfigFromScript.name}(${script},${modeConfigured})`;
    return `(function(){\n${partsSource(true, true)}\n${bootWithFamilies.name}(${configured},window);\n})();\n`;
}
