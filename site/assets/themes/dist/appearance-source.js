/**
 * The one interface the appearance UI reads: the native family and mode
 * selects (`select.ts`), the compact appearance switch
 * (`appearance-switch.ts`) and, through it, the React component.
 *
 * Two controllers provide it:
 *
 * - a family page's theme controller (`family-core.ts`), adapted here;
 * - a catalog page's controller (`@atomicstrata/themes/catalog`), whose
 *   `appearance` member is one.
 *
 * So both kinds of page render with the same code, and a renderer never
 * learns which it has. Ids are plain strings here: a catalog page's families
 * include external ids, which the closed `ThemeFamilyId` union does not and
 * must not.
 *
 * `view()` returns one frozen object per state, the same object until the
 * state changes, so React's `useSyncExternalStore` can use it directly.
 * `families` is the same array until the choices change: a renderer
 * rebuilds its rows when it gets a different one. Selections are fire and
 * forget: a catalog page's are asynchronous, and their progress (`pending`)
 * and failure (`error`) arrive as later views.
 *
 * This file holds types only, so importing it adds no module to a page: the
 * two functions that build sources (`appearanceSourceOf`, `capabilitiesOf`)
 * live in `select.ts`, which the module entry already loads.
 */
export {};
