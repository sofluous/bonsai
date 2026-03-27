(function () {
const CORE_SHARED_CONTROLS = Object.freeze([
  Object.freeze({
    id: "qualityTier",
    group: "output",
    label: "Quality",
    kind: "select",
    valuePath: "hub.qualityTier",
    uiRegion: "shared-panel",
    uiPriority: "secondary",
    renderMode: "deferred",
    sourceBinding: Object.freeze({
      sourceId: "qualityMode",
      sourceEvent: "input",
      writePolicy: "bidirectional",
    }),
    persistence: "persisted",
    syncPolicy: "live",
    readiness: "documented",
    description: "Shared quality tier selection for rendering and generation budgets.",
  }),
  Object.freeze({
    id: "lightingPreset",
    group: "lighting",
    label: "Light",
    kind: "select",
    valuePath: "hub.lighting.preset",
    uiRegion: "shared-panel",
    uiPriority: "secondary",
    renderMode: "deferred",
    sourceBinding: Object.freeze({
      sourceId: "lightPreset",
      sourceEvent: "change",
      writePolicy: "bidirectional",
    }),
    persistence: "persisted",
    syncPolicy: "commit",
    readiness: "documented",
    description: "Shared lighting preset selection.",
  }),
  Object.freeze({
    id: "backgroundPreset",
    group: "background",
    label: "Background",
    kind: "select",
    valuePath: "hub.background.preset",
    uiRegion: "shared-panel",
    uiPriority: "secondary",
    renderMode: "deferred",
    sourceBinding: Object.freeze({
      sourceId: "bgTex",
      sourceEvent: "input",
      writePolicy: "bidirectional",
    }),
    persistence: "persisted",
    syncPolicy: "live",
    readiness: "documented",
    description: "Shared background preset selection.",
  }),
  Object.freeze({
    id: "backgroundColor",
    group: "background",
    label: "Background Color",
    kind: "color",
    valuePath: "hub.background.color",
    uiRegion: "shared-panel",
    uiPriority: "secondary",
    renderMode: "deferred",
    sourceBinding: Object.freeze({
      sourceId: "bgColor",
      sourceEvent: "input",
      writePolicy: "bidirectional",
    }),
    persistence: "persisted",
    syncPolicy: "live",
    readiness: "documented",
    description: "Shared background color control.",
  }),
]);

const CORE_SHARED_CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    id: "lighting",
    label: "Lighting",
    region: "shared-panel",
    density: "standard",
    status: "active",
    controls: Object.freeze(
      CORE_SHARED_CONTROLS.filter((control) => control.group === "lighting"),
    ),
  }),
  Object.freeze({
    id: "background",
    label: "Background",
    region: "shared-panel",
    density: "standard",
    status: "active",
    controls: Object.freeze(
      CORE_SHARED_CONTROLS.filter((control) => control.group === "background"),
    ),
  }),
  Object.freeze({
    id: "output",
    label: "Output",
    region: "shared-panel",
    density: "standard",
    status: "active",
    controls: Object.freeze(
      CORE_SHARED_CONTROLS.filter((control) => control.group === "output"),
    ),
  }),
]);

function listCoreSharedControls() {
  return CORE_SHARED_CONTROLS.slice();
}

function listCoreSharedControlGroups() {
  return CORE_SHARED_CONTROL_GROUPS.slice();
}

window.BonsaiSharedControlCatalog = {
  listCoreSharedControls,
  listCoreSharedControlGroups,
};
})();
