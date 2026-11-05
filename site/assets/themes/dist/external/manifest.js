/**
 * The validator of compiled theme manifests (`atomicstrata-theme-manifest/1`).
 *
 * One positive grammar, shared by the compiler (which validates what it is
 * about to write), the `check` command and the run time. A manifest is
 * accepted only in exactly this shape: every key known, every path an
 * `ASSET_PATH`, every digest a full SHA-256, the CSS integrity a SHA-384 SRI
 * value, the modes one of the accepted sets, a preview for exactly the
 * schemes those modes imply, and every font's CSS family the namespaced name
 * its id, build and family give. Anything else throws, naming the problem.
 *
 * What validation cannot do: prove that the stylesheet the manifest names
 * contains only what the compiler writes. That is established when the theme
 * is compiled; at run time the browser checks the bytes against the
 * integrity value, and the bytes are trusted as the publisher's.
 */
import { parseColour } from "../checks/colour.js";
import { isObject, isText, makeCheck, onlyKeys } from "../design-system/grammar.js";
import { MATERIAL_ROLES } from "./materials.js";
import { CONTRACT_VERSION } from "../registry.js";
import { jsonDataProblem } from "./json-data.js";
import { ASSET_PATH, isExternalThemeId, LAYER_NAME, LICENCE_ID, namespacedFamily, PACKAGE_NAME, PACKAGE_VERSION, PREVIEW_TOKENS, schemesOfModes, SEMVER_TEXT, SHA256_HEX, SRI_SHA384, THEME_MANIFEST_SCHEMA, } from "./schema.js";
const MANIFEST_KEYS = [
    "schema", "id", "version", "label", "contract", "modes", "build", "generator", "layer", "css", "ledger", "fonts",
    "preview", "provenance", "materials",
];
const MATERIAL_ROLE_NAMES = MATERIAL_ROLES;
const FONT_KEYS = ["family", "cssFamily", "licence", "copyright", "source", "licenceFile", "faces"];
const FACE_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
/** The error every manifest problem throws. */
export function manifestError(message) {
    return new Error(`@atomicstrata/themes: invalid theme manifest: ${message}`);
}
const check = makeCheck(manifestError);
/** `{ file, sha256 }`, with an asset path and a full SHA-256; `extra` keys are allowed beside them. */
function checkDigestedFile(test, raw, where, extra = []) {
    test(isObject(raw), `${where} must be an object`);
    const file = raw;
    onlyKeys(test, file, ["file", "sha256", ...extra], where);
    test(typeof file.file === "string" && ASSET_PATH.test(file.file), `${where}.file must be a relative asset path`);
    test(typeof file.sha256 === "string" && SHA256_HEX.test(file.sha256), `${where}.sha256 must be a SHA-256 in hex`);
}
/** The generator record: the package and version that compiled the document. */
export function checkGenerator(test, raw, where) {
    test(isObject(raw), `${where} must be an object`);
    const generator = raw;
    onlyKeys(test, generator, ["package", "version"], where);
    test(typeof generator.package === "string" && PACKAGE_NAME.test(generator.package), `${where}.package must be an npm package name`);
    test(typeof generator.version === "string" && PACKAGE_VERSION.test(generator.version), `${where}.version must be a package version`);
}
/** A cascade layer name, or null for unlayered output. */
export function checkLayer(test, raw, where) {
    test(raw === null || (typeof raw === "string" && LAYER_NAME.test(raw)), `${where} must be a layer name or null`);
}
function checkFace(raw, where) {
    checkDigestedFile(check, raw, where, ["weight", "style"]);
    const face = raw;
    check(FACE_WEIGHTS.includes(face.weight), `${where}.weight must be 100 to 900 in steps of 100`);
    check(face.style === "normal" || face.style === "italic", `${where}.style must be "normal" or "italic"`);
}
function checkFont(raw, where, manifest) {
    check(isObject(raw), `${where} must be an object`);
    const font = raw;
    onlyKeys(check, font, FONT_KEYS, where);
    check(isText(font.family), `${where}.family must be named`);
    const expected = namespacedFamily(manifest.id, manifest.build, font.family);
    check(font.cssFamily === expected, `${where}.cssFamily must be "${expected}"`);
    check(typeof font.licence === "string" && LICENCE_ID.test(font.licence), `${where}.licence must be a licence id`);
    check(isText(font.copyright) && isText(font.source), `${where} needs its copyright and source`);
    checkDigestedFile(check, font.licenceFile, `${where}.licenceFile`);
    check(Array.isArray(font.faces) && font.faces.length > 0, `${where}.faces must list at least one face`);
    font.faces.forEach((face, index) => checkFace(face, `${where}.faces[${index}]`));
}
function checkPreview(raw, modes) {
    const schemes = schemesOfModes(modes);
    check(schemes !== null, 'modes must be ["light"], ["dark"] or ["system","light","dark"]');
    check(isObject(raw), "preview must be an object");
    onlyKeys(check, raw, schemes, "preview");
    for (const scheme of schemes) {
        const values = raw[scheme];
        check(isObject(values), `preview.${scheme} must be given`);
        onlyKeys(check, values, PREVIEW_TOKENS, `preview.${scheme}`);
        for (const token of PREVIEW_TOKENS) {
            const value = values[token];
            check(typeof value === "string" && parseColour(value) !== null, `preview.${scheme}.${token} must be a colour`);
        }
    }
}
function checkIdentity(manifest) {
    check(manifest.schema === THEME_MANIFEST_SCHEMA, `schema must be "${THEME_MANIFEST_SCHEMA}"`);
    check(isExternalThemeId(manifest.id), "id must be an external theme id (ext-…, at most 32 characters)");
    check(typeof manifest.version === "string" && SEMVER_TEXT.test(manifest.version), "version must be x.y.z");
    check(isText(manifest.label), "label must be a non-empty string");
    check(manifest.contract === CONTRACT_VERSION, `contract must be ${CONTRACT_VERSION}`);
    check(typeof manifest.build === "string" && SHA256_HEX.test(manifest.build), "build must be a SHA-256 in hex");
    checkGenerator(check, manifest.generator, "generator");
    checkLayer(check, manifest.layer, "layer");
}
function checkProvenance(raw) {
    check(isObject(raw), "provenance must be an object");
    const provenance = raw;
    onlyKeys(check, provenance, ["author", "licence", "notes"], "provenance");
    check(isText(provenance.author) && isText(provenance.licence), "provenance needs an author and a licence");
    check(provenance.notes === undefined || isText(provenance.notes), "provenance.notes must be text when given");
}
/** Where a manifest or index may hold `null`: its unlayered `layer`. */
export const LAYER_MAY_BE_NULL = (path) => path === "$.layer";
/** `materials`, when given: distinct material roles in table order. */
function checkMaterials(raw) {
    if (raw === undefined)
        return;
    check(Array.isArray(raw) && raw.every((role) => MATERIAL_ROLE_NAMES.includes(role)), "materials must list material roles");
    const order = raw.map((role) => MATERIAL_ROLE_NAMES.indexOf(role));
    check(order.every((index, at) => at === 0 || index > order[at - 1]), "materials must list each role once, in table order");
}
/** Validate a parsed manifest, returning it typed. Throws on the first problem. */
export function validateThemeManifest(raw) {
    const problem = jsonDataProblem(raw, "$", LAYER_MAY_BE_NULL);
    check(problem === null, `not plain JSON data: ${problem}`);
    check(isObject(raw), "expected a manifest object");
    const manifest = raw;
    onlyKeys(check, manifest, MANIFEST_KEYS, "the manifest");
    checkIdentity(manifest);
    checkDigestedFile(check, manifest.css, "css", ["integrity"]);
    const integrity = manifest.css.integrity;
    check(typeof integrity === "string" && SRI_SHA384.test(integrity), "css.integrity must be a sha384 SRI value");
    checkDigestedFile(check, manifest.ledger, "ledger");
    check(Array.isArray(manifest.fonts), "fonts must be a list");
    manifest.fonts.forEach((font, index) => checkFont(font, `fonts[${index}]`, manifest));
    checkPreview(manifest.preview, manifest.modes);
    checkProvenance(manifest.provenance);
    checkMaterials(manifest.materials);
    return manifest;
}
