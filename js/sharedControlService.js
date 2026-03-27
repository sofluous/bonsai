(function () {
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

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function createSharedControlService({ resolver, getSharedState, applySharedPatch }) {
  function listDefinitions() {
    return resolver?.listDefinitions?.() || [];
  }

  function listGroups() {
    return resolver?.listGroups?.() || [];
  }

  function getDefinition(controlId) {
    return resolver?.getControlDefinition?.(controlId) || null;
  }

  function readValue(controlId) {
    return resolver?.readControlValue?.(controlId);
  }

  function readValues(controlIds = []) {
    return controlIds.reduce((values, controlId) => {
      values[controlId] = readValue(controlId);
      return values;
    }, {});
  }

  function readGroup(groupId) {
    return resolver?.readGroupValues?.(groupId) || {};
  }

  function readStateSubset(controlIds = []) {
    return controlIds.reduce((state, controlId) => {
      const definition = getDefinition(controlId);
      if (!definition?.valuePath) return state;
      assignPath(state, definition.valuePath.replace(/^hub\./, ""), readValue(controlId));
      return state;
    }, {});
  }

  function readGroupedState() {
    return listDefinitions().reduce((state, definition) => {
      if (!definition?.id || !definition?.valuePath) return state;
      assignPath(
        state,
        definition.valuePath.replace(/^hub\./, ""),
        readValue(definition.id),
      );
      return state;
    }, {});
  }

  function writeValue(controlId, value, options = {}) {
    const definition = getDefinition(controlId);
    if (!definition?.valuePath) return false;
    const wrote = resolver?.writeControlValue?.(controlId, value, options) || false;
    if (!wrote || typeof applySharedPatch !== "function") return wrote;
    const patch = {};
    assignPath(patch, definition.valuePath.replace(/^hub\./, ""), value);
    applySharedPatch(patch, options.reason || `shared-control:${controlId}`);
    return true;
  }

  function syncValue(controlId, options = {}) {
    const definition = getDefinition(controlId);
    if (!definition?.valuePath || typeof applySharedPatch !== "function") return false;
    const value = readValue(controlId);
    if (value === undefined) return false;
    const patch = {};
    assignPath(patch, definition.valuePath.replace(/^hub\./, ""), value);
    applySharedPatch(patch, options.reason || `shared-control:sync:${controlId}`);
    return true;
  }

  function writeValues(values = {}, options = {}) {
    const patch = {};
    let changed = false;
    Object.entries(values).forEach(([controlId, value]) => {
      const definition = getDefinition(controlId);
      if (!definition?.valuePath) return;
      const wrote = resolver?.writeControlValue?.(controlId, value, options) || false;
      if (!wrote) return;
      assignPath(patch, definition.valuePath.replace(/^hub\./, ""), value);
      changed = true;
    });
    if (changed && typeof applySharedPatch === "function") {
      applySharedPatch(patch, options.reason || "shared-control:batch");
    }
    return changed;
  }

  function syncValues(controlIds = [], options = {}) {
    if (!Array.isArray(controlIds) || typeof applySharedPatch !== "function") return false;
    const patch = {};
    let changed = false;
    controlIds.forEach((controlId) => {
      const definition = getDefinition(controlId);
      if (!definition?.valuePath) return;
      const value = readValue(controlId);
      if (value === undefined) return;
      assignPath(patch, definition.valuePath.replace(/^hub\./, ""), value);
      changed = true;
    });
    if (changed) {
      applySharedPatch(patch, options.reason || "shared-control:sync:batch");
    }
    return changed;
  }

  function syncGroup(groupId, options = {}) {
    const group = listGroups().find((entry) => entry.id === groupId);
    if (!group) return false;
    return syncValues(
      group.controls.map((control) => control.id),
      options,
    );
  }

  function applyStateSubset(partialState = {}, options = {}) {
    const current = typeof getSharedState === "function" ? getSharedState() || {} : {};
    const nextState = mergeDeep(cloneValue(current), partialState);
    const writes = {};
    listDefinitions().forEach((definition) => {
      if (!definition?.id || !definition?.valuePath) return;
      const parts = definition.valuePath.replace(/^hub\./, "").split(".");
      let value = nextState;
      for (const part of parts) {
        value = value && typeof value === "object" ? value[part] : undefined;
      }
      if (value !== undefined) writes[definition.id] = value;
    });
    return writeValues(writes, options);
  }

  return {
    listDefinitions,
    listGroups,
    getDefinition,
    readValue,
    readValues,
    readGroup,
    readStateSubset,
    readGroupedState,
    writeValue,
    syncValue,
    writeValues,
    syncValues,
    syncGroup,
    applyStateSubset,
  };
}

window.BonsaiSharedControlServiceModule = {
  createSharedControlService,
};
})();
