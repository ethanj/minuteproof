/**
 * The optional compact appearance switch (`@atomicstrata/themes/appearance-switch`).
 *
 * `mountAppearanceSwitch(host, controller, options?)` fills a consumer's
 * element with a sun/moon button that switches the displayed scheme in one click and a
 * chevron that opens a small non-modal panel of System/Light/Dark and theme
 * choices (elements: `appearance-switch-dom.ts`; words and capabilities:
 * `appearance-switch-model.ts`). Style it with the optional
 * `css/appearance-switch.css`, which reads semantic tokens only.
 *
 * Placement (`options.placement`): by default the switch is fixed to the top
 * right corner of the viewport; the three other corners and `inline` (in the
 * flow of the host, for a header or settings page) are the alternatives.
 * The placement is written as `data-placement` on the switch's own element,
 * and the stylesheet does the positioning, so a designer moves it with the
 * option or the documented CSS variables, not by script. Importing the
 * module adds nothing to any page; only a mount does.
 *
 * The switch keeps no theme state. Everything it shows comes from the family
 * controller's snapshot, and every choice goes back through the controller
 * (`mode.select`, `family.select`), which alone stamps, stores and notifies.
 * So any number of switches, and the native selects `bindThemeSelect` wires,
 * stay in step, and none can disagree with the document. The only state it
 * holds is whether its own panel is open.
 *
 * The controller must have been configured with `families`; this is checked
 * before anything is added to the page. Mounting a host that is already
 * mounted first releases the earlier mount, so a component that mounts
 * twice (React StrictMode, a rebind after the controller was replaced) never
 * leaves two sets of listeners. The switch lives in one element appended to
 * the host; releasing removes it and every listener the mount added, and
 * leaves the host as it was. The module touches no global at import,
 * so it can be imported during server rendering.
 */
import { appearanceSwitchView, familyPreview, switchPlacement, } from "./appearance-switch-model.js";
import { buildSwitch, replaceFamilies, schemeIconPath } from "./appearance-switch-dom.js";
import { renderStatus } from "./appearance-switch-status.js";
import { appearanceSourceOf, capabilitiesOf } from "./select.js";
/** Space kept between the panel and the viewport edge, in CSS pixels. */
const VIEWPORT_GUTTER_PX = 8;
/** Space between the switch and its open panel; matches the stylesheet's offset. */
const PANEL_OFFSET_PX = 6;
export { APPEARANCE_SWITCH_PLACEMENTS } from "./appearance-switch-model.js";
/** The release function of each host's current mount. */
const mounted = new WeakMap();
/**
 * The appearance source of `controller`, or a throw unless it carries
 * families and a mode (a family page) or is a catalog controller: the only
 * states the switch can show. Shared by the React adapter, which checks
 * while rendering.
 */
export function switchSourceOf(controller) {
    const source = appearanceSourceOf(controller);
    if (source === null) {
        throw new Error("@atomicstrata/themes: the appearance switch needs a theme controller configured with families, or a theme catalog controller");
    }
    return source;
}
export function assertSwitchController(controller) {
    switchSourceOf(controller);
}
function assertHost(host) {
    const candidate = host;
    const isObject = candidate !== null && typeof candidate === "object";
    if (!isObject || typeof candidate.append !== "function" || !candidate.ownerDocument) {
        throw new Error("@atomicstrata/themes: mountAppearanceSwitch needs an element in a document to render into");
    }
}
/** The device's dark-scheme query, from the host's window, as the family controller reads it. */
function systemDarkOf(host) {
    const view = host.ownerDocument.defaultView;
    if (view === null || typeof view.matchMedia !== "function") {
        throw new Error("@atomicstrata/themes: the appearance switch needs a window with matchMedia");
    }
    return view.matchMedia("(prefers-color-scheme: dark)");
}
/** The operating system's scheme, read when it is needed so it is never stale. */
function systemScheme(mount) {
    return mount.systemDark.matches ? "dark" : "light";
}
/** Show `state`: icon, names, description, theme rows, checked radios, previews, hint, note and status. */
function render(mount, state) {
    const { parts } = mount;
    if (parts.families !== state.families)
        replaceFamilies(mount.host.ownerDocument, parts, state.families);
    const capabilities = capabilitiesOf(state);
    const system = systemScheme(mount);
    const view = appearanceSwitchView(capabilities, state, system);
    parts.toggleIcon.setAttribute("d", schemeIconPath(view.scheme));
    parts.toggle.setAttribute("aria-label", view.toggleLabel);
    parts.toggle.title = view.toggleLabel;
    parts.toggle.setAttribute("aria-disabled", String(view.toggleTarget === null));
    parts.summary.textContent = view.note.length > 0 ? `${view.summary} ${view.note}` : view.summary;
    parts.disclose.title = `Appearance settings. ${view.summary}`;
    for (const input of parts.modeInputs)
        input.checked = input.value === state.mode;
    parts.familyInputs.forEach((input, index) => {
        var _a, _b;
        input.checked = input.value === state.family;
        const preview = familyPreview(capabilities, input.value, { screen: state.scheme, system });
        (_a = parts.previews[index]) === null || _a === void 0 ? void 0 : _a.setAttribute("data-theme", preview.theme);
        (_b = parts.previews[index]) === null || _b === void 0 ? void 0 : _b.setAttribute("data-theme-scheme", preview.scheme);
    });
    parts.hint.textContent = view.systemHint;
    parts.note.textContent = view.note;
    parts.note.hidden = view.note.length === 0;
    renderStatus(parts, state);
}
/** Show `state` and, while the panel is open, re-place it: a state change can reflow what precedes an inline switch. */
function show(mount, state) {
    render(mount, state);
    if (mount.open)
        place(mount);
}
/**
 * Place the open panel below the switch (above it when there is more room
 * there, as for a bottom corner), aligned with the switch's start for a left
 * corner and its end otherwise, then shifted so it stays inside the viewport
 * at any width or zoom. Its width and height are capped to the room it has,
 * and a panel taller than that scrolls. Measured from layout, so the outcome
 * depends only on geometry. Widths come from `clientWidth`, which excludes a
 * classic scrollbar, where the stylesheet's `100vw` would include it.
 *
 * Every layout this forces has the panel at the viewport's start gutter or
 * at its final place, never past the viewport's end: WebKit keeps the
 * scrollable overflow of such an intermediate layout (a switch near the right
 * edge) after the panel has moved, and the page would scroll sideways. See
 * `setOpen`, which parks the panel there before showing it.
 */
