import { sanitizeSakanaConfig } from "../config/index.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pushTriangle(indices, a, b, c) {
  indices.push(a, b, c);
}

function pushQuad(indices, a, b, c, d) {
  pushTriangle(indices, a, b, c);
  pushTriangle(indices, a, c, d);
}

function addVertex(positions, point) {
  const index = positions.length / 3;
  positions.push(point.x, point.y, point.z);
  return index;
}

function hexToRgb(hex) {
  const clean = String(hex || "#ffffff").replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((part) => part + part).join("")
    : clean.padEnd(6, "f");
  const num = parseInt(value, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function mixColor(a, b, t) {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function colorArray(vertexCount, color) {
  const colors = [];
  for (let i = 0; i < vertexCount; i += 1) {
    colors.push(color.r, color.g, color.b);
  }
  return colors;
}

function createSignature(seed, config, parts, vertexCount, triangleCount) {
  return [
    "sakana",
    "abstract",
    config.identity.variantCode,
    seed,
    parts.length,
    vertexCount,
    triangleCount,
    config.surface.patternType,
  ].join(":");
}

function computeBoundsFromParts(parts) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  parts.forEach((part) => {
    const positions = part.mesh.positions;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  });

  const center = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
    (minZ + maxZ) * 0.5,
  ];
  const dx = maxX - center[0];
  const dy = maxY - center[1];
  const dz = maxZ - center[2];

  return {
    center,
    radius: Math.sqrt(dx * dx + dy * dy + dz * dz),
  };
}

function curveAt(t, config) {
  const bodyCurve = resolveNeutralSigned(ABSTRACT_BASELINE.pose.bodyCurve, config.pose.bodyCurve) * 0.18;
  const tailCurl = resolveNeutralSigned(ABSTRACT_BASELINE.pose.tailCurl, config.pose.tailCurl) * 0.26;
  return bodyCurve * Math.sin(t * Math.PI * 0.92)
    + tailCurl * Math.sin((t - 0.18) * Math.PI * 1.35) * Math.max(0, (t - 0.56) / 0.44);
}

const ABSTRACT_BASELINE = Object.freeze({
  body: Object.freeze({
    bodyDepth: 1.89,
    bodyWidth: 0.71,
    headSize: 0.94,
    tailLength: 0.7,
    tailWidth: 0.88,
    shoulderWidth: 1.32,
    bodyMidDepth: 0.85,
    tailRootWidth: 1.02,
    snoutLength: 0.41,
  }),
  fins: Object.freeze({
    finSpread: 0.57,
    pectoralRoundness: 1,
    dorsalRoundness: 0.52,
    tailFork: 1,
  }),
  pose: Object.freeze({
    bodyCurve: -0.22,
    tailCurl: 0.1,
    mouthOpen: 0.96,
    mouthHeight: 0.32,
    mouthWidth: 1,
    mouthExtrusion: 1,
    mouthInset: 1,
    lipLength: 0,
    lipTaper: 0.66,
    snoutTaper: 0.51,
    headRoundness: 1,
    headTopInset: 0,
    jawInset: 0,
  }),
});

function resolveNeutral01(base, raw) {
  const value = clamp01(raw ?? 0.5);
  if (value <= 0.5) return lerp(0, base, value / 0.5);
  return lerp(base, 1, (value - 0.5) / 0.5);
}

function resolveNeutralSigned(base, raw) {
  const value = Math.max(-1, Math.min(1, Number(raw) || 0));
  if (value <= 0) return lerp(-1, base, value + 1);
  return lerp(base, 1, value);
}

function createSymmetricRing({ x, y, z, top, upper, lower, bottom, centerTopBias = 1, centerBottomBias = 1 }) {
  return [
    { x: x + top.forward * centerTopBias, y: y + top.y, z },
    { x: x + upper.forward, y: y + upper.y, z: z + upper.z },
    { x: x + lower.forward, y: y + lower.y, z: z + lower.z },
    { x: x + bottom.forward * centerBottomBias, y: y + bottom.y, z },
    { x: x + lower.forward, y: y + lower.y, z: z - lower.z },
    { x: x + upper.forward, y: y + upper.y, z: z - upper.z },
  ];
}

function createSectionRing(section) {
  const halfWidth = section.width;
  const halfHeight = section.height;
  const topInset = clamp01(section.headTopInset ?? 0.68);
  const jawInset = clamp01(section.jawInset ?? 0.74);

  if (section.profile === "mouth") {
    const mouthOpen = clamp01(section.mouthOpen ?? 0);
    return createSymmetricRing({
      x: section.x,
      y: section.y,
      z: section.z,
      centerTopBias: lerp(1.04, 0.56, topInset),
      centerBottomBias: lerp(1.14, 0.54, jawInset),
      top: {
        forward: section.lengthBias * lerp(0.5, 0.12, topInset),
        y: halfHeight * 0.36 + halfHeight * mouthOpen * 0.18,
      },
      upper: {
        forward: section.lengthBias * lerp(0.24, 0.08, topInset),
        y: halfHeight * 0.1,
        z: halfWidth * 0.76,
      },
      lower: {
        forward: section.lengthBias * lerp(0.76, 0.16, jawInset),
        y: -halfHeight * 0.04 - halfHeight * mouthOpen * 0.04,
        z: halfWidth * 0.54,
      },
      bottom: {
        forward: section.lengthBias * lerp(1.24, 0.18, jawInset),
        y: -halfHeight * 0.28 - halfHeight * mouthOpen * 0.26,
      },
    });
  }

  if (section.profile === "head") {
    return createSymmetricRing({
      x: section.x,
      y: section.y,
      z: section.z,
      centerTopBias: lerp(1.02, 0.72, topInset),
      centerBottomBias: lerp(1.06, 0.74, jawInset),
      top: {
        forward: section.lengthBias * lerp(0.2, 0.06, topInset),
        y: halfHeight * 0.62,
      },
      upper: {
        forward: section.lengthBias * lerp(0.08, 0.02, topInset),
        y: halfHeight * 0.22,
        z: halfWidth,
      },
      lower: {
        forward: section.lengthBias * lerp(0.96, 0.42, jawInset),
        y: -halfHeight * 0.06,
        z: halfWidth * 0.82,
      },
      bottom: {
        forward: section.lengthBias * lerp(1.08, 0.48, jawInset),
        y: -halfHeight * 0.42,
      },
    });
  }

  if (section.profile === "tail") {
    return createSymmetricRing({
      x: section.x,
      y: section.y,
      z: section.z,
      top: {
        forward: section.lengthBias * 0.14,
        y: halfHeight * 0.5,
      },
      upper: {
        forward: section.lengthBias * 0.06,
        y: halfHeight * 0.16,
        z: halfWidth,
      },
      lower: {
        forward: section.lengthBias,
        y: -halfHeight * 0.02,
        z: halfWidth * 0.72,
      },
      bottom: {
        forward: section.lengthBias * 1.02,
        y: -halfHeight * 0.34,
      },
    });
  }

  return createSymmetricRing({
    x: section.x,
    y: section.y,
    z: section.z,
    top: {
      forward: section.lengthBias * 0.12,
      y: halfHeight * 0.56,
    },
    upper: {
      forward: section.lengthBias * 0.04,
      y: halfHeight * 0.18,
      z: halfWidth,
    },
    lower: {
      forward: section.lengthBias,
      y: -halfHeight * 0.04,
      z: halfWidth * 0.84,
    },
    bottom: {
      forward: section.lengthBias * 1.04,
      y: -halfHeight * 0.38,
    },
  });
}

function addRing(positions, ring) {
  const start = positions.length / 3;
  ring.forEach((point) => positions.push(point.x, point.y, point.z));
  return start;
}

function connectRings(indices, a, b) {
  for (let i = 0; i < 6; i += 1) {
    const next = (i + 1) % 6;
    pushQuad(indices, a + i, a + next, b + next, b + i);
  }
}

function capFront(indices, start) {
  pushTriangle(indices, start + 0, start + 1, start + 5);
  pushTriangle(indices, start + 1, start + 2, start + 3);
  pushTriangle(indices, start + 1, start + 3, start + 5);
  pushTriangle(indices, start + 5, start + 3, start + 4);
}

function capBack(indices, start) {
  pushTriangle(indices, start + 0, start + 5, start + 1);
  pushTriangle(indices, start + 1, start + 3, start + 2);
  pushTriangle(indices, start + 1, start + 5, start + 3);
  pushTriangle(indices, start + 5, start + 4, start + 3);
}

function createClosedSegment(name, sectionA, sectionB, color) {
  const positions = [];
  const indices = [];
  const ringA = addRing(positions, createSectionRing(sectionA));
  const ringB = addRing(positions, createSectionRing(sectionB));
  connectRings(indices, ringA, ringB);
  capFront(indices, ringA);
  capBack(indices, ringB);
  return {
    name,
    color,
    mesh: {
      positions,
      indices,
      colors: colorArray(positions.length / 3, color),
    },
  };
}

function createRibbonPart(name, points, thicknesses, color) {
  const positions = [];
  const indices = [];
  const top = [];
  const bottom = [];

  points.forEach((point, i) => {
    const half = thicknesses[i] * 0.5;
    top.push(addVertex(positions, { x: point.x, y: point.y + half, z: point.z }));
  });
  points.forEach((point, i) => {
    const half = thicknesses[i] * 0.5;
    bottom.push(addVertex(positions, { x: point.x, y: point.y - half, z: point.z }));
  });

  for (let i = 1; i < points.length - 1; i += 1) {
    pushTriangle(indices, top[0], top[i], top[i + 1]);
    pushTriangle(indices, bottom[0], bottom[i + 1], bottom[i]);
  }
  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    pushQuad(indices, top[i], top[next], bottom[next], bottom[i]);
  }

  return {
    name,
    color,
    mesh: {
      positions,
      indices,
      colors: colorArray(positions.length / 3, color),
    },
  };
}

