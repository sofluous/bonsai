const RANGE = Object.freeze({
  bodyLength: Object.freeze({ min: 0.7, max: 1.45 }),
  bodyDepth: Object.freeze({ min: 0.45, max: 2.2 }),
  bodyWidth: Object.freeze({ min: 0.4, max: 1.15 }),
  headSize: Object.freeze({ min: 0.55, max: 1.2 }),
  tailLength: Object.freeze({ min: 0.7, max: 1.45 }),
  tailWidth: Object.freeze({ min: 0.45, max: 1.35 }),
  shoulderWidth: Object.freeze({ min: 0.6, max: 1.6 }),
  bodyMidDepth: Object.freeze({ min: 0.5, max: 1.8 }),
  tailRootWidth: Object.freeze({ min: 0.5, max: 1.6 }),
  snoutLength: Object.freeze({ min: 0.4, max: 1.6 }),
  taper: Object.freeze({ min: 0.2, max: 0.95 }),
  backArc: Object.freeze({ min: -0.35, max: 0.8 }),
  bellyArc: Object.freeze({ min: -0.25, max: 0.75 }),
  dorsalSize: Object.freeze({ min: 0.35, max: 1.35 }),
  caudalSize: Object.freeze({ min: 0.6, max: 1.5 }),
  pectoralSize: Object.freeze({ min: 0.4, max: 1.25 }),
  pelvicSize: Object.freeze({ min: 0.25, max: 1.05 }),
  analSize: Object.freeze({ min: 0.25, max: 1.2 }),
  finRoundness: Object.freeze({ min: 0, max: 1 }),
  finSpread: Object.freeze({ min: 0, max: 1 }),
  pectoralRoundness: Object.freeze({ min: 0, max: 1 }),
  dorsalRoundness: Object.freeze({ min: 0, max: 1 }),
  tailFork: Object.freeze({ min: 0, max: 1 }),
  mouthOpen: Object.freeze({ min: 0, max: 1 }),
  mouthHeight: Object.freeze({ min: 0, max: 1 }),
  mouthWidth: Object.freeze({ min: 0, max: 1 }),
  mouthExtrusion: Object.freeze({ min: 0, max: 1 }),
  mouthInset: Object.freeze({ min: 0, max: 1 }),
  lipLength: Object.freeze({ min: 0, max: 1 }),
  lipTaper: Object.freeze({ min: 0, max: 1 }),
  snoutTaper: Object.freeze({ min: 0, max: 1 }),
  headRoundness: Object.freeze({ min: 0, max: 1 }),
  headTopInset: Object.freeze({ min: 0, max: 1 }),
  jawInset: Object.freeze({ min: 0, max: 1 }),
  bodyCurve: Object.freeze({ min: -1, max: 1 }),
  tailCurl: Object.freeze({ min: -1, max: 1 }),
  swimTilt: Object.freeze({ min: -0.7, max: 0.7 }),
  headYaw: Object.freeze({ min: -0.6, max: 0.6 }),
  finPose: Object.freeze({ min: 0, max: 1 }),
  patternCoverage: Object.freeze({ min: 0.05, max: 0.95 }),
  patternContrast: Object.freeze({ min: 0, max: 1 }),
});

const ENUMS = Object.freeze({
  variantCode: Object.freeze(["koi"]),
  presetCode: Object.freeze(["koi_glide", "koi_sunflash", "koi_moonspot"]),
  patternType: Object.freeze(["solid", "spots", "patches"]),
  paletteFamily: Object.freeze(["sunset", "ink", "pearl"]),
  polyProfile: Object.freeze(["low"]),
});

export const KOI_SCHEMA_VERSION = "0.1.0";