function place(mount) {
    const { parts } = mount;
    const doc = parts.root.ownerDocument;
    const viewportWidth = doc.documentElement.clientWidth;
    const anchor = parts.root.getBoundingClientRect();
    const panel = parts.panel;
    panel.style.left = `${VIEWPORT_GUTTER_PX - anchor.left}px`;
    panel.style.maxHeight = "";
    panel.style.maxWidth = `${viewportWidth - 2 * VIEWPORT_GUTTER_PX}px`;
    const width = panel.getBoundingClientRect().width;
    const alignStart = mount.placement === "top-left" || mount.placement === "bottom-left";
    const preferred = alignStart ? anchor.left : anchor.right - width;
    const maxLeft = viewportWidth - VIEWPORT_GUTTER_PX - width;
    const left = Math.max(VIEWPORT_GUTTER_PX, Math.min(preferred, maxLeft));
    panel.style.left = `${left - anchor.left}px`;
    placeVertically(panel, anchor, doc.documentElement.clientHeight);
}
/** Open the panel towards the side with room for it (else the roomier side), capping its height to that room. */
function placeVertically(panel, anchor, viewportHeight) {
    const height = panel.getBoundingClientRect().height;
    const roomBelow = viewportHeight - anchor.bottom - PANEL_OFFSET_PX - VIEWPORT_GUTTER_PX;
    const roomAbove = anchor.top - PANEL_OFFSET_PX - VIEWPORT_GUTTER_PX;
    const above = roomBelow < height && roomAbove > roomBelow;
    panel.setAttribute("data-side", above ? "above" : "below");
    panel.style.maxHeight = `${Math.max(0, above ? roomAbove : roomBelow)}px`;
}
function setOpen(mount, open) {
    mount.open = open;
    // Parked at the start gutter while still hidden, so the first layout of the shown panel cannot overflow (see `place`).
    if (open)
        mount.parts.panel.style.left = `${VIEWPORT_GUTTER_PX - mount.parts.root.getBoundingClientRect().left}px`;
    mount.parts.panel.hidden = !open;
    mount.parts.disclose.setAttribute("aria-expanded", String(open));
    mount.parts.root.toggleAttribute("data-open", open);
    if (open)
        place(mount);
}
/** Close the panel and, when asked, give focus back to the chevron that opened it. */
function close(mount, returnFocus) {
    if (!mount.open)
        return;
    setOpen(mount, false);
    if (returnFocus)
        mount.parts.disclose.focus();
}
/** Listeners on the switch's own elements. */
function elementListeners(mount) {
    const { parts, source } = mount;
    const onToggle = () => {
        const state = source.view();
        const view = appearanceSwitchView(capabilitiesOf(state), state, systemScheme(mount));
        if (view.toggleTarget !== null)
            source.selectMode(view.toggleTarget);
    };
    const onChange = (event) => {
        const input = event.target;
        if (parts.modeInputs.includes(input))
            source.selectMode(input.value);
        if (parts.familyInputs.includes(input)) {
            source.selectFamily(input.value);
            // A catalog selection may still be loading: show what is in force until it commits.
            show(mount, source.view());
        }
    };
    return [
        [parts.toggle, "click", onToggle],
        [parts.disclose, "click", () => setOpen(mount, !mount.open)],
        [parts.panel, "change", onChange],
        [parts.root, "keydown", (event) => onKeydown(mount, event)],
        [parts.root, "focusout", (event) => onFocusOut(mount, event)],
    ];
}
/**
 * Escape, wherever focus is, closes an open panel and returns focus to the
 * chevron. Listened for on the document, because Safari does not focus a
 * button when it is clicked, so focus is often outside the switch then.
 */