function buildPalette(config) {
  const base = hexToRgb(config.surface.baseColor);
  const secondary = hexToRgb(config.surface.secondaryColor);
  const accent = hexToRgb(config.surface.accentColor);

  if (config.surface.patternType === "solid") {
    return {
      head: mixColor(base, secondary, 0.16),
      bodyA: mixColor(base, secondary, 0.12),
      bodyB: mixColor(base, secondary, 0.08),
      bodyC: mixColor(base, secondary, 0.14),
      tail: mixColor(base, accent, 0.08),
      fin: mixColor(base, accent, 0.12),
    };
  }

  if (config.surface.patternType === "spots") {
    return {
      head: mixColor(base, secondary, 0.26),
      bodyA: base,
      bodyB: mixColor(base, secondary, 0.34),
      bodyC: base,
      tail: mixColor(base, accent, 0.12),
      fin: mixColor(base, accent, 0.18),
    };
  }

  return {
    head: mixColor(base, secondary, 0.32),
    bodyA: mixColor(base, secondary, 0.18),
    bodyB: base,
    bodyC: mixColor(base, secondary, 0.38),
    tail: mixColor(base, secondary, 0.24),
    fin: mixColor(base, accent, 0.1),
  };
}

export function buildAbstractKoiSections(config) {
  const bodyLength = (config.body.bodyLength ?? 1) * 2.4;
  const headScale = ABSTRACT_BASELINE.body.headSize * (config.body.headSize ?? 1);
  const widthScale = ABSTRACT_BASELINE.body.bodyWidth * (config.body.bodyWidth ?? 1);
  const depthScale = ABSTRACT_BASELINE.body.bodyDepth * (config.body.bodyDepth ?? 1) * 1.12;
  const tailScale = ABSTRACT_BASELINE.body.tailWidth * (config.body.tailWidth ?? 1);
  const shoulderWidth = ABSTRACT_BASELINE.body.shoulderWidth * (config.body.shoulderWidth ?? 1);
  const bodyMidDepth = ABSTRACT_BASELINE.body.bodyMidDepth * (config.body.bodyMidDepth ?? 1);
  const tailRootWidth = ABSTRACT_BASELINE.body.tailRootWidth * (config.body.tailRootWidth ?? 1);
  const snoutLength = ABSTRACT_BASELINE.body.snoutLength * (config.body.snoutLength ?? 1);
  const mouthHeight = resolveNeutral01(ABSTRACT_BASELINE.pose.mouthHeight, config.pose.mouthHeight);
  const mouthWidth = resolveNeutral01(ABSTRACT_BASELINE.pose.mouthWidth, config.pose.mouthWidth);
  const mouthExtrusion = resolveNeutral01(ABSTRACT_BASELINE.pose.mouthExtrusion, config.pose.mouthExtrusion);
  const mouthInset = resolveNeutral01(ABSTRACT_BASELINE.pose.mouthInset, config.pose.mouthInset);
  const lipLength = resolveNeutral01(ABSTRACT_BASELINE.pose.lipLength, config.pose.lipLength);
  const mouthOpen = resolveNeutral01(ABSTRACT_BASELINE.pose.mouthOpen, config.pose.mouthOpen);
  const snoutTaper = resolveNeutral01(ABSTRACT_BASELINE.pose.snoutTaper, config.pose.snoutTaper);
  const headRoundness = resolveNeutral01(ABSTRACT_BASELINE.pose.headRoundness, config.pose.headRoundness);
  const headTopInset = resolveNeutral01(ABSTRACT_BASELINE.pose.headTopInset, config.pose.headTopInset);
  const jawInset = resolveNeutral01(ABSTRACT_BASELINE.pose.jawInset, config.pose.jawInset);
  const bluntness = 1 - snoutTaper;

  const mouthBackT = 0.09;
  const mouthFrontSpacing = lerp(0.016, 0.07, lipLength);
  const mouthFrontT = Math.max(0.018, mouthBackT - mouthFrontSpacing);

  const stations = [
    { id: "mouth_front", t: mouthFrontT, width: lerp(0.07, 0.14, mouthWidth) * headScale * lerp(1.12, 0.88, snoutTaper), height: lerp(0.05, 0.12, mouthHeight) * depthScale, y: 0.014, profile: "mouth", lengthBias: (0.006 + mouthExtrusion * 0.006 - mouthInset * 0.005) * snoutLength, mouthOpen, headTopInset, jawInset },
    { id: "mouth_back", t: mouthBackT, width: lerp(0.14, 0.24, mouthWidth) * headScale * lerp(1.14, 0.94, snoutTaper), height: lerp(0.08, 0.18, mouthHeight) * depthScale, y: 0.02, profile: "mouth", lengthBias: (0.014 + mouthExtrusion * 0.012 - mouthInset * 0.006) * snoutLength, mouthOpen, headTopInset, jawInset },
    { id: "snout_mid", t: 0.16, width: lerp(0.24, 0.32, bluntness) * headScale * lerp(0.94, 1.08, headRoundness), height: lerp(0.16, 0.24, bluntness * 0.7 + headRoundness * 0.3) * depthScale, y: 0.024, profile: "head", lengthBias: (0.024 + headRoundness * 0.008) * snoutLength, headTopInset, jawInset },
    { id: "head_mid", t: 0.23, width: lerp(0.3, 0.38, bluntness) * headScale * lerp(0.92, 1.08, headRoundness), height: lerp(0.22, 0.28, headRoundness) * depthScale, y: 0.028, profile: "head", lengthBias: 0.026 + headRoundness * 0.008, headTopInset, jawInset },
    { id: "shoulder", t: 0.34, width: 0.36 * widthScale * shoulderWidth, height: 0.28 * depthScale, y: 0.02, profile: "body", lengthBias: 0.028 },
    { id: "body_front", t: 0.48, width: 0.35 * widthScale, height: 0.26 * depthScale, y: 0.014, profile: "body", lengthBias: 0.026 },
    { id: "body_mid", t: 0.61, width: 0.31 * widthScale, height: 0.22 * depthScale * bodyMidDepth, y: 0.006, profile: "body", lengthBias: 0.022 },
    { id: "body_rear", t: 0.73, width: 0.22 * widthScale, height: 0.15 * depthScale, y: -0.002, profile: "tail", lengthBias: 0.018 },
    { id: "tail_base", t: 0.83, width: 0.12 * tailScale * tailRootWidth, height: 0.09 * depthScale, y: -0.008, profile: "tail", lengthBias: 0.014 },
    { id: "tail_tip", t: 0.92, width: 0.076 * tailScale, height: 0.064 * depthScale, y: -0.012, profile: "tail", lengthBias: 0.01 },
  ];

  return stations.map((station) => ({
    ...station,
    x: lerp(-bodyLength * 0.58, bodyLength * 0.66, station.t),
    z: curveAt(station.t, config),
  }));
}

