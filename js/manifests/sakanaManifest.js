(function () {
const {
  listCoreSharedControlGroups,
  listCoreSharedControls,
} = window.BonsaiSharedControlCatalog;

const SAKANA_MODULE_BOOTSTRAP = Object.freeze({
  code: "sakana",
  runtime: "scaffolded-stub",
  entry: "./js/modules/sakana/index.js",
  status: "planned",
});

function createSakanaModuleRuntimeStub() {
  return {
    bootstrap: SAKANA_MODULE_BOOTSTRAP,
    schema: {},
    defaults: {},
    presets: [],
    variants: [],
    controlGroups: [],
    sanitizeConfig(config) {
      return config || {};
    },
    validateConfig() {
      return { ok: true, issues: [] };
    },
  };
}

function createSakanaModuleManifest({
  moduleEntry,
  sharedControlResolver,
  sharedControlService,
}) {
  const runtimeStub = createSakanaModuleRuntimeStub();
  return {
    key: "sakana",
    code: moduleEntry?.code || "sakana",
    displayName: moduleEntry?.label || "Sakana",
    familyLabel: moduleEntry?.familyLabel || "Aquatic Forms",
    status: moduleEntry?.status || "planned",
    runtime: "planned",
    isAvailable: false,
    listVariantCodes() {
      return Array.isArray(moduleEntry?.taxonomy?.variants)
        ? moduleEntry.taxonomy.variants.map((variant) => variant.code)
        : [];
    },
    getCapabilities() {
      return {
        supportsSeed: true,
        supportsSnapshots: true,
        supportsPresets: true,
        supportsReset: true,
        supportsRandomize: true,
        supportsCameraPresets: true,
        supportsCameraReset: true,
        supportsTurntable: true,
        supportsAutoFrame: true,
        supportsQualityTier: true,
        supportsLighting: true,
        supportsBackground: true,
        supportsExportImage: true,
        supportsExportConfig: true,
        supportsExportMesh: "deferred",
      };
    },
    getSharedControlDefinitions() {
      return listCoreSharedControls();
    },
    getSharedControlGroups() {
      return listCoreSharedControlGroups();
    },
    getRuntimeState() {
      return null;
    },
    getSharedControlResolver() {
      return sharedControlResolver || null;
    },
    getSharedControlService() {
      return sharedControlService || null;
    },
    getBootstrapSpec() {
      return SAKANA_MODULE_BOOTSTRAP;
    },
    getRuntimeStub() {
      return runtimeStub;
    },
    getDefaults() {
      return runtimeStub.defaults;
    },
    getControlGroups() {
      return runtimeStub.controlGroups;
    },
    getPresets() {
      return runtimeStub.presets;
    },
    validateConfig(config) {
      return runtimeStub.validateConfig(config);
    },
    sanitizeConfig(config) {
      return runtimeStub.sanitizeConfig(config);
    },
    getSchemaDefinition() {
      return runtimeStub.schema;
    },
    getAvailabilityMessage() {
      return `${this.displayName} module not available yet`;
    },
  };
}

window.BonsaiManifestFactories = window.BonsaiManifestFactories || {};
window.BonsaiManifestFactories.createSakanaModuleManifest =
  createSakanaModuleManifest;
})();
