export function validateModuleManifest(manifest) {
  const issues = [];
  if (!manifest) {
    return {
      ok: false,
      issues: ["Manifest is missing"],
    };
  }

  if (!manifest.code) issues.push("Missing manifest.code");
  if (!manifest.key) issues.push("Missing manifest.key");
  if (typeof manifest.getCapabilities !== "function") {
    issues.push("Missing getCapabilities()");
  }
  if (typeof manifest.getSharedControlDefinitions !== "function") {
    issues.push("Missing getSharedControlDefinitions()");
  }
  if (typeof manifest.getSharedControlGroups !== "function") {
    issues.push("Missing getSharedControlGroups()");
  }
  if (typeof manifest.getSharedControlResolver !== "function") {
    issues.push("Missing getSharedControlResolver()");
  }
  if (typeof manifest.getSharedControlService !== "function") {
    issues.push("Missing getSharedControlService()");
  }

  const definitions = manifest.getSharedControlDefinitions?.() || [];
  const groups = manifest.getSharedControlGroups?.() || [];
  const resolver = manifest.getSharedControlResolver?.();
  const service = manifest.getSharedControlService?.();

  if (!Array.isArray(definitions)) issues.push("Shared control definitions must be an array");
  if (!Array.isArray(groups)) issues.push("Shared control groups must be an array");
  if (!resolver || typeof resolver.readControlValue !== "function") {
    issues.push("Shared control resolver is missing readControlValue()");
  }
  if (!service || typeof service.readGroupedState !== "function") {
    issues.push("Shared control service is missing readGroupedState()");
  }

  return {
    ok: issues.length === 0,
    code: manifest.code || "unknown",
    runtime: manifest.runtime || "unknown",
    issues,
    sharedDefinitionCount: Array.isArray(definitions) ? definitions.length : 0,
    sharedGroupCount: Array.isArray(groups) ? groups.length : 0,
  };
}

export function validateModuleManifestMap(manifestMap = {}) {
  return Object.entries(manifestMap).reduce((report, [moduleCode, manifest]) => {
    report[moduleCode] = validateModuleManifest(manifest);
    return report;
  }, {});
}

export function summarizeModuleReadiness(report = {}) {
  return Object.entries(report).reduce((summary, [moduleCode, result]) => {
    summary[moduleCode] = {
      ok: !!result?.ok,
      issueCount: Array.isArray(result?.issues) ? result.issues.length : 0,
      runtime: result?.runtime || "unknown",
    };
    return summary;
  }, {});
}