function buildFins(sections, config, palette) {
  const parts = [];
  const snoutMid = sections.find((section) => section.id === "snout_mid");
  const headMid = sections.find((section) => section.id === "head_mid");
  const shoulder = sections.find((section) => section.id === "shoulder");
  const bodyFront = sections.find((section) => section.id === "body_front");
  const bodyMid = sections.find((section) => section.id === "body_mid");
  const tailBase = sections.find((section) => section.id === "tail_base");
  const tailTip = sections.find((section) => section.id === "tail_tip");

  const finSpread = resolveNeutral01(ABSTRACT_BASELINE.fins.finSpread, config.fins.finSpread);
  const pRound = resolveNeutral01(ABSTRACT_BASELINE.fins.pectoralRoundness, config.fins.pectoralRoundness);
  const dRound = resolveNeutral01(ABSTRACT_BASELINE.fins.dorsalRoundness, config.fins.dorsalRoundness);
  const fork = resolveNeutral01(ABSTRACT_BASELINE.fins.tailFork, config.fins.tailFork);

  parts.push(createRibbonPart(
    "dorsal_fin",
    [
      { x: shoulder.x + 0.06, y: shoulder.height * 0.4, z: shoulder.z },
      { x: lerp(shoulder.x, bodyFront.x, 0.28), y: lerp(0.08, 0.22, dRound), z: lerp(shoulder.z, bodyFront.z, 0.28) },
      { x: lerp(bodyFront.x, bodyMid.x, 0.46), y: lerp(0.12, 0.24, dRound), z: lerp(bodyFront.z, bodyMid.z, 0.46) },
      { x: bodyMid.x + 0.01, y: bodyMid.height * 0.22, z: bodyMid.z },
      { x: lerp(bodyFront.x, bodyMid.x, 0.62), y: lerp(0.06, 0.1, dRound), z: lerp(bodyFront.z, bodyMid.z, 0.62) },
    ],
    [0.024, 0.032, 0.028, 0.02, 0.016],
    palette.fin,
  ));

  const pectoralLength = lerp(0.18, 0.34, finSpread) * config.fins.pectoralSize;
  const pectoralSweep = lerp(0.12, 0.26, pRound);
  const pectoralDrop = lerp(0.02, 0.05, pRound);
  const pectoralThickness = 0.026 + config.fins.pectoralSize * 0.016;

  parts.push(createRibbonPart(
    "pectoral_right",
    [
      { x: snoutMid.x + 0.01, y: -0.008, z: headMid.z + headMid.width * 0.68 },
      { x: shoulder.x - 0.01, y: -0.012, z: headMid.z + headMid.width * 0.86 },
      { x: shoulder.x + pectoralLength * 0.4, y: -pectoralDrop, z: headMid.z + headMid.width + pectoralSweep * 0.16 },
      { x: shoulder.x + pectoralLength, y: -pectoralDrop * 0.8, z: headMid.z + headMid.width + pectoralSweep },
      { x: shoulder.x + pectoralLength * 0.62, y: -pectoralDrop * 1.2, z: headMid.z + headMid.width + pectoralSweep * 0.4 },
    ],
    [pectoralThickness, pectoralThickness * 0.9, pectoralThickness * 0.76, pectoralThickness * 0.48, pectoralThickness * 0.42],
    palette.fin,
  ));

  parts.push(createRibbonPart(
    "pectoral_left",
    [
      { x: snoutMid.x + 0.01, y: -0.008, z: headMid.z - headMid.width * 0.68 },
      { x: shoulder.x - 0.01, y: -0.012, z: headMid.z - headMid.width * 0.86 },
      { x: shoulder.x + pectoralLength * 0.4, y: -pectoralDrop, z: headMid.z - headMid.width - pectoralSweep * 0.16 },
      { x: shoulder.x + pectoralLength, y: -pectoralDrop * 0.8, z: headMid.z - headMid.width - pectoralSweep },
      { x: shoulder.x + pectoralLength * 0.62, y: -pectoralDrop * 1.2, z: headMid.z - headMid.width - pectoralSweep * 0.4 },
    ],
    [pectoralThickness, pectoralThickness * 0.9, pectoralThickness * 0.76, pectoralThickness * 0.48, pectoralThickness * 0.42],
    palette.fin,
  ));

  parts.push(createRibbonPart(
    "pelvic_fin",
    [
      { x: bodyFront.x - 0.02, y: -0.02, z: bodyFront.z + bodyFront.width * 0.24 },
      { x: bodyFront.x + 0.08, y: -0.04, z: bodyFront.z + bodyFront.width * 0.08 },
      { x: bodyFront.x + 0.04, y: -0.048, z: bodyFront.z - bodyFront.width * 0.08 },
    ],
    [0.022, 0.018, 0.014],
    palette.fin,
  ));

  const tailLength = ABSTRACT_BASELINE.body.tailLength * (config.body.tailLength ?? 1) * 0.92;
  const tailSpread = config.fins.caudalSize * lerp(0.22, 0.52, fork);
  const tailThickness = 0.024 + config.fins.caudalSize * 0.014;
  const bend = resolveNeutralSigned(ABSTRACT_BASELINE.pose.tailCurl, config.pose.tailCurl) * 0.08;

  parts.push(createRibbonPart(
    "tail_upper",
    [
      { x: tailTip.x + tailTip.lengthBias * 0.96, y: 0.0, z: tailTip.z + tailBase.width * 0.18 },
      { x: tailTip.x + tailLength * 0.18, y: 0.01, z: tailTip.z + tailSpread * 0.32 },
      { x: tailTip.x + tailLength * 0.62, y: 0.014, z: tailTip.z + tailSpread + bend },
      { x: tailTip.x + tailLength, y: 0.0, z: tailTip.z + tailSpread * 0.72 + bend },
      { x: tailTip.x + tailLength * 0.64, y: -0.01, z: tailTip.z + tailSpread * 0.34 + bend * 0.6 },
    ],
    [tailThickness * 0.72, tailThickness, tailThickness * 0.86, tailThickness * 0.52, tailThickness * 0.34],
    palette.tail,
  ));

  parts.push(createRibbonPart(
    "tail_lower",
    [
      { x: tailTip.x + tailTip.lengthBias * 0.96, y: 0.0, z: tailTip.z - tailBase.width * 0.18 },
      { x: tailTip.x + tailLength * 0.18, y: 0.01, z: tailTip.z - tailSpread * 0.32 },
      { x: tailTip.x + tailLength * 0.62, y: 0.014, z: tailTip.z - tailSpread + bend },
      { x: tailTip.x + tailLength, y: 0.0, z: tailTip.z - tailSpread * 0.72 + bend },
      { x: tailTip.x + tailLength * 0.64, y: -0.01, z: tailTip.z - tailSpread * 0.34 + bend * 0.6 },
    ],
    [tailThickness * 0.72, tailThickness, tailThickness * 0.86, tailThickness * 0.52, tailThickness * 0.34],
    palette.tail,
  ));

  return parts;
}

