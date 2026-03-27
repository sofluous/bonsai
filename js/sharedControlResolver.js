(function () {
function getControlValue(el) {
  if (!el) return undefined;
  return el.type === "checkbox" ? !!el.checked : el.value;
}

function setControlValue(el, value) {
  if (!el) return false;
  if (el.type === "checkbox") {
    const s = String(value).toLowerCase();
    el.checked =
      value === true ||
      value === 1 ||
      s === "1" ||
      s === "true" ||
      s === "on";
    return true;
  }
  if (value === undefined || value === null) return false;
  el.value = String(value);
  return true;
}

function createEventForElement(el, eventName) {
  const type = eventName || (el?.tagName === "SELECT" ? "change" : "input");
  return new Event(type, { bubbles: true });
}

function createSharedControlResolver({ $, getManifest }) {
  function readManifest() {
    return typeof getManifest === "function" ? getManifest() : null;
  }

  function listDefinitions() {
    return readManifest()?.getSharedControlDefinitions?.() || [];
  }

  function listGroups() {
    return readManifest()?.getSharedControlGroups?.() || [];
  }

  function getControlDefinition(controlId) {
    return listDefinitions().find((control) => control.id === controlId) || null;
  }

  function getControlElement(controlId) {
    const definition = getControlDefinition(controlId);
    const sourceId = definition?.sourceBinding?.sourceId;
    return sourceId ? $(sourceId) : null;
  }

  function getControlBinding(controlId) {
    const definition = getControlDefinition(controlId);
    const element = getControlElement(controlId);
    if (!definition) return null;
    return {
      definition,
      element,
      sourceId: definition.sourceBinding?.sourceId || null,
      sourceEvent: definition.sourceBinding?.sourceEvent || null,
      writePolicy: definition.sourceBinding?.writePolicy || null,
    };
  }

  function readControlValue(controlId) {
    const binding = getControlBinding(controlId);
    if (!binding?.element) return undefined;
    return getControlValue(binding.element);
  }

  function writeControlValue(controlId, value, options = {}) {
    const binding = getControlBinding(controlId);
    if (!binding?.element) return false;
    const didSet = setControlValue(binding.element, value);
    if (!didSet) return false;
    if (options.dispatch === false) return true;
    binding.element.dispatchEvent(
      createEventForElement(binding.element, binding.sourceEvent),
    );
    return true;
  }

  function readGroupValues(groupId) {
    const group = listGroups().find((entry) => entry.id === groupId);
    if (!group) return {};
    return group.controls.reduce((values, control) => {
      values[control.id] = readControlValue(control.id);
      return values;
    }, {});
  }

  function hasControl(controlId) {
    return !!getControlDefinition(controlId);
  }

  return {
    listDefinitions,
    listGroups,
    getControlDefinition,
    getControlBinding,
    getControlElement,
    readControlValue,
    writeControlValue,
    readGroupValues,
    hasControl,
  };
}

window.BonsaiSharedControlResolverModule = {
  createSharedControlResolver,
};
})();
