/**
 * The catalog controller's public state, and the pure functions that build
 * it: one frozen `ThemeCatalogState` per transition, its frozen choices, and
 * its errors.
 *
 * Choices, in order: the built-in families as the family configuration
 * offers them, then the external themes on offer (`offer.ts`), then, when
 * the theme in force is no longer offered (a later index withdrew it), that
 * theme as a retired choice. A retired theme stays in force until the
 * person leaves it, and cannot be chosen again.
 *
 * The state separates what is shown (`theme`, `family`, `mode`,
 * `effectiveMode`, `scheme`, `applied`) from what is wanted but not yet
 * shown (`pending`, a selection being loaded; `restoring`, a stored theme
 * awaiting discovery) and from what is on offer (`choices`, `catalog`).
 */
/** A frozen error. */
export function catalogFailure(kind, id, message) {
    return Object.freeze({ kind, id, message });
}
function choiceOf(entry, retired) {
    return Object.freeze({
        id: entry.id, label: entry.label, modes: entry.modes, origin: entry.origin, version: entry.version, build: entry.build,
        retired,
    });
}
/**
 * The frozen choice list. `retiredEntry` is the theme in force when the
 * offer no longer lists it.
 */
export function choicesOf(builtIns, offer, retiredEntry) {
    const choices = builtIns.map((family) => Object.freeze({
        id: family.id, label: family.label, modes: Object.freeze(family.modes.slice()), origin: "built-in",
        version: null, build: null, retired: false,
    }));
    for (const entry of offer)
        choices.push(choiceOf(entry, false));
    if (retiredEntry !== null)
        choices.push(choiceOf(retiredEntry, true));
    return Object.freeze(choices);
}
/** One frozen state from its parts. */
export function stateOf(parts) {
    const theme = parts.appearance.theme;
    const applied = parts.applied !== undefined && parts.applied.id === theme
        ? Object.freeze({ id: parts.applied.id, build: parts.applied.build })
        : null;
    return Object.freeze({
        ...parts.appearance, choices: parts.choices, pending: parts.pending, restoring: parts.restoring,
        catalog: Object.freeze({ ...parts.catalog }), lastError: parts.lastError, applied,
    });
}