function onEscape(mount, event) {
    if (event.key !== "Escape" || !mount.open)
        return;
    event.preventDefault();
    close(mount, true);
}
function isChoice(mount, target) {
    const input = target;
    return mount.parts.modeInputs.includes(input) || mount.parts.familyInputs.includes(input);
}
/** Enter on a radio chooses it, as Space does, and never submits a form. */
function onKeydown(mount, event) {
    if (event.key !== "Enter" || !isChoice(mount, event.target))
        return;
    event.preventDefault();
    if (!event.target.checked)
        event.target.click();
}
/** Focus moving to something outside the switch closes the panel, leaving focus where it went. */
function onFocusOut(mount, event) {
    const next = event.relatedTarget;
    if (next !== null && !mount.parts.root.contains(next))
        close(mount, false);
}
/** Listeners on the document, its fonts and the window: outside presses and Escape close; resizing (and zoom), scrolling and late faces re-place. */
function pageListeners(mount) {
    const doc = mount.host.ownerDocument;
    // The composed path, not the target: a press inside a shadow root reaches the document retargeted to its host.
    const onPointerDown = (event) => {
        if (!event.composedPath().includes(mount.parts.root))
            close(mount, false);
    };
    const onResize = () => {
        if (mount.open)
            place(mount);
    };
    // Scrolling the page or an ancestor moves an inline switch's anchor (scroll does not bubble, hence the capture
    // phase); scrolling the panel's own choices moves nothing outside it and is left alone.
    const onScroll = (event) => {
        if (!mount.parts.panel.contains(event.target))
            onResize();
    };
    const view = doc.defaultView;
    const onKey = (event) => onEscape(mount, event);
    const listeners = [
        [doc, "pointerdown", onPointerDown],
        [doc, "keydown", onKey],
        [doc, "scroll", onScroll, { capture: true, passive: true }],
    ];
    if (view !== null)
        listeners.push([view, "resize", onResize]);
    // A face that arrives after the panel opened reflows the text around an inline switch without resizing the window.
    for (const type of ["loadingdone", "loadingerror"])
        listeners.push([doc.fonts, type, onResize]);
    // The controller tells nothing while a pinned mode hides the device's scheme; the System hint and a system-only
    // preview still follow it.
    listeners.push([mount.systemDark, "change", () => show(mount, mount.source.view())]);
    return listeners;
}
/**
 * Render a compact appearance switch into `host` and keep it in step with
 * `controller`, placed as `options.placement` says (the top right corner by
 * default; see `AppearanceSwitchPlacement`). Throws, before changing
 * anything (an earlier switch on `host` stays mounted), when `host` is not
 * an element, `controller` was configured without families, `options` is not
 * of the accepted shape, or the host's window has no `matchMedia`.
 * @returns a function that removes the switch and every listener it added.
 *   Releasing a mount that a later mount of the same host replaced does nothing.
 */
export function mountAppearanceSwitch(host, controller, options) {
    var _a;
    assertHost(host);
    const source = switchSourceOf(controller);
    const placement = switchPlacement(options);
    // Resolved before the host's earlier switch is released, so a refused mount leaves that switch working.
    const systemDark = systemDarkOf(host);
    (_a = mounted.get(host)) === null || _a === void 0 ? void 0 : _a();
    const parts = buildSwitch(host.ownerDocument, source.view().families);
    parts.root.setAttribute("data-placement", placement);
    const mount = { host, source, parts, placement, systemDark, open: false, };
    host.append(parts.root);
    show(mount, source.view());
    const unsubscribe = source.subscribe(() => show(mount, source.view()));
    const listeners = [...elementListeners(mount), ...pageListeners(mount)];
    for (const [target, type, listener, options] of listeners)
        target.addEventListener(type, listener, options);
    const release = () => {
        if (mounted.get(host) !== release)
            return;
        mounted.delete(host);
        unsubscribe();
        for (const [target, type, listener, options] of listeners)
            target.removeEventListener(type, listener, options);
        parts.root.remove();
    };
    mounted.set(host, release);
    return release;
}
