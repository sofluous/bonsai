(function () {
const {
  DEFAULT_MODULE_CODE,
  getModuleEntry,
  getModuleManifestKey,
} = window.BonsaiModuleRegistry;

function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeDeep(target[key], value);
      return;
    }
    target[key] = value;
  });
  return target;
}

function assignPath(target, path, value) {
  if (!target || !path) return target;
  const parts = String(path).split(".");
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!node[key] || typeof node[key] !== "object" || Array.isArray(node[key])) {
      node[key] = {};
    }
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
  return target;
}

function createBonsaiHubShell({
  adapter,
  mode = DEFAULT_MODULE_CODE,
  moduleCode = DEFAULT_MODULE_CODE,
  moduleKey,
}) {
  const listeners = new Set();
  const resolvedCode = String(moduleCode || moduleKey || mode || DEFAULT_MODULE_CODE);
  const resolvedManifestKey = String(
    moduleKey || getModuleManifestKey(resolvedCode) || resolvedCode,
  );
  const resolvedEntry = getModuleEntry(resolvedCode);

  const state = {
    mode: resolvedCode,
    moduleCode: resolvedCode,
    moduleKey: resolvedManifestKey,
    moduleEntry: deepClone(resolvedEntry),
    shared: {},
    module: {},
    appShell: {},
    revision: 0,
    lastSyncAt: 0,
  };

  function emit(reason = "update") {
    state.revision += 1;
    state.lastSyncAt = Date.now();
    listeners.forEach((listener) => {
      try {
        listener(getState(), reason);
      } catch (err) {
        console.warn("bonsaiHubShell listener failed", err);
      }
    });
  }

  function refreshSharedState(reason = "refresh-shared") {
    state.shared = deepClone(adapter.readSharedState() || {});
    emit(reason);
    return getSharedState();
  }

  function refreshState(reason = "refresh") {
    state.shared = deepClone(adapter.readSharedState() || {});
    state.module = deepClone(adapter.readModuleState() || {});
    state.appShell = deepClone(adapter.readAppShellState() || {});
    emit(reason);
    return getState();
  }

  function getSharedState() {
    return deepClone(state.shared);
  }

  function getState() {
    return {
      mode: state.mode,
      moduleCode: state.moduleCode,
      moduleKey: state.moduleKey,
      moduleEntry: deepClone(state.moduleEntry),
      shared: getSharedState(),
      module: deepClone(state.module),
      appShell: deepClone(state.appShell),
      revision: state.revision,
      lastSyncAt: state.lastSyncAt,
    };
  }

  function applySharedPatch(partial, reason = "apply-shared-patch") {
    if (!partial || typeof partial !== "object") return getSharedState();
    adapter.applySharedState(partial);
    mergeDeep(state.shared, deepClone(partial));
    emit(reason);
    return getSharedState();
  }

  function setSharedValue(path, value, reason = "set-shared-value") {
    const patch = {};
    assignPath(patch, path, value);
    return applySharedPatch(patch, reason);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  refreshState("init");

  return {
    getState,
    getSharedState,
    refreshState,
    refreshSharedState,
    applySharedPatch,
    setSharedValue,
    subscribe,
  };
}

window.BonsaiHubShellModule = {
  createBonsaiHubShell,
};
})();
