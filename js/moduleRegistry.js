export const ACTIVE_MODULE_STORAGE_KEY = "bonsai.activeModule";
export const DEFAULT_MODULE_CODE = "bonsai";

export const MODULE_REGISTRY = Object.freeze([
  Object.freeze({
    code: "bonsai",
    manifestKey: "bonsai",
    label: "Bonsai",
    familyLabel: "Miniature Treescapes",
    description: "Active module",
    summary: "Miniature treescape generator and scene composition module.",
    status: "active",
    available: true,
    taxonomy: Object.freeze({
      domain: "flora",
      variants: Object.freeze([
        Object.freeze({ code: "hokidachi", label: "Hokidachi", status: "planned" }),
        Object.freeze({ code: "shakan", label: "Shakan", status: "planned" }),
      ]),
    }),
  }),
  Object.freeze({
    code: "sakana",
    manifestKey: "sakana",
    label: "Sakana",
    familyLabel: "Aquatic Forms",
    description: "Planned expansion",
    summary: "Aquatic creature family module with future species variants such as koi and kingyo.",
    status: "planned",
    available: false,
    taxonomy: Object.freeze({
      domain: "fauna",
      variants: Object.freeze([
        Object.freeze({ code: "koi", label: "Koi", status: "planned" }),
        Object.freeze({ code: "kingyo", label: "Kingyo", status: "planned" }),
      ]),
    }),
  }),
]);

export function listModules() {
  return MODULE_REGISTRY.slice();
}

export function getModuleEntry(moduleCode = DEFAULT_MODULE_CODE) {
  const code = String(moduleCode || DEFAULT_MODULE_CODE).toLowerCase();
  return MODULE_REGISTRY.find((entry) => entry.code === code) || null;
}

export function getDefaultModuleEntry() {
  return getModuleEntry(DEFAULT_MODULE_CODE);
}

export function getModuleManifestKey(moduleCode = DEFAULT_MODULE_CODE) {
  return getModuleEntry(moduleCode)?.manifestKey || DEFAULT_MODULE_CODE;
}
