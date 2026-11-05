/**
 * Bind native theme selectors to a controller.
 *
 * Fills every `<select data-theme-select>` under a root with the controller's
 * closed registry, shows the theme already applied, and hands a person's
 * change to the controller. It keeps no state of its own: what is shown is
 * always what the controller reports, so several selectors stay in step and
 * the control cannot disagree with the document.
 *
 * On a page with theme families (`family-core.ts`) two more selectors bind
 * the same way: `<select data-theme-family-select>` (the families) and
 * `<select data-theme-mode-select>` (System, Light, Dark). The mode select
 * shows the person's preference. When the current family cannot show it (a
 * single-mode product), every `[data-theme-mode-note]` under the root says
 * so, and what is shown instead, and the select is described by it; the
 * preference is kept for the families that can show it. A binding owns only
 * what it adds: the note's text and visibility are given back on release,
 * and only the note ids it added to `aria-describedby` are ever removed.
 *
 * Binding is idempotent per element: binding a select that is already bound
 * first releases its earlier binding, so wiring a page twice (or a component
 * that mounts again) never leaves two listeners, and one change is one
 * selection and one stored write.
 */
const THEME_SELECTOR = "select[data-theme-select]";
const FAMILY_SELECTOR = "select[data-theme-family-select]";
const MODE_SELECTOR = "select[data-theme-mode-select]";
const NOTE_SELECTOR = "[data-theme-mode-note]";
const STATUS_SELECTOR = "[data-theme-status]";
export const MODE_LABELS = { system: "System", light: "Light", dark: "Dark" };
/** The labels and modes of a view's families. */
export function capabilitiesOf(view) {
    const labels = {};
    for (const family of view.families)
        labels[family.id] = family.label;
    const modes = (id) => { var _a; var _b; return (_b = (_a = view.families.find((family) => family.id === id)) === null || _a === void 0 ? void 0 : _a.modes) !== null && _b !== void 0 ? _b : []; };
    return { labels, modes };
}
const adapted = new WeakMap();
/** A family page's controller as a source: its families never change, and nothing is pending. */
function familySource(family, mode) {
    const families = Object.freeze(family.ids.map((id) => { var _a; return Object.freeze({
        id, label: (_a = family.labels[id]) !== null && _a !== void 0 ? _a : id, modes: family.modes(id), selectable: true,
    }); }));
    let last = null;
    return Object.freeze({
        view() {
            const state = family.snapshot();
            if (last === null || last.state !== state) {
                last = { state, view: Object.freeze({ ...state, families, pending: null, error: null }) };
            }
            return last.view;
        },
        subscribe: (listener) => family.subscribe(() => listener()),
        selectFamily: (id) => {
            family.select(id);
        },
        selectMode: (value) => {
            mode.select(value);
        },
    });
}
/**
 * The appearance source of a controller: a catalog controller's own, or a
 * family page's adapted (one adapter per controller). Null for a controller
 * that has neither, such as a page without families.
 */
export function appearanceSourceOf(controller) {
    if (controller === null || typeof controller !== "object")
        return null;
    const candidate = controller;
    if (candidate.appearance !== undefined)
        return candidate.appearance;
    if (candidate.family === undefined || candidate.mode === undefined)
        return null;
    let source = adapted.get(controller);
    if (source === undefined) {
        source = familySource(candidate.family, candidate.mode);
        adapted.set(controller, source);
    }
    return source;
}
/** The release function of each select's current binding. */
const bound = new WeakMap();
/** The release function of each mode note's, and each mode select's description, current binding. */
const described = new WeakMap();
function ownerDocumentOf(root) {
    var _a;
    return (_a = root.ownerDocument) !== null && _a !== void 0 ? _a : root;
}
function fill(select, choices) {
    const options = choices.map((choice) => {
        const option = ownerDocumentOf(select).createElement("option");
        option.value = choice.id;
        option.textContent = choice.label;
        if (choice.disabled)
            option.disabled = true;
        return option;
    });
    select.replaceChildren(...options);
}
/**
 * `aria-busy` while a selection loads. Only a value this binding set is ever
 * removed, so a consumer's own `aria-busy` survives.
 */
