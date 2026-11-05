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
import { type ReactElement, type ReactNode } from "react";
import { type SwitchControllerLike } from "./appearance-switch.ts";
import { type AppearanceSwitchPlacement } from "./appearance-switch-model.ts";
import type { ThemeController } from "./boot-core.ts";
import { type DesignSystemSelection } from "./design-system/runtime.ts";
import type { DesignSystemDescriptor } from "./design-system/types.ts";
import type { ThemeAppearanceState } from "./family-core.ts";
export interface DesignSystemScopeProps extends DesignSystemSelection {
    system: DesignSystemDescriptor;
    /** The element to render; a `div` by default. */
    as?: string;
    className?: string;
    children?: ReactNode;
}
/** One element carrying the selection's attributes, providing them to `useDesignSystemAttributes` below it. */
export declare function DesignSystemScope(props: DesignSystemScopeProps): ReactElement;
/** The nearest `DesignSystemScope`'s attributes, for spreading onto portaled content. Throws outside a scope. */
export declare function useDesignSystemAttributes(): Readonly<Record<string, string>>;
/** The members of a theme catalog controller this hook reads (`@atomicstrata/themes/catalog`). */
export interface CatalogStateSource<State> {
    snapshot(): State;
    subscribe(listener: (state: State) => void): () => void;
}
/**
 * A theme catalog controller's state (`ThemeCatalogState`: the theme in
 * force, its choices, a pending load, the last error), re-rendering the
 * caller when it changes. `null` for a `null` controller, on the server and
 * in the hydration pass. Typed structurally, so this module imports nothing
 * from the catalog.
 */
export declare function useThemeCatalog<State>(controller: CatalogStateSource<State> | null): State | null;
/**
 * The family page's state, re-rendering the caller when it changes. `null`
 * for a `null` controller (server rendering). Throws for a controller without
 * families, whose state this cannot describe.
 */
export declare function useThemeAppearance(controller: ThemeController | null): ThemeAppearanceState | null;
export interface AppearanceSwitchProps {
    /**
     * A controller configured with `families`, a theme catalog controller
     * (`@atomicstrata/themes/catalog`), or `null` where there is no document.
     */
    controller: SwitchControllerLike | null;
    /** Class of the host `<span>`, for placing the switch in a layout. */
    className?: string;
    /** Where the switch sits (`mountAppearanceSwitch`'s `placement`); the top right corner when omitted. */
    placement?: AppearanceSwitchPlacement;
}
/**
 * The compact appearance switch, mounted by `mountAppearanceSwitch` into a
 * host span React renders without children. Throws while rendering for a
 * controller without families or an unknown placement, before any effect
 * runs. A new controller or placement releases the switch and mounts it again.
 */
export declare function AppearanceSwitch(props: AppearanceSwitchProps): ReactElement;
