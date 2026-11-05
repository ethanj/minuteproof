/**
 * The compiler's Node entry (`@atomicstrata/themes/design-system/compiler`).
 *
 * Wraps the pure compiler with the file system: reading a profile (a path, or
 * the name of a profile this package ships under `design-systems/`), reading
 * recipe documents (a path or a shipped name, with the shipped document a
 * consumer's `extends` names), reading brand files, writing or checking the
 * generated stylesheet and manifest, and acquiring pinned brand files from
 * their source with the GitHub CLI.
 *
 * Acquisition is the only step that touches the network, and it is separate:
 * upstream bytes are fetched once, by an authenticated `gh`, at the commit the
 * profile pins, and verified against the profile's digests before they are
 * written. Compiling afterwards is offline. This package never contains those
 * bytes or anything generated from them.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compileDesignSystem, sha256 } from "./compile.js";
import { PROFILE_SLUG } from "./grammar.js";
import { ledgerJson } from "./ledger-json.js";
import { recipeError } from "./recipe-validate.js";
import { profileError, validateProfile } from "./validate.js";
import { brandOf } from "./types.js";
export { compileDesignSystem, sha256, } from "./compile.js";
export { validateProfile } from "./validate.js";
export { measureAdapted, measurePair } from "./contrast.js";
export { THEME_SCHEMES } from "./adaptation.js";
export { mergeRecipes, validateRecipes } from "./recipe-validate.js";
export * from "./recipe-types.js";
export * from "./types.js";
const PACKAGE_ROOT = new URL("../../", import.meta.url);
/** A name this package may ship under `design-systems/<name>/`: a profile id. */
const SHIPPED_NAME = PROFILE_SLUG;
/** Room for any value file `gh api` returns; spawnSync's default 1 MiB buffer fails on a larger one. */
const GH_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
/** The package's own name and version, recorded in generated files. */
export function generatorInfo() {
    const packageJson = readFileSync(new URL("package.json", PACKAGE_ROOT), "utf8");
    const manifest = JSON.parse(packageJson);
    return { package: manifest.name, version: manifest.version };
}
/** The package's canonical maps as one stylesheet, for gap values. */
export function canonicalCss() {
    return readFileSync(new URL("css/theme.bundle.css", PACKAGE_ROOT), "utf8");
}
/**
 * `fileName` of the system this package ships under that name (`strata`),
 * or, when the argument is not such a name or a file by that name exists,
 * the argument as a path.
 */
function shippedOrPath(pathOrName, fileName) {
    if (SHIPPED_NAME.test(pathOrName) && !existsSync(pathOrName)) {
        return new URL(`design-systems/${pathOrName}/${fileName}`, PACKAGE_ROOT);
    }
    return path.resolve(pathOrName);
}
/** A profile by file path, or by the name of one this package ships (`strata`). Validated. */
export function readProfile(pathOrName) {
    const file = shippedOrPath(pathOrName, "profile.json");
    if (!existsSync(file))
        throw profileError(`no profile at ${String(file)}`);
    return validateProfile(JSON.parse(readFileSync(file, "utf8")));
}
/** One shipped document's or file's text: a name the package ships (`strata`), or a path. */
function recipeText(pathOrName) {
    const file = shippedOrPath(pathOrName, "recipes.json");
    if (!existsSync(file))
        throw recipeError(`no recipes at ${String(file)}`);
    return readFileSync(file, "utf8");
}
/**
 * A recipe document's text, preceded by the shipped document it `extends`,
 * if any: the order `compileDesignSystem` takes.
 */
export function readRecipes(pathOrName) {
    const text = recipeText(pathOrName);
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        throw recipeError(`${pathOrName} is not JSON: ${error.message}`);
    }
    if (typeof parsed.extends !== "string")
        return [text];
    if (!SHIPPED_NAME.test(parsed.extends))
        throw recipeError("extends must name a shipped recipe");
    return [recipeText(parsed.extends), text];
}
/** Compile from files on disk. */
export function compileFiles(options) {
    const brandFiles = Object.fromEntries(Object.entries(options.brandFiles).map(([brand, file]) => [brand, readFileSync(file, "utf8")]));
    return compileDesignSystem({
        profile: options.profile, brandFiles, canonicalCss: canonicalCss(), bindProductSlot: options.bindProductSlot,
        generator: generatorInfo(), ...(options.recipes === undefined ? {} : { recipes: options.recipes }),
        ...(options.themeFamilies === true ? { themeFamilies: true } : {}),
    });
}
/** The brand-to-file map for brands acquired under `sourcesDir` at their profile paths. */
export function brandFilesIn(profile, sourcesDir, brands) {
    const chosen = brands.length > 0 ? brands : Object.keys(profile.brands);
    return Object.fromEntries(chosen.map((brand) => {
        const pin = brandOf(profile, brand);
        if (pin === undefined)
            throw profileError(`unknown brand "${brand}"`);
        return [brand, path.join(sourcesDir, pin.file)];
    }));
}
/** The three generated files' paths and text: stylesheet, run-time manifest, review ledger (`ledgerJson`). */
export function outputFiles(output, outDir) {
    const id = output.manifest.id;
    const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
    return [
        [path.join(outDir, `${id}.css`), output.css],
        [path.join(outDir, `${id}.manifest.json`), json(output.manifest)],
        [path.join(outDir, `${id}.ledger.json`), ledgerJson(output.ledger)],
    ];
}
/** Write the generated files. */
export function writeOutput(output, outDir) {
    mkdirSync(outDir, { recursive: true });
    return outputFiles(output, outDir).map(([file, text]) => {
        writeFileSync(file, text);
        return file;
    });
}
/** The generated files that are missing or differ from what is on disk. */
export function staleOutput(output, outDir) {
    return outputFiles(output, outDir)
        .filter(([file, text]) => !existsSync(file) || readFileSync(file, "utf8") !== text)
        .map(([file]) => file);
}
const runGh = (args) => {
    const result = spawnSync("gh", [...args], { encoding: "utf8", maxBuffer: GH_MAX_OUTPUT_BYTES });
    if (result.error) {
        const advice = "install the GitHub CLI and run gh auth login";
        throw new Error(`acquire: could not run gh (${result.error.message}); ${advice}`);
    }
    if (result.status !== 0)
        throw new Error(`acquire: gh ${args.join(" ")} failed: ${result.stderr.trim()}`);
    return result.stdout;
};
/** Fetch each chosen brand's value file at the pinned commit, verify its digest, and write it under `outDir`. */
export function acquireBrandFiles(profile, outDir, brands, gh = runGh) {
    const { repository, commit } = profile.source;
    if (profile.source.kind !== "registry" || repository === undefined || commit === undefined) {
        const kind = profile.source.kind;
        throw profileError(`${profile.id} has a "${kind}" source; its value files are supplied, not acquired`);
    }
    return Object.entries(brandFilesIn(profile, outDir, brands)).map(([brand, target]) => {
        const pin = profile.brands[brand];
        const contents = `repos/${repository}/contents/${pin.file}?ref=${commit}`;
        const text = gh(["api", contents, "-H", "Accept: application/vnd.github.raw+json"]);
        if (sha256(text) !== pin.sha256) {
            throw profileError(`brand ${brand}: ${pin.file} at ${commit} does not match the pinned SHA-256`);
        }
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, text);
        return target;
    });
}
