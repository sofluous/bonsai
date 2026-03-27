(function () {
function createBonsaiHubAdapter(deps) {
  const {
    $,
    qualityModeUI,
    camera,
    controls,
    applyBackground,
    applyLightingFromUI,
    applyVesselOnly,
    applyRenderStyle,
    regenerate,
    refreshAllReadouts,
    sanitizeTerminalBounds,
    setSeed,
    setAutoSpeed,
    setAutoRotate,
    toVec3Array,
    applyVec3,
    getCurrentSeed,
    getAutoOn,
  } = deps;

  const HUB_SHARED_CONTROL_MAP = {
    qualityMode: "qualityTier",
    bgTex: "background.preset",
    bgColor: "background.color",
    lightPreset: "lighting.preset",
    bgLightLink: "lighting.bgLightLink",
    keyLight: "lighting.keyLight",
    hemiLight: "lighting.ambientLight",
    exposure: "lighting.exposure",
    exportImageKind: "export.image.kind",
    exportModelKind: "export.model.kind",
    exportQuality: "export.image.quality",
    exportCropMode: "export.image.cropMode",
    exportSizePreset: "export.image.sizePreset",
    exportWidth: "export.image.width",
    exportHeight: "export.image.height",
    exportTransparent: "export.image.transparent",
  };
  const HUB_SHARED_PATH_TO_ID_MAP = Object.fromEntries(
    Object.entries(HUB_SHARED_CONTROL_MAP).map(([id, path]) => [path, id]),
  );

  const APP_SHELL_CONTROL_IDS = new Set([
    "themeSelect",
    "tipsToggle",
    "debugToggle",
    "toolbarToggle",
    "cameraPadToggle",
    "sidePanelToggle",
    "demoInterval",
    "demoModeToggle",
  ]);

  const WORKFLOW_CONTROL_IDS = new Set([
    "exportImageKind",
    "exportModelKind",
    "exportQuality",
    "exportCropMode",
    "exportSizePreset",
    "exportWidth",
    "exportHeight",
    "exportTransparent",
  ]);
  const SNAPSHOT_RESTORE_PRIORITY = [
    "treeType",
    "bonsaiStyle",
    "extremeModePreset",
    "heightScale",
    "levels",
    "leafType",
    "renderMode",
    "branchColor",
    "leafColor",
    "emissiveColor",
    "qualityMode",
    "bgTex",
    "bgColor",
    "lightPreset",
    "bgLightLink",
    "keyLight",
    "hemiLight",
    "exposure",
  ];
  const SNAPSHOT_RESTORE_PRIORITY_INDEX = new Map(
    SNAPSHOT_RESTORE_PRIORITY.map((id, index) => [id, index]),
  );

  function getControlValue(el) {
    if (!el) return undefined;
    return el.type === "checkbox" ? !!el.checked : el.value;
  }

  function getDefaultControlValue(el) {
    if (!el) return undefined;
    if (el.type === "checkbox") return !!el.defaultChecked;
    if (el.tagName === "SELECT") {
      const selected = Array.from(el.options || []).find((opt) => opt.defaultSelected);
      return selected ? selected.value : el.options?.[0]?.value ?? el.value;
    }
    return el.defaultValue ?? el.value;
  }

  function setControlValue(el, value) {
    if (!el) return;
    if (el.type === "checkbox") {
      const s = String(value).toLowerCase();
      el.checked =
        value === true ||
        value === 1 ||
        s === "1" ||
        s === "true" ||
        s === "on";
    } else if (value !== undefined && value !== null) {
      el.value = String(value);
    }
  }

  function assignPath(target, path, value) {
    if (!target || !path) return;
    const parts = String(path).split(".");
    let node = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!node[key] || typeof node[key] !== "object") node[key] = {};
      node = node[key];
    }
    node[parts[parts.length - 1]] = value;
  }

  function readPath(source, path) {
    return String(path)
      .split(".")
      .reduce(
        (acc, key) =>
          acc && typeof acc === "object" && key in acc ? acc[key] : undefined,
        source,
      );
  }

  function readHubSharedState() {
    const shared = {
      seed: getCurrentSeed(),
      qualityTier: qualityModeUI?.value || "auto",
      camera: {
        position: toVec3Array(camera.position),
        target: toVec3Array(controls.target),
        autoRotateOn: !!getAutoOn(),
        autoRotateSpeed: parseFloat(controls.autoRotateSpeed) || 0.8,
      },
      lighting: {},
      background: {},
      export: {
        image: {},
        model: {},
      },
    };

    Object.entries(HUB_SHARED_CONTROL_MAP).forEach(([id, path]) => {
      const el = $(id);
      if (!el) return;
      assignPath(shared, path, getControlValue(el));
    });

    return shared;
  }

  function readBonsaiModuleState() {
    const moduleState = {
      controls: {},
    };

    document
      .querySelectorAll("#panel input[id], #panel select[id]")
      .forEach((el) => {
        if (el.type === "file") return;
        if (el.id in HUB_SHARED_CONTROL_MAP) return;
        if (APP_SHELL_CONTROL_IDS.has(el.id)) return;
        if (WORKFLOW_CONTROL_IDS.has(el.id)) return;
        if (el.id === "seedLabel") return;
        moduleState.controls[el.id] = getControlValue(el);
      });

    return moduleState;
  }

  function readAppShellState() {
    const appShell = {};
    APP_SHELL_CONTROL_IDS.forEach((id) => {
      const el = $(id);
      if (!el) return;
      appShell[id] = getControlValue(el);
    });
    return appShell;
  }

  function resetPanelControlsToDefaults() {
    document
      .querySelectorAll("#panel input[id], #panel select[id]")
      .forEach((el) => {
        if (el.type === "file") return;
        if (el.id === "seedLabel") return;
        setControlValue(el, getDefaultControlValue(el));
      });
    sanitizeTerminalBounds();
  }

  function sortedSnapshotEntries(controlsState) {
    return Object.entries(controlsState || {}).sort(([a], [b]) => {
      const pa = SNAPSHOT_RESTORE_PRIORITY_INDEX.has(a)
        ? SNAPSHOT_RESTORE_PRIORITY_INDEX.get(a)
        : Number.MAX_SAFE_INTEGER;
      const pb = SNAPSHOT_RESTORE_PRIORITY_INDEX.has(b)
        ? SNAPSHOT_RESTORE_PRIORITY_INDEX.get(b)
        : Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }

  function applyAppShellState(partial) {
    if (!partial || typeof partial !== "object") return;
    Object.entries(partial).forEach(([id, value]) => {
      if (!APP_SHELL_CONTROL_IDS.has(id)) return;
      setControlValue($(id), value);
    });
  }

  function applyHubSharedState(partial) {
    if (!partial || typeof partial !== "object") return;

    const qualityTier = readPath(partial, "qualityTier");
    if (qualityTier !== undefined && qualityModeUI) {
      qualityModeUI.value = String(qualityTier);
    }

    Object.entries(HUB_SHARED_CONTROL_MAP).forEach(([id, path]) => {
      const value = readPath(partial, path);
      if (value === undefined) return;
      setControlValue($(id), value);
    });

    const nextSeed = readPath(partial, "seed");
    if (nextSeed !== undefined) setSeed(Number(nextSeed));

    const camPos = readPath(partial, "camera.position");
    const camTarget = readPath(partial, "camera.target");
    if (camPos) applyVec3(camera.position, camPos);
    if (camTarget) applyVec3(controls.target, camTarget);

    const autoRotateSpeed = readPath(partial, "camera.autoRotateSpeed");
    if (Number.isFinite(Number(autoRotateSpeed))) {
      setAutoSpeed(Number(autoRotateSpeed));
    }
    const autoRotateOn = readPath(partial, "camera.autoRotateOn");
    if (autoRotateOn !== undefined) setAutoRotate(!!autoRotateOn);

    applyBackground();
    applyLightingFromUI();
    camera.updateProjectionMatrix();
    controls.update();
  }

  function applyBonsaiModuleState(partial) {
    if (!partial || typeof partial !== "object") return;
    const controlsState =
      partial.controls && typeof partial.controls === "object"
        ? partial.controls
        : partial;
    Object.entries(controlsState).forEach(([id, value]) => {
      setControlValue($(id), value);
    });
    sanitizeTerminalBounds();
    applyVesselOnly();
    applyRenderStyle();
    regenerate();
    refreshAllReadouts();
  }

  const bonsaiHubAdapter = {
    version: "0.1.0",
    getCapabilities() {
      return {
        supportsSeed: true,
        supportsSnapshots: true,
        supportsPresets: true,
        supportsReset: true,
        supportsRandomize: true,
        supportsCameraReset: true,
        supportsTurntable: true,
        supportsAutoFrame: true,
        supportsQualityTier: true,
        supportsLighting: true,
        supportsBackground: true,
        supportsExportImage: true,
        supportsExportConfig: true,
        supportsExportMesh: true,
        supportsImportConfig: true,
        supportsLiveRegeneration: true,
        supportsStageDiagnostics: true,
        supportsModuleTabs: true,
      };
    },
    readSharedState: readHubSharedState,
    readModuleState: readBonsaiModuleState,
    readAppShellState,
    applySharedState: applyHubSharedState,
    applyModuleState: applyBonsaiModuleState,
    applyAppShellState,
    captureNamespacedState() {
      return {
        mode: "bonsai",
        hub: readHubSharedState(),
        module: {
          key: "bonsai",
          version: "0.1.0-plan",
          config: readBonsaiModuleState(),
        },
        appShell: readAppShellState(),
      };
    },
  };

  function legacyStateToNamespacedSnapshot(state) {
    if (!state || typeof state !== "object") return null;
    const controlsState =
      state.controls && typeof state.controls === "object"
        ? state.controls
        : {};
    const hub = {
      seed: Number.isFinite(Number(state.seed))
        ? Number(state.seed)
        : getCurrentSeed(),
      qualityTier: String(controlsState.qualityMode || "auto"),
      camera: {
        position: Array.isArray(state.camera?.position)
          ? state.camera.position
          : toVec3Array(camera.position),
        target: Array.isArray(state.camera?.target)
          ? state.camera.target
          : toVec3Array(controls.target),
        autoRotateOn: state.autoOn !== false,
        autoRotateSpeed: Number.isFinite(Number(state.autoSpeed))
          ? Number(state.autoSpeed)
          : parseFloat(controls.autoRotateSpeed) || 0.8,
      },
      lighting: {},
      background: {},
      export: {
        image: {},
        model: {},
      },
    };
    const moduleControls = {};
    const appShell = {};

    Object.entries(controlsState).forEach(([id, value]) => {
      if (id in HUB_SHARED_CONTROL_MAP) {
        assignPath(hub, HUB_SHARED_CONTROL_MAP[id], value);
        return;
      }
      if (APP_SHELL_CONTROL_IDS.has(id)) {
        appShell[id] = value;
        return;
      }
      if (id === "seedLabel") return;
      moduleControls[id] = value;
    });

    return {
      mode: "bonsai",
      hub,
      module: {
        key: "bonsai",
        version: "0.1.0-plan",
        config: {
          controls: moduleControls,
        },
      },
      appShell,
    };
  }

  function namespacedSnapshotToLegacyState(namespaced) {
    if (!namespaced || typeof namespaced !== "object") return null;
    const hub = namespaced.hub && typeof namespaced.hub === "object"
      ? namespaced.hub
      : {};
    const moduleConfig =
      namespaced.module &&
      typeof namespaced.module === "object" &&
      namespaced.module.config &&
      typeof namespaced.module.config === "object"
        ? namespaced.module.config
        : {};
    const controlsState =
      moduleConfig.controls && typeof moduleConfig.controls === "object"
        ? { ...moduleConfig.controls }
        : {};

    Object.entries(HUB_SHARED_PATH_TO_ID_MAP).forEach(([path, id]) => {
      const value = readPath(hub, path);
      if (value !== undefined) controlsState[id] = value;
    });
    Object.entries(namespaced.appShell || {}).forEach(([id, value]) => {
      controlsState[id] = value;
    });

    return {
      seed: Number.isFinite(Number(hub.seed)) ? Number(hub.seed) : getCurrentSeed(),
      autoOn: readPath(hub, "camera.autoRotateOn") !== false,
      autoSpeed: Number.isFinite(Number(readPath(hub, "camera.autoRotateSpeed")))
        ? Number(readPath(hub, "camera.autoRotateSpeed"))
        : parseFloat(controls.autoRotateSpeed) || 0.8,
      controls: controlsState,
      camera: {
        position: Array.isArray(readPath(hub, "camera.position"))
          ? readPath(hub, "camera.position")
          : toVec3Array(camera.position),
        target: Array.isArray(readPath(hub, "camera.target"))
          ? readPath(hub, "camera.target")
          : toVec3Array(controls.target),
      },
    };
  }

  function getNamespacedSnapshotEnvelope(source) {
    if (!source || typeof source !== "object") return null;
    if (
      source.hub &&
      source.module &&
      typeof source.hub === "object" &&
      typeof source.module === "object"
    ) {
      return {
        mode: source.mode || "bonsai",
        hub: source.hub,
        module: source.module,
        appShell:
          source.appShell && typeof source.appShell === "object"
            ? source.appShell
            : {},
      };
    }
    if (
      source.namespaced &&
      typeof source.namespaced === "object" &&
      source.namespaced.hub &&
      source.namespaced.module
    ) {
      return source.namespaced;
    }
    const looksLikeLegacyState =
      (source.controls && typeof source.controls === "object") ||
      "seed" in source ||
      "camera" in source ||
      "autoOn" in source ||
      "autoSpeed" in source;
    return looksLikeLegacyState ? legacyStateToNamespacedSnapshot(source) : null;
  }

  function normalizeSnapshotRecord(snap) {
    if (!snap || typeof snap !== "object" || !snap.id) return null;
    const normalized = { ...snap };
    const stateLooksLegacy =
      normalized.state &&
      typeof normalized.state === "object" &&
      ((normalized.state.controls &&
        typeof normalized.state.controls === "object") ||
        "seed" in normalized.state ||
        "camera" in normalized.state);
    const namespaced = stateLooksLegacy
      ? legacyStateToNamespacedSnapshot(normalized.state)
      : getNamespacedSnapshotEnvelope(normalized.state) ||
        getNamespacedSnapshotEnvelope(normalized);
    if (namespaced) {
      normalized.mode = namespaced.mode || "bonsai";
      normalized.hub = namespaced.hub;
      normalized.module = namespaced.module;
      normalized.appShell = namespaced.appShell || {};
      normalized.state =
        normalized.state && typeof normalized.state === "object"
          ? {
              ...normalized.state,
              namespaced,
            }
          : namespacedSnapshotToLegacyState(namespaced);
    }
    return normalized;
  }

  function applyNamespacedSnapshotEnvelope(namespaced) {
    if (!namespaced || typeof namespaced !== "object") return false;
    bonsaiHubAdapter.applySharedState(namespaced.hub || {});
    bonsaiHubAdapter.applyAppShellState(namespaced.appShell || {});
    bonsaiHubAdapter.applyModuleState(
      namespaced.module && namespaced.module.config
        ? namespaced.module.config
        : {},
    );
    return true;
  }

  function applyLegacySnapshotState(state) {
    const c =
      state.controls && typeof state.controls === "object"
        ? state.controls
        : {};
    resetPanelControlsToDefaults();
    sortedSnapshotEntries(c).forEach(([id, value]) => {
      const el = $(id);
      if (!el) return;
      setControlValue(el, value);
    });
    sanitizeTerminalBounds();
    setSeed(
      Number.isFinite(Number(state.seed)) ? Number(state.seed) : getCurrentSeed(),
    );
    applyBackground();
    applyLightingFromUI();
    applyVesselOnly();
    applyRenderStyle();
    regenerate();
    if (state.camera) {
      applyVec3(camera.position, state.camera.position);
      applyVec3(controls.target, state.camera.target);
      camera.updateProjectionMatrix();
      controls.update();
    }
    if (Number.isFinite(Number(state.autoSpeed))) {
      setAutoSpeed(Number(state.autoSpeed));
    }
    setAutoRotate(state.autoOn !== false);
    refreshAllReadouts();
  }

  function captureControlState() {
    const controlsState = {};
    document
      .querySelectorAll("#panel input[id], #panel select[id]")
      .forEach((el) => {
        if (el.type === "file") return;
        controlsState[el.id] =
          el.type === "checkbox" ? !!el.checked : el.value;
      });
    return {
      seed: getCurrentSeed(),
      autoOn: !!getAutoOn(),
      autoSpeed: parseFloat(controls.autoRotateSpeed) || 0.8,
      controls: controlsState,
      namespaced: bonsaiHubAdapter.captureNamespacedState(),
      camera: {
        position: toVec3Array(camera.position),
        target: toVec3Array(controls.target),
      },
    };
  }

  function applyControlState(state) {
    if (!state || typeof state !== "object") return;
    const stateLooksLegacy =
      (state.controls && typeof state.controls === "object") ||
      "seed" in state ||
      "camera" in state ||
      "autoOn" in state ||
      "autoSpeed" in state;
    if (stateLooksLegacy) {
      applyLegacySnapshotState(state);
      return;
    }
    const namespaced = getNamespacedSnapshotEnvelope(state);
    if (namespaced) {
      applyNamespacedSnapshotEnvelope(namespaced);
    }
  }

  return {
    bonsaiHubAdapter,
    captureControlState,
    applyControlState,
    normalizeSnapshotRecord,
  };
}

window.BonsaiHubAdapterModule = {
  createBonsaiHubAdapter,
};
})();
