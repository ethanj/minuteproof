/**
 * Optional React integration (`@atomicstrata/themes/react`).
 *
 * React is an optional peer dependency: nothing else in the package imports
 * this file, so a consumer without React never loads it. It adds no theme
 * state of its own. For the theme controller, React code keeps using
 * `useSyncExternalStore(controller.subscribe, controller.current)`.
 *
 * `DesignSystemScope` renders one element carrying the design-system
 * attributes and makes them available to its subtree. Framework components
 * that portal their popups to `<body>` (a Select's list, a Tooltip) leave the
 * region's DOM subtree, so spread `useDesignSystemAttributes()` onto the
 * portaled content element: the compiled stylesheet then gives that element
 * the same system, brand and mode as the region it came from. The upstream
 * components are used unchanged; they forward these attributes to the
 * content element. `appearance="theme"` gives the region's components the
 * canonical theme's appearance; the attributes spread onto popups carry it.
 *
 * `useThemeAppearance(controller)` reads a family page's complete state
 * (`family-core.ts`): theme, family, preference, mode in force and scheme,
 * as one snapshot that changes only when the state does. It subscribes on
 * mount and unsubscribes on unmount or when the controller changes. During
 * server rendering there is no document and so no controller: pass `null`
 * and the hook returns `null`, on the server and in the hydration pass. The
 * pre-paint script, not React, owns the first paint.
 *
 * `AppearanceSwitch` is the compact appearance switch
 * (`@atomicstrata/themes/appearance-switch`) as a component. It renders one
 * empty host `<span>` and mounts the very same implementation into it in an
 * effect, releasing it on unmount or when the controller changes, so React
 * and plain pages share one behaviour and StrictMode's extra mount leaves
 * nothing behind. With a `null` controller (server rendering) only the empty
 * host is rendered; the switch appears after hydration. `placement` is the
 * plain mount's option, with the same default (the top right corner).
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, } from "react";
import { mountAppearanceSwitch, switchSourceOf } from "./appearance-switch.js";
import { switchPlacement } from "./appearance-switch-model.js";
import { designSystemAttributes } from "./design-system/runtime.js";
const ScopeContext = createContext(null);
/** One element carrying the selection's attributes, providing them to `useDesignSystemAttributes` below it. */
export function DesignSystemScope(props) {
    const { system, brand, mode, appearance, as = "div", className, children } = props;
    const attributes = useMemo(() => designSystemAttributes(system, { brand, mode, appearance }), [system, brand, mode, appearance]);
    const scoped = createElement(as, { ...attributes, className }, children);
    return createElement(ScopeContext.Provider, { value: attributes }, scoped);
}
/** The nearest `DesignSystemScope`'s attributes, for spreading onto portaled content. Throws outside a scope. */
export function useDesignSystemAttributes() {
    const attributes = useContext(ScopeContext);
    if (attributes === null) {
        throw new Error("@atomicstrata/themes/react: useDesignSystemAttributes is used outside a DesignSystemScope");
    }
    return attributes;
}
const serverSnapshot = () => null;
/**
 * A theme catalog controller's state (`ThemeCatalogState`: the theme in
 * force, its choices, a pending load, the last error), re-rendering the
 * caller when it changes. `null` for a `null` controller, on the server and
 * in the hydration pass. Typed structurally, so this module imports nothing
 * from the catalog.
 */
export function useThemeCatalog(controller) {
    const subscribe = useCallback((onChange) => (controller === null ? () => undefined : controller.subscribe(() => onChange())), [controller]);
    const snapshot = useCallback(() => (controller === null ? null : controller.snapshot()), [controller]);
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
/**
 * The family page's state, re-rendering the caller when it changes. `null`
 * for a `null` controller (server rendering). Throws for a controller without
 * families, whose state this cannot describe.
 */
export function useThemeAppearance(controller) {
    if (controller !== null && controller.family === undefined) {
        throw new Error("@atomicstrata/themes/react: useThemeAppearance needs a controller configured with families");
    }
    const family = controller === null || controller === void 0 ? void 0 : controller.family;
    const subscribe = useCallback((onChange) => (family === undefined ? () => undefined : family.subscribe(onChange)), [family]);
    const snapshot = useCallback(() => (family === undefined ? null : family.snapshot()), [family]);
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
/**
 * The compact appearance switch, mounted by `mountAppearanceSwitch` into a
 * host span React renders without children. Throws while rendering for a
 * controller without families or an unknown placement, before any effect
 * runs. A new controller or placement releases the switch and mounts it again.
 */
export function AppearanceSwitch(props) {
    const { controller, className } = props;
    if (controller !== null)
        switchSourceOf(controller);
    const placement = switchPlacement({ placement: props.placement });
    const host = useRef(null);
    useEffect(() => {
        if (controller === null || host.current === null)
            return undefined;
        return mountAppearanceSwitch(host.current, controller, { placement });
    }, [controller, placement]);
    return createElement("span", { ref: host, className });
}
