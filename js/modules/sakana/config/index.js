import {
  getDefaultKoiConfig,
  getKoiSchemaDefinition,
  listKoiControlGroups,
  listKoiPresets,
  sanitizeKoiConfig,
  validateKoiConfig,
} from "./koiSchema.js";

export function getDefaultSakanaConfig() {
  return getDefaultKoiConfig();
}

export function getSakanaSchemaDefinition() {
  return getKoiSchemaDefinition();
}

export function listSakanaControlGroups() {
  return listKoiControlGroups();
}

export function listSakanaPresets() {
  return listKoiPresets();
}

export function sanitizeSakanaConfig(input = {}) {
  return sanitizeKoiConfig(input);
}

export function validateSakanaConfig(input = {}) {
  return validateKoiConfig(input);
}
