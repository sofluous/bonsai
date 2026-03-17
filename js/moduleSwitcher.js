export function createModuleSwitcher({
  moduleSwitch,
  moduleSwitchBtn,
  moduleSwitchMenu,
  moduleSwitchOptions,
  defaultModuleCode,
  activeModuleStorageKey,
  moduleRegistry,
  getCurrentModuleCode,
  getModuleManifest,
  onActivateModule,
  onUnavailableModule,
  showToast,
}) {
  function setOpen(open) {
    if (!moduleSwitch || !moduleSwitchBtn) return;
    const isOpen = !!open;
    moduleSwitch.dataset.open = isOpen ? "true" : "false";
    moduleSwitchBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function getStoredModuleKey() {
    return String(
      localStorage.getItem(activeModuleStorageKey) || defaultModuleCode,
    ).toLowerCase();
  }

  function syncState() {
    const currentModule = getCurrentModuleCode?.() || defaultModuleCode;
    const moduleOptionButtons = Array.from(
      document.querySelectorAll(".module-option[data-module]"),
    );
    moduleOptionButtons.forEach((btn) => {
      const isCurrent = btn.dataset.module === currentModule;
      btn.setAttribute("aria-current", isCurrent ? "true" : "false");
    });
  }

  function handleSelection(moduleCode) {
    const key = String(moduleCode || defaultModuleCode).toLowerCase();
    const moduleEntry =
      moduleRegistry.find((entry) => entry.code === key) || null;
    const manifest = getModuleManifest?.(key) || null;
    if (!moduleEntry) {
      setOpen(false);
      showToast?.("Unknown module", "warn");
      return false;
    }
    if (key === defaultModuleCode) {
      localStorage.setItem(activeModuleStorageKey, defaultModuleCode);
      onActivateModule?.(key, moduleEntry, manifest);
      syncState();
      setOpen(false);
      showToast?.(`${moduleEntry.label} module active`);
      return true;
    }
    setOpen(false);
    onUnavailableModule?.(key, moduleEntry, manifest);
    showToast?.(
      manifest?.getAvailabilityMessage?.() ||
        `${moduleEntry.label} module not available yet`,
      "info",
    );
    return false;
  }

  function renderMenu() {
    if (!moduleSwitchOptions) return;
    const currentModule = getCurrentModuleCode?.() || getStoredModuleKey();
    moduleSwitchOptions.innerHTML = "";
    moduleRegistry.forEach((entry) => {
      const manifest = getModuleManifest?.(entry.code) || null;
      const btn = document.createElement("button");
      btn.className = "btn ds-btn ds-btn-ghost module-option";
      btn.type = "button";
      btn.dataset.module = entry.code;
      btn.setAttribute("role", "menuitem");
      btn.setAttribute(
        "aria-current",
        entry.code === currentModule ? "true" : "false",
      );
      btn.innerHTML = `
        <span class="module-option-name">${entry.label}</span>
        <span class="module-option-meta">${entry.familyLabel} | ${manifest?.runtime || entry.status}</span>
      `;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleSelection(entry.code);
      });
      moduleSwitchOptions.appendChild(btn);
    });
  }

  function bindEvents() {
    if (moduleSwitchBtn) {
      moduleSwitchBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextOpen = moduleSwitch?.dataset.open !== "true";
        setOpen(nextOpen);
        if (nextOpen) syncState();
      });
    }
    if (moduleSwitchMenu) {
      moduleSwitchMenu.addEventListener("click", (e) => e.stopPropagation());
    }
    document.addEventListener("click", (e) => {
      if (!moduleSwitch || !moduleSwitch.dataset.open) return;
      if (moduleSwitch.dataset.open !== "true") return;
      if (moduleSwitch.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && moduleSwitch?.dataset.open === "true") {
        setOpen(false);
        moduleSwitchBtn?.focus();
      }
    });
  }

  function initialize() {
    renderMenu();
    syncState();
  }

  return {
    initialize,
    renderMenu,
    syncState,
    handleSelection,
    setOpen,
    getStoredModuleKey,
    bindEvents,
  };
}