function busyMarker(select) {
    let marked = false;
    return {
        show(busy) {
            if (busy && select.getAttribute("aria-busy") === null) {
                select.setAttribute("aria-busy", "true");
                marked = true;
            }
            else if (!busy && marked) {
                select.removeAttribute("aria-busy");
                marked = false;
            }
        },
    };
}
/**
 * Bind one select, releasing whatever bound it before. Returns its release
 * function. The options are filled again when they change (a catalog's
 * offer), and the shown value always returns to what is in force, so a
 * failed or superseded selection visibly reverts.
 */
function bindOne(select, choice) {
    var _a;
    (_a = bound.get(select)) === null || _a === void 0 ? void 0 : _a();
    let shown = choice.options();
    fill(select, shown);
    const busy = busyMarker(select);
    const onChange = () => {
        choice.select(select.value);
    };
    const update = () => {
        const options = choice.options();
        if (options !== shown) {
            shown = options;
            fill(select, options);
        }
        select.value = choice.current();
        busy.show(choice.busy());
    };
    const unsubscribe = choice.subscribe(update);
    select.addEventListener("change", onChange);
    update();
    const release = () => {
        if (bound.get(select) !== release)
            return;
        bound.delete(select);
        unsubscribe();
        select.removeEventListener("change", onChange);
        busy.show(false);
    };
    bound.set(select, release);
    return release;
}
/** What the family shows instead of the preference, stated from its capabilities. */
function shownInstead(modes, state) {
    const effective = MODE_LABELS[state.effectiveMode];
    if (state.mode === "system")
        return `cannot follow the system, so it shows ${effective}`;
    if (state.effectiveMode === "system")
        return `follows the system and cannot be set to ${MODE_LABELS[state.mode]}`;
    return modes.length === 1 ? `shows ${effective} only` : `cannot show ${MODE_LABELS[state.mode]}, so it shows ${effective}`;
}
/**
 * Why the mode in force differs from the preference, or "" when it does not,
 * worded from what the family can actually show.
 */
export function modeNote(family, state) {
    var _a;
    if (state.effectiveMode === state.mode)
        return "";
    const label = (_a = family.labels[state.family]) !== null && _a !== void 0 ? _a : state.family;
    const keptFor = state.mode === "system" ? "themes that can follow it" : "themes that can show it";
    return `${label} ${shownInstead(family.modes(state.family), state)}. Your ${MODE_LABELS[state.mode]} choice is kept for ${keptFor}.`;
}
/**
 * Apply the mode note to one element now and on every change. An earlier
 * binding of the element is released (and restores the element) before
 * `own` captures it, so the new binding records the consumer's own state,
 * never another binding's. Releasing a binding a later one replaced does
 * nothing.
 */
function bindDescription(element, source, own, text) {
    var _a;
    (_a = described.get(element)) === null || _a === void 0 ? void 0 : _a();
    const owned = own();
    const update = () => owned.apply(text(source.view()));
    update();
    const unsubscribe = source.subscribe(update);
    const release = () => {
        if (described.get(element) !== release)
            return;
        described.delete(element);
        unsubscribe();
        owned.restore();
    };
    described.set(element, release);
    return release;
}
/** A note's text and visibility, restored to what the consumer had on release. */
function ownNote(note) {
    const original = { text: note.textContent, hidden: note.hidden };
    return {
        apply(text) {
            note.textContent = text;
            note.hidden = text.length === 0;
        },
        restore() {
            note.textContent = original.text;
            note.hidden = original.hidden;
        },
    };
}
/**
 * A select's `aria-describedby`: the note ids are added while a note is shown
 * and removed otherwise. Ids the consumer had there when binding (its own
 * help text, or a note it already referenced) are never removed.
 */
