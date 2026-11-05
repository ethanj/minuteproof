/**
 * The validator of catalog indexes (`atomicstrata-theme-catalog/1`).
 *
 * A catalog index is the one mutable document a publisher hosts: it lists
 * the compiled themes on offer, each with its build id and the stylesheet
 * (with integrity) that pins it: the effective asset identity, apart from the
 * offer's label and version, and the preview sheet that paints palette swatches before
 * any theme is loaded. The compiler writes it, `check` re-reads it, and the
 * run time will fetch it. All three accept exactly this shape.
 *
 * Every `href` is an `ASSET_PATH`, relative to the index, so an index can
 * only point inside its own directory. Every asset carries SHA-384
 * integrity. Ids are external ids, unique in the index. The list may be
 * empty: a publisher withdraws its last theme by publishing an index with
 * none, whose `layer` still states the layer the catalog is published for. The contract version
 * must be this package's. Revisions are positive safe integers; comparing
 * two revisions is the run time's job, not this validator's.
 */
import { isObject, isText, makeCheck, onlyKeys } from "../design-system/grammar.js";
import { CONTRACT_VERSION } from "../registry.js";
import { jsonDataProblem } from "./json-data.js";
import { checkGenerator, checkLayer, LAYER_MAY_BE_NULL } from "./manifest.js";
import { ASSET_PATH, CATALOG_ID, isExternalThemeId, schemesOfModes, SEMVER_TEXT, SHA256_HEX, SRI_SHA384, THEME_CATALOG_SCHEMA, } from "./schema.js";
const INDEX_KEYS = ["schema", "catalog", "revision", "contract", "layer", "generator", "previews", "themes"];
const ENTRY_KEYS = ["id", "version", "label", "modes", "build", "css"];
/** The error every index problem throws. */
export function catalogError(message) {
    return new Error(`@atomicstrata/themes: invalid theme catalog: ${message}`);
}
const check = makeCheck(catalogError);
function checkAsset(raw, where) {
    check(isObject(raw), `${where} must be an object`);
    const asset = raw;
    onlyKeys(check, asset, ["href", "integrity"], where);
    check(typeof asset.href === "string" && ASSET_PATH.test(asset.href), `${where}.href must be a relative asset path`);
    check(typeof asset.integrity === "string" && SRI_SHA384.test(asset.integrity), `${where}.integrity must be sha384`);
}
function checkEntry(raw, where) {
    check(isObject(raw), `${where} must be an object`);
    const entry = raw;
    onlyKeys(check, entry, ENTRY_KEYS, where);
    check(isExternalThemeId(entry.id), `${where}.id must be an external theme id (ext-…, at most 32 characters)`);
    check(typeof entry.version === "string" && SEMVER_TEXT.test(entry.version), `${where}.version must be x.y.z`);
    check(isText(entry.label), `${where}.label must be a non-empty string`);
    check(schemesOfModes(entry.modes) !== null, `${where}.modes must be an accepted mode set`);
    check(typeof entry.build === "string" && SHA256_HEX.test(entry.build), `${where}.build must be a SHA-256 in hex`);
    checkAsset(entry.css, `${where}.css`);
}
function checkHeader(index) {
    check(index.schema === THEME_CATALOG_SCHEMA, `schema must be "${THEME_CATALOG_SCHEMA}"`);
    check(typeof index.catalog === "string" && CATALOG_ID.test(index.catalog), "catalog must be a catalog id");
    const revision = index.revision;
    check(Number.isSafeInteger(revision) && revision > 0, "revision must be a positive integer");
    check(index.contract === CONTRACT_VERSION, `contract must be ${CONTRACT_VERSION}`);
    checkLayer(check, index.layer, "layer");
    checkGenerator(check, index.generator, "generator");
    checkAsset(index.previews, "previews");
}
/** Validate a parsed catalog index, returning it typed. Throws on the first problem. */
export function validateCatalogIndex(raw) {
    const problem = jsonDataProblem(raw, "$", LAYER_MAY_BE_NULL);
    check(problem === null, `not plain JSON data: ${problem}`);
    check(isObject(raw), "expected a catalog object");
    const index = raw;
    onlyKeys(check, index, INDEX_KEYS, "the catalog");
    checkHeader(index);
    check(Array.isArray(index.themes), "themes must be a list (empty when the publisher has withdrawn every theme)");
    const seen = new Set();
    index.themes.forEach((entry, position) => {
        checkEntry(entry, `themes[${position}]`);
        const id = entry.id;
        check(!seen.has(id), `themes lists "${String(id)}" more than once`);
        seen.add(id);
    });
    return index;
}
