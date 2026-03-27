(function () {
const { DEFAULT_MODULE_CODE, getModuleEntry } = window.BonsaiModuleRegistry;
const { createBonsaiModuleManifest, createSakanaModuleManifest } =
  window.BonsaiManifestFactories;

const MANIFEST_FACTORIES = {
  bonsai: createBonsaiModuleManifest,
  sakana: createSakanaModuleManifest,
};

function getModuleManifest(moduleCode = DEFAULT_MODULE_CODE, context = {}) {
  const moduleEntry = getModuleEntry(moduleCode);
  if (!moduleEntry) return null;
  const factory = MANIFEST_FACTORIES[moduleEntry.manifestKey];
  if (typeof factory !== "function") return null;
  return factory({
    ...context,
    moduleEntry,
  });
}

function buildModuleManifestMap(context = {}) {
  const manifests = {};
  Object.keys(MANIFEST_FACTORIES).forEach((moduleCode) => {
    const manifest = getModuleManifest(moduleCode, context);
    if (manifest) manifests[moduleCode] = manifest;
  });
  return manifests;
}

window.BonsaiManifestRegistry = {
  getModuleManifest,
  buildModuleManifestMap,
};
})();