export function createSakanaAbstractKoiGenerator() {
  return {
    version: "0.7.4-abstract-parts",
    generate(seed = 1, rawConfig = {}) {
      const { config, issues } = sanitizeSakanaConfig(rawConfig);
      const sections = buildAbstractKoiSections(config);
      const palette = buildPalette(config);

      const parts = [
        createClosedSegment("mouth_block", sections[0], sections[1], palette.head),
        createClosedSegment("snout_block", sections[1], sections[2], palette.head),
        createClosedSegment("head_block", sections[2], sections[3], palette.head),
        createClosedSegment("shoulder_block", sections[3], sections[4], palette.bodyA),
        createClosedSegment("body_front_block", sections[4], sections[5], palette.bodyB),
        createClosedSegment("body_mid_block", sections[5], sections[6], palette.bodyC),
        createClosedSegment("body_rear_block", sections[6], sections[7], palette.bodyB),
        createClosedSegment("tail_stalk_block", sections[7], sections[8], palette.tail),
        createClosedSegment("tail_base_block", sections[8], sections[9], palette.tail),
        ...buildFins(sections, config, palette),
      ];

      const vertexCount = parts.reduce((sum, part) => sum + part.mesh.positions.length / 3, 0);
      const triangleCount = parts.reduce((sum, part) => sum + part.mesh.indices.length / 3, 0);
      const bounds = computeBoundsFromParts(parts);

      return {
        seed,
        config,
        status: "prototype",
        construction: "abstract_parts",
        parts,
        materials: {
          baseColor: config.surface.baseColor,
          secondaryColor: config.surface.secondaryColor,
          accentColor: config.surface.accentColor,
          patternType: config.surface.patternType,
          paletteFamily: config.surface.paletteFamily,
          patternCoverage: config.surface.patternCoverage,
          patternContrast: config.surface.patternContrast,
        },
        bounds: {
          center: bounds.center,
          radius: bounds.radius,
        },
        metadata: {
          family: "sakana",
          variant: config.identity.variantCode,
          preset: config.identity.presetCode,
          partCount: parts.length,
          triangleCount,
          vertexCount,
          signature: createSignature(seed, config, parts, vertexCount, triangleCount),
          issues,
        },
      };
    },
  };
}
