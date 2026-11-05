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
export {};