export const KOI_DEFAULT_CONFIG = Object.freeze({
  identity: Object.freeze({
    moduleCode: "sakana",
    variantCode: "koi",
    schemaVersion: KOI_SCHEMA_VERSION,
    presetCode: "koi_glide",
  }),
  quality: Object.freeze({
    polyProfile: "low",
    triangleBudget: 320,
  }),
  body: Object.freeze({
    bodyLength: 1,
    bodyDepth: 1,
    bodyWidth: 1,
    headSize: 1,
    tailLength: 1,
    tailWidth: 1,
    shoulderWidth: 1,
    bodyMidDepth: 1,
    tailRootWidth: 1,
    snoutLength: 1,
    taper: 0.56,
    backArc: 0.28,
    bellyArc: 0.2,
  }),
  fins: Object.freeze({
    dorsalSize: 0.78,
    caudalSize: 1.02,
    pectoralSize: 0.8,
    pelvicSize: 0.58,
    analSize: 0.62,
    finRoundness: 0.78,
    finSpread: 0.5,
    pectoralRoundness: 0.5,
    dorsalRoundness: 0.5,
    tailFork: 0.5,
  }),
  pose: Object.freeze({
    bodyCurve: 0,
    tailCurl: 0,
    swimTilt: 0.08,
    headYaw: 0.04,
    finPose: 0.54,
    mouthOpen: 0.5,
    mouthHeight: 0.5,
    mouthWidth: 0.5,
    mouthExtrusion: 0.5,
    mouthInset: 0.5,
    lipLength: 0.5,
    lipTaper: 0.5,
    snoutTaper: 0.5,
    headRoundness: 0.5,
    headTopInset: 0.5,
    jawInset: 0.5,
  }),
  surface: Object.freeze({
    paletteFamily: "sunset",
    baseColor: "#f4f0ea",
    secondaryColor: "#ff6a3d",
    accentColor: "#201a18",
    patternType: "patches",
    patternCoverage: 0.38,
    patternContrast: 0.72,
  }),
});

export const KOI_PRESET_CATALOG = Object.freeze([
  Object.freeze({
    code: "koi_glide",
    label: "Koi Glide",
    description: "Balanced ornamental koi with flowing silhouette.",
    patch: Object.freeze({}),
  }),
  Object.freeze({
    code: "koi_sunflash",
    label: "Koi Sunflash",
    description: "Warmer patch-biased koi with broader fin read.",
    patch: Object.freeze({
      fins: Object.freeze({
        caudalSize: 1.16,
        finSpread: 0.6,
        tailFork: 0.72,
      }),
      surface: Object.freeze({
        paletteFamily: "sunset",
        patternType: "patches",
        patternCoverage: 0.52,
      }),
    }),
  }),
  Object.freeze({
    code: "koi_moonspot",
    label: "Koi Moonspot",
    description: "High-contrast spotted koi with tighter silhouette.",
    patch: Object.freeze({
      body: Object.freeze({
        bodyDepth: 0.72,
        tailLength: 0.95,
      }),
      fins: Object.freeze({
        pectoralRoundness: 0.58,
        dorsalRoundness: 0.44,
      }),
      surface: Object.freeze({
        paletteFamily: "ink",
        patternType: "spots",
        patternCoverage: 0.26,
        patternContrast: 0.88,
      }),
    }),
  }),
]);

