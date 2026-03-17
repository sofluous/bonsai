import { DEFAULT_MODULE_CODE, getModuleEntry } from "./moduleRegistry.js";
import { createBonsaiModuleManifest } from "./manifests/bonsaiManifest.js";
import { createSakanaModuleManifest } from "./manifests/sakanaManifest.js";

const MANIFEST_FACTORIES = {
  bonsai: createBonsaiModuleManifest,
  sakana: createSakanaModuleManifest,
};

export function getModuleManifest(moduleCode = DEFAULT_MODULE_CODE, context = {}) {
  const moduleEntry = getModuleEntry(moduleCode);
  if (!moduleEntry) return null;
  const factory = MANIFEST_FACTORIES[moduleEntry.manifestKey];
  if (typeof factory !== "function") return null;
  return factory({
    ...context,
    moduleEntry,
  });
}

export function buildModuleManifestMap(context = {}) {
  const manifests = {};
  Object.keys(MANIFEST_FACTORIES).forEach((moduleCode) => {
    const manifest = getModuleManifest(moduleCode, context);
    if (manifest) manifests[moduleCode] = manifest;
  });
  return manifests;
}
