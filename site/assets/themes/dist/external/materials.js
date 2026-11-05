/**
 * The material roles, the one vocabulary the compiler (`theme-compiler/material-table.ts`),
 * the manifest validator and the JSON Schemas share. Runtime-safe: a list of
 * names and nothing else, so the run time's manifest validator carries no
 * compiler machinery.
 */
/** The roles a consumer applies materials to, in table order. */
export const MATERIAL_ROLES = ["canvas", "card", "action", "field", "heading", "text", "header", "link", "focus"];