export const KOI_CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    id: "sakana-koi-identity",
    label: "Species",
    section: "species",
    controls: Object.freeze(["presetCode", "patternType", "paletteFamily"]),
  }),
  Object.freeze({
    id: "sakana-koi-body",
    label: "Body",
    section: "body",
    controls: Object.freeze([
      "bodyLength",
      "bodyDepth",
      "bodyWidth",
      "headSize",
      "tailLength",
      "tailWidth",
      "shoulderWidth",
      "bodyMidDepth",
      "tailRootWidth",
      "snoutLength",
      "taper",
      "backArc",
      "bellyArc",
    ]),
  }),
  Object.freeze({
    id: "sakana-koi-fins",
    label: "Fins",
    section: "fins",
    controls: Object.freeze([
      "dorsalSize",
      "caudalSize",
      "pectoralSize",
      "pelvicSize",
      "analSize",
      "finRoundness",
      "finSpread",
      "pectoralRoundness",
      "dorsalRoundness",
      "tailFork",
    ]),
  }),
  Object.freeze({
    id: "sakana-koi-pose",
    label: "Pose",
    section: "pose",
    controls: Object.freeze([
      "bodyCurve",
      "tailCurl",
      "swimTilt",
      "headYaw",
      "finPose",
      "mouthOpen",
      "mouthHeight",
      "mouthWidth",
      "mouthExtrusion",
      "mouthInset",
      "lipLength",
      "lipTaper",
      "snoutTaper",
      "headRoundness",
      "headTopInset",
      "jawInset",
    ]),
  }),
  Object.freeze({
    id: "sakana-koi-surface",
    label: "Surface",
    section: "surface",
    controls: Object.freeze([
      "paletteFamily",
      "baseColor",
      "secondaryColor",
      "accentColor",
      "patternType",
      "patternCoverage",
      "patternContrast",
    ]),
  }),
]);

function clamp(value, range) {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(range.max, Math.max(range.min, num));
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

export function getKoiSchemaDefinition() {
  return {
    version: KOI_SCHEMA_VERSION,
    ranges: RANGE,
    enums: ENUMS,
  };
}

export function getDefaultKoiConfig() {
  return cloneValue(KOI_DEFAULT_CONFIG);
}

export function listKoiPresets() {
  return KOI_PRESET_CATALOG.slice();
}

export function listKoiControlGroups() {
  return KOI_CONTROL_GROUPS.slice();
}

export function sanitizeKoiConfig(input = {}) {
  const next = mergeDeep(getDefaultKoiConfig(), cloneValue(input || {}));
  const issues = [];

  if (!ENUMS.variantCode.includes(next.identity?.variantCode)) {
    next.identity.variantCode = "koi";
    issues.push("identity.variantCode reset to koi");
  }
  if (!ENUMS.presetCode.includes(next.identity?.presetCode)) {
    next.identity.presetCode = "koi_glide";
    issues.push("identity.presetCode reset to koi_glide");
  }
  next.identity.moduleCode = "sakana";
  next.identity.schemaVersion = KOI_SCHEMA_VERSION;

  if (!ENUMS.polyProfile.includes(next.quality?.polyProfile)) {
    next.quality.polyProfile = "low";
    issues.push("quality.polyProfile reset to low");
  }
  next.quality.triangleBudget = 320;

  Object.entries(next.body || {}).forEach(([key, value]) => {
    if (!RANGE[key]) return;
    next.body[key] = clamp(value, RANGE[key]);
  });
  Object.entries(next.fins || {}).forEach(([key, value]) => {
    if (!RANGE[key]) return;
    next.fins[key] = clamp(value, RANGE[key]);
  });
  Object.entries(next.pose || {}).forEach(([key, value]) => {
    if (!RANGE[key]) return;
    next.pose[key] = clamp(value, RANGE[key]);
  });

  if (!ENUMS.paletteFamily.includes(next.surface?.paletteFamily)) {
    next.surface.paletteFamily = "sunset";
    issues.push("surface.paletteFamily reset to sunset");
  }
  if (!ENUMS.patternType.includes(next.surface?.patternType)) {
    next.surface.patternType = "patches";
    issues.push("surface.patternType reset to patches");
  }
  next.surface.patternCoverage = clamp(
    next.surface?.patternCoverage,
    RANGE.patternCoverage,
  );
  next.surface.patternContrast = clamp(
    next.surface?.patternContrast,
    RANGE.patternContrast,
  );

  return {
    config: next,
    issues,
  };
}

export function validateKoiConfig(input = {}) {
  const { config, issues } = sanitizeKoiConfig(input);
  return {
    ok: issues.length === 0,
    issues,
    config,
  };
}
