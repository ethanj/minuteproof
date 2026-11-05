#!/usr/bin/env node
/**
 * `atomicstrata-design-system`: acquire pinned brand files, then compile a
 * design-system profile into a stylesheet and manifest.
 *
 *   atomicstrata-design-system acquire --profile <file|name> --out <dir> [--brand <id>]…
 *   atomicstrata-design-system compile --profile <file|name> --out <dir>
 *       (--sources <dir> [--brand <id>]… | --brand <id>=<file>…) [--bind-product-slot] [--check]
 *       [--recipes <file|name> [--recipe-appearances native|native,theme]] [--theme-families]
 *
 * `--profile strata` names the profile this package ships; `--recipes strata`
 * its recipe document, and a consumer's document that `extends` it brings it
 * along. Recipes apply to native scopes only unless `--recipe-appearances
 * native,theme` is given. `acquire` needs the GitHub CLI signed in to an
 * account that can read the pinned source.
 * `--theme-families` also qualifies the theme-family states (Clay Dark, and
 * Minimal pinned against the system) under the theme appearance and in
 * adapted recipes, recording them in the ledger.
 *
 * `compile` is offline. `--check` writes nothing and exits 1 when the files
 * in `--out` are missing or differ from a fresh compile, for CI.
 */
import { acquireBrandFiles, brandFilesIn, compileFiles, readProfile, readRecipes, staleOutput, writeOutput, } from "./node.js";
const VALUED = ["--profile", "--out", "--sources", "--brand", "--recipes", "--recipe-appearances"];
const FLAGS = ["--bind-product-slot", "--check", "--theme-families"];
function parse(argv) {
    var _a;
    const [command = "", ...rest] = argv;
    const options = new Map();
    const flags = new Set();
    for (let index = 0; index < rest.length; index += 1) {
        const name = rest[index];
        if (FLAGS.includes(name)) {
            flags.add(name);
            continue;
        }
        if (!VALUED.includes(name) || index + 1 >= rest.length)
            throw new Error(`unknown or incomplete argument "${name}"`);
        index += 1;
        options.set(name, [...((_a = options.get(name)) !== null && _a !== void 0 ? _a : []), rest[index]]);
    }
    return { command, options, flags };
}
/** The one value of an option that must be given exactly once. */
function requireSingle(args, name) {
    var _a;
    const values = (_a = args.options.get(name)) !== null && _a !== void 0 ? _a : [];
    if (values.length !== 1)
        throw new Error(`${name} is required once`);
    return values[0];
}
/** `id=file` split at the first `=`, so a file name may itself contain `=`. */
function splitBrandArg(entry) {
    const separator = entry.indexOf("=");
    return [entry.slice(0, separator), entry.slice(separator + 1)];
}
/** `--brand id=file` pairs, or the brands under `--sources`. */
function brandFiles(args, profile) {
    var _a;
    const brands = (_a = args.options.get("--brand")) !== null && _a !== void 0 ? _a : [];
    if (args.options.has("--sources"))
        return brandFilesIn(profile, requireSingle(args, "--sources"), brands);
    if (brands.length === 0 || !brands.every((entry) => entry.includes("="))) {
        throw new Error("give --sources <dir>, or --brand <id>=<file> for each brand");
    }
    return Object.fromEntries(brands.map(splitBrandArg));
}
/** `--recipes` with optional `--recipe-appearances`, as compile options, or no options. */
function recipeOptions(args) {
    if (!args.options.has("--recipes")) {
        if (args.options.has("--recipe-appearances"))
            throw new Error("--recipe-appearances needs --recipes");
        return {};
    }
    const listed = args.options.has("--recipe-appearances") ? requireSingle(args, "--recipe-appearances") : "native";
    const appearances = listed.split(",");
    return { recipes: { documents: readRecipes(requireSingle(args, "--recipes")), appearances } };
}
function compileCommand(args) {
    const profile = readProfile(requireSingle(args, "--profile"));
    const output = compileFiles({
        profile, brandFiles: brandFiles(args, profile), bindProductSlot: args.flags.has("--bind-product-slot"),
        ...recipeOptions(args), ...(args.flags.has("--theme-families") ? { themeFamilies: true } : {}),
    });
    const outDir = requireSingle(args, "--out");
    if (!args.flags.has("--check")) {
        for (const file of writeOutput(output, outDir))
            console.log(`wrote ${file}`);
        return 0;
    }
    const stale = staleOutput(output, outDir);
    for (const file of stale)
        console.error(`stale: ${file}`);
    return stale.length === 0 ? 0 : 1;
}
function main(argv) {
    var _a;
    const args = parse(argv);
    if (args.command === "compile")
        return compileCommand(args);
    if (args.command === "acquire") {
        const profile = readProfile(requireSingle(args, "--profile"));
        const acquired = acquireBrandFiles(profile, requireSingle(args, "--out"), (_a = args.options.get("--brand")) !== null && _a !== void 0 ? _a : []);
        for (const file of acquired)
            console.log(`acquired ${file}`);
        return 0;
    }
    throw new Error('the command is "acquire" or "compile"');
}
try {
    process.exitCode = main(process.argv.slice(2));
}
catch (error) {
    console.error(`atomicstrata-design-system: ${error.message}`);
    process.exitCode = 1;
}
