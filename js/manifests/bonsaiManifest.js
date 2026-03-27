(function () {
const {
  listCoreSharedControlGroups,
  listCoreSharedControls,
} = window.BonsaiSharedControlCatalog;

function createBonsaiModuleManifest({
  moduleEntry,
  adapter,
  hubShell,
  sharedControlResolver,
  sharedControlService,
}) {
  return {
    key: "bonsai",
    code: moduleEntry?.code || "bonsai",
    displayName: moduleEntry?.label || "Bonsai",
    familyLabel: moduleEntry?.familyLabel || "Miniature Treescapes",
    status: moduleEntry?.status || "active",
    runtime: "adapter-backed",
    isAvailable: true,
    listVariantCodes() {
      return Array.isArray(moduleEntry?.taxonomy?.variants)
        ? moduleEntry.taxonomy.variants.map((variant) => variant.code)
        : [];
    },
    getCapabilities() {
      return adapter?.getCapabilities ? adapter.getCapabilities() : {};
    },
    getSharedControlDefinitions() {
      return listCoreSharedControls();
    },
    getSharedControlGroups() {
      return listCoreSharedControlGroups();
    },
    getRuntimeState() {
      return hubShell?.getState ? hubShell.getState() : null;
    },
    getSharedControlResolver() {
      return sharedControlResolver || null;
    },
    getSharedControlService() {
      return sharedControlService || null;
    },
    getSharedState() {
      return adapter?.readSharedState ? adapter.readSharedState() : {};
    },
    getModuleState() {
      return adapter?.readModuleState ? adapter.readModuleState() : {};
    },
    getAppShellState() {
      return adapter?.readAppShellState ? adapter.readAppShellState() : {};
    },
    captureSnapshotEnvelope() {
      return adapter?.captureNamespacedState ? adapter.captureNamespacedState() : null;
    },
  };
}

window.BonsaiManifestFactories = window.BonsaiManifestFactories || {};
window.BonsaiManifestFactories.createBonsaiModuleManifest =
  createBonsaiModuleManifest;
})();
