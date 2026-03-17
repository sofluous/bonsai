import { createSakanaGeneratorStub } from "./generator/sakanaGeneratorStub.js";
import {
  getDefaultSakanaConfig,
  getSakanaSchemaDefinition,
  listSakanaControlGroups,
  listSakanaPresets,
  sanitizeSakanaConfig,
  validateSakanaConfig,
} from "./config/index.js";
import { SAKANA_VARIANT_STUBS } from "./variants/index.js";

export const SAKANA_MODULE_BOOTSTRAP = Object.freeze({
  code: "sakana",
  runtime: "scaffolded-stub",
  entry: "./js/modules/sakana/index.js",
  generatorEntry: "./js/modules/sakana/generator/sakanaGeneratorStub.js",
  schemaEntry: "./js/modules/sakana/config/index.js",
  variantsEntry: "./js/modules/sakana/variants/index.js",
  status: "planned",
});

export function createSakanaModuleRuntimeStub() {
  return {
    bootstrap: SAKANA_MODULE_BOOTSTRAP,
    schema: getSakanaSchemaDefinition(),
    defaults: getDefaultSakanaConfig(),
    generator: createSakanaGeneratorStub(),
    presets: listSakanaPresets(),
    variants: SAKANA_VARIANT_STUBS.slice(),
    controlGroups: listSakanaControlGroups(),
    sanitizeConfig: sanitizeSakanaConfig,
    validateConfig: validateSakanaConfig,
  };
}