function ownDescribedBy(select, noteIds) {
    const tokens = () => { var _a; return ((_a = select.getAttribute("aria-describedby")) !== null && _a !== void 0 ? _a : "").split(/\s+/).filter(Boolean); };
    const consumers = tokens();
    const added = noteIds.filter((id) => !consumers.includes(id));
    const write = (shown) => {
        const kept = tokens().filter((id) => !added.includes(id));
        const next = shown ? [...kept, ...added] : kept;
        if (next.length > 0)
            select.setAttribute("aria-describedby", next.join(" "));
        else
            select.removeAttribute("aria-describedby");
    };
    return { apply: (text) => write(text.length > 0), restore: () => write(false) };
}
/** The mode note of a view. */
const noteOf = (view) => modeNote(capabilitiesOf(view), view);
/** A status line: the family being loaded, else the last failure, else nothing. */
export function statusOf(view) {
    var _a;
    var _b, _c;
    if (view.pending !== null) {
        const label = (_b = (_a = view.families.find((family) => family.id === view.pending)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : view.pending;
        return `Loading ${label}…`;
    }
    return (_c = view.error) !== null && _c !== void 0 ? _c : "";
}
/**
 * Keep every mode note and status element under `root` in step with the
 * state, and describe each mode select by the notes.
 */
function bindNotes(root, source, modeSelects) {
    const notes = Array.from(root.querySelectorAll(NOTE_SELECTOR));
    const statuses = Array.from(root.querySelectorAll(STATUS_SELECTOR));
    const ids = notes.map((note) => note.id).filter((id) => id.length > 0);
    return [
        ...notes.map((note) => bindDescription(note, source, () => ownNote(note), noteOf)),
        ...statuses.map((status) => bindDescription(status, source, () => ownNote(status), statusOf)),
        ...modeSelects.map((select) => bindDescription(select, source, () => ownDescribedBy(select, ids), noteOf)),
    ];
}
/** The family and mode choices of a source, as selectors bind them. */
function sourceChoices(source) {
    let families = null;
    const familyOptions = () => {
        const current = source.view().families;
        if (families === null || families.from !== current) {
            const options = current.map((family) => ({ id: family.id, label: family.label, disabled: !family.selectable }));
            families = { from: current, options: Object.freeze(options) };
        }
        return families.options;
    };
    const modes = Object.freeze(["system", "light", "dark"]
        .map((id) => ({ id, label: MODE_LABELS[id], disabled: false })));
    const shared = { subscribe: (listener) => source.subscribe(listener) };
    return {
        family: {
            ...shared, options: familyOptions, current: () => source.view().family,
            select: (value) => source.selectFamily(value), busy: () => source.view().pending !== null,
        },
        mode: { ...shared, options: () => modes, current: () => source.view().mode, select: (value) => source.selectMode(value), busy: () => false },
    };
}
/** A theme controller's own theme ids, which never change. */
function themeChoice(controller) {
    const options = Object.freeze(controller.ids.map((id) => { var _a; return ({ id, label: (_a = controller.labels[id]) !== null && _a !== void 0 ? _a : id, disabled: false }); }));
    return {
        options: () => options, current: () => controller.current(), select: (value) => {
            controller.select(value);
        },
        subscribe: (listener) => controller.subscribe(() => listener()), busy: () => false,
    };
}
/**
 * Fill and wire every theme selector under `root`, and on a family page (or
 * a catalog page) every family and mode selector, mode note and status
 * element. On a catalog page a theme selector lists the families too: a
 * catalog page has no separate theme list.
 * @returns a function that releases the bindings this call made. Releasing a
 *   binding that a later call has already replaced does nothing.
 */
export function bindThemeSelect(root, controller) {
    const all = (selector) => Array.from(root.querySelectorAll(selector));
    const source = appearanceSourceOf(controller);
    const choices = source === null ? null : sourceChoices(source);
    const isCatalog = controller.appearance !== undefined;
    const theme = isCatalog ? choices.family : themeChoice(controller);
    const releases = all(THEME_SELECTOR).map((select) => bindOne(select, theme));
    if (choices !== null && source !== null) {
        releases.push(...all(FAMILY_SELECTOR).map((select) => bindOne(select, choices.family)));
        const modeSelects = all(MODE_SELECTOR);
        releases.push(...modeSelects.map((select) => bindOne(select, choices.mode)));
        releases.push(...bindNotes(root, source, modeSelects));
    }
    return () => {
        for (const release of releases)
            release();
    };
}
