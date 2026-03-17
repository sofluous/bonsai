import { sanitizeSakanaConfig } from "../config/index.js";
import { buildCanonicalKoiStations } from "./koiCanonicalTemplate.js";

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

function computeBounds(positions) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
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
  const center = [
    (minX + maxX) * 0.5,
    (minY + maxY) * 0.5,
    (minZ + maxZ) * 0.5,
  ];
  const dx = maxX - center[0];
  const dy = maxY - center[1];
  const dz = maxZ - center[2];
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center,
    radius: Math.sqrt(dx * dx + dy * dy + dz * dz),
  };
}

function createSignature(seed, config, positionsLength, indicesLength) {
  return [
    "sakana",
    config.identity.variantCode,
    seed,
    positionsLength,
    indicesLength,
    config.surface.patternType,
    config.surface.paletteFamily,
  ].join(":");
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

function buildVertexColors(positions, config, seed) {
  const colors = [];
  const base = hexToRgb(config.surface.baseColor);
  const secondary = hexToRgb(config.surface.secondaryColor);
  const accent = hexToRgb(config.surface.accentColor);
  const bounds = computeBounds(positions);
  const spanX = Math.max(0.0001, bounds.max[0] - bounds.min[0]);
  const coverage = clamp01(config.surface.patternCoverage);
  const contrast = clamp01(config.surface.patternContrast);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const t = (x - bounds.min[0]) / spanX;
    let color = base;

    if (config.surface.patternType === "solid") {
      color = mixColor(base, secondary, 0.08 + contrast * 0.12);
    } else if (config.surface.patternType === "patches") {
      const band = Math.sin(t * Math.PI * 3 + z * 3.6 + y * 2.4 + seed * 0.003);
      color = band > lerp(0.8, 0.06, coverage)
        ? mixColor(base, secondary, 0.92)
        : mixColor(base, accent, 0.06);
    } else if (config.surface.patternType === "spots") {
      const spots =
        Math.sin(x * 5 + seed * 0.004) *
        Math.cos(z * 7.2 + y * 5.4) *
        Math.sin(y * 9.1 + 0.8);
      color = spots > lerp(0.9, 0.34, coverage)
        ? mixColor(secondary, accent, 0.22 + contrast * 0.34)
        : base;
    }

    colors.push(color.r, color.g, color.b);
  }

  return colors;
}

function createRing(station) {
  return [
    { x: station.x, y: station.y + station.thickness * 0.9, z: station.z },
    { x: station.x, y: station.y + station.thickness * 0.28, z: station.z + station.width },
    { x: station.x, y: station.y - station.thickness * 0.04, z: station.z + station.width * 0.84 },
    { x: station.x, y: station.y - station.thickness * 0.84, z: station.z },
    { x: station.x, y: station.y - station.thickness * 0.04, z: station.z - station.width * 0.84 },
    { x: station.x, y: station.y + station.thickness * 0.28, z: station.z - station.width },
  ];
}

function createHeadRing(station, profile = "front") {
  const snoutTaper = station.snoutTaper ?? 0.45;
  const mouthHeight = clamp01(station.mouthHeight ?? 0.32);
  const frontScale = profile === "front"
    ? lerp(0.62, 1.04, station.mouthWidth ?? 0.3)
    : lerp(0.82, 1.0, 1 - snoutTaper);
  const lowerScale = profile === "front"
    ? lerp(0.46, 0.98, station.mouthWidth ?? 0.3)
    : lerp(0.72, 0.9, 1 - snoutTaper);
  const frontWidth = station.width * frontScale;
  const lowerWidth = station.width * lowerScale;
  const topLift = profile === "front"
    ? lerp(0.24, 0.78, mouthHeight)
    : lerp(0.62, 0.84, 1 - snoutTaper);
  const upperLift = profile === "front"
    ? lerp(0.08, 0.3, mouthHeight)
    : lerp(0.2, 0.28, 1 - snoutTaper);
  const chinDrop = profile === "front"
    ? lerp(-0.02, 0.03, mouthHeight)
    : lerp(0.01, 0.06, 1 - snoutTaper);
  const extrusion = profile === "front" ? lerp(-0.004, 0.05, station.mouthExtrusion ?? 0.2) : 0.008;
  return [
    { x: station.x, y: station.y + station.thickness * topLift, z: station.z },
    { x: station.x, y: station.y + station.thickness * upperLift, z: station.z + frontWidth },
    { x: station.x + extrusion, y: station.y - station.thickness * chinDrop, z: station.z + lowerWidth },
    { x: station.x + extrusion * 1.15, y: station.y - station.thickness * 0.7, z: station.z },
    { x: station.x + extrusion, y: station.y - station.thickness * chinDrop, z: station.z - lowerWidth },
    { x: station.x, y: station.y + station.thickness * upperLift, z: station.z - frontWidth },
  ];
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

function capFrontRing(indices, ringStart) {
  pushTriangle(indices, ringStart + 0, ringStart + 1, ringStart + 5);
  pushTriangle(indices, ringStart + 1, ringStart + 2, ringStart + 5);
  pushTriangle(indices, ringStart + 2, ringStart + 4, ringStart + 5);
  pushTriangle(indices, ringStart + 2, ringStart + 3, ringStart + 4);
}

function addInsetMouthCavity(positions, indices, lipRingStart, face) {
  const mouthHeight = clamp01(face.mouthHeight ?? 0.32);
  const mouthWidth = clamp01(face.mouthWidth ?? 0.28);
  const mouthOpen = clamp01(face.mouthOpen ?? 0);
  const lipTaper = clamp01(face.lipTaper ?? 0.5);
  const snoutTaper = clamp01(face.snoutTaper ?? 0.46);
  const mouthExtrusion = clamp01(face.mouthExtrusion ?? 0.22);

  const lipX = positions[lipRingStart * 3];
  const cavityDepth = face.thickness * lerp(0.12, 0.34, mouthExtrusion * 0.7 + (1 - snoutTaper) * 0.3);
  const cavityX = lipX + cavityDepth;
  const upperWidth = face.width * lerp(0.14, 0.3, mouthWidth) * lerp(1.0, 0.76, lipTaper);
  const lowerWidth = face.width * lerp(0.1, 0.24, mouthWidth) * lerp(1.0, 0.74, lipTaper);
  const upperY = face.y + face.thickness * lerp(0.04, 0.12, mouthHeight) + face.thickness * mouthOpen * 0.04;
  const cheekY = face.y - face.thickness * lerp(0.02, 0.07, mouthHeight) - face.thickness * mouthOpen * 0.03;
  const lowerY = face.y - face.thickness * lerp(0.06, 0.14, mouthHeight) - face.thickness * mouthOpen * 0.1;
  const chinY = face.y - face.thickness * lerp(0.12, 0.24, mouthHeight) - face.thickness * mouthOpen * 0.2;

  const cavityStart = addRing(positions, [
    { x: cavityX, y: upperY, z: face.z },
    { x: cavityX + face.thickness * 0.02, y: cheekY, z: face.z + upperWidth },
    { x: cavityX + face.thickness * 0.04, y: lowerY, z: face.z + lowerWidth },
    { x: cavityX + face.thickness * 0.05, y: chinY, z: face.z },
    { x: cavityX + face.thickness * 0.04, y: lowerY, z: face.z - lowerWidth },
    { x: cavityX + face.thickness * 0.02, y: cheekY, z: face.z - upperWidth },
  ]);

  connectRings(indices, lipRingStart, cavityStart);
  capFrontRing(indices, cavityStart);
}

function addHeadSection(positions, indices, firstRingStart, stations) {
  const face = stations[0];
  const mouthOpen = face.mouthOpen ?? 0;
  const mouthHeight = clamp01(face.mouthHeight ?? 0.32);
  const extrusion = face.mouthExtrusion ?? 0.2;
  const lipTaper = face.lipTaper ?? 0.5;
  const lipRingStart = addRing(positions, createHeadRing({
    x: face.x - lerp(0.004, 0.06, extrusion),
    y: face.y + face.thickness * 0.02,
    z: face.z,
    width: face.width * 0.98,
    thickness: Math.min(face.thickness * 0.96, face.thickness * lerp(0.18, 0.72, mouthHeight)),
    mouthHeight: face.mouthHeight,
    mouthWidth: face.mouthWidth,
    mouthExtrusion: face.mouthExtrusion,
    lipTaper: face.lipTaper,
    snoutTaper: face.snoutTaper,
  }, "front"));
  const maxLipHalfHeight = face.thickness * lerp(0.16, 0.64, mouthHeight);
  const lipTopY = face.y + maxLipHalfHeight + face.thickness * mouthOpen * 0.08;
  const lipBottomY = face.y - maxLipHalfHeight - face.thickness * mouthOpen * 0.18;
  const lipSideY = face.y - maxLipHalfHeight * lerp(0.14, 0.46, mouthOpen);
  positions[lipRingStart * 3 + 1] = lipTopY;
  positions[(lipRingStart + 3) * 3 + 1] = lipBottomY;
  positions[(lipRingStart + 2) * 3 + 1] = lipSideY;
  positions[(lipRingStart + 4) * 3 + 1] = lipSideY;
  positions[(lipRingStart + 1) * 3 + 2] *= lerp(1.02, 0.54, lipTaper);
  positions[(lipRingStart + 5) * 3 + 2] *= lerp(1.02, 0.54, lipTaper);
  positions[(lipRingStart + 2) * 3 + 2] *= lerp(1.0, 0.62, lipTaper);
  positions[(lipRingStart + 4) * 3 + 2] *= lerp(1.0, 0.62, lipTaper);
  const faceTopY = positions[firstRingStart * 3 + 1];
  const faceBottomY = positions[(firstRingStart + 3) * 3 + 1];
  positions[lipRingStart * 3 + 1] = Math.min(positions[lipRingStart * 3 + 1], faceTopY - face.thickness * 0.01);
  positions[(lipRingStart + 3) * 3 + 1] = Math.max(positions[(lipRingStart + 3) * 3 + 1], faceBottomY + face.thickness * 0.01);
  connectRings(indices, lipRingStart, firstRingStart);
  addInsetMouthCavity(positions, indices, lipRingStart, face);
}

function addTailBridge(positions, indices, lastRingStart, stations) {
  const tipTop = addVertex(positions, {
    x: stations[stations.length - 1].x + 0.08,
    y: stations[stations.length - 1].thickness * 0.24,
    z: stations[stations.length - 1].z,
  });
  const tipBottom = addVertex(positions, {
    x: stations[stations.length - 1].x + 0.06,
    y: -stations[stations.length - 1].thickness * 0.24,
    z: stations[stations.length - 1].z,
  });
  pushTriangle(indices, lastRingStart + 0, lastRingStart + 1, tipTop);
  pushTriangle(indices, lastRingStart + 5, lastRingStart + 0, tipTop);
  pushTriangle(indices, tipBottom, lastRingStart + 2, lastRingStart + 3);
  pushTriangle(indices, tipBottom, lastRingStart + 3, lastRingStart + 4);
  pushQuad(indices, tipTop, tipBottom, lastRingStart + 2, lastRingStart + 1);
  pushQuad(indices, tipTop, lastRingStart + 5, lastRingStart + 4, tipBottom);
}

function addRibbonFin(positions, indices, points, thicknesses) {
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
}

function addDorsalFin(positions, indices, stations, config) {
  const front = stations[2];
  const back = stations[4];
  const lift = config.fins.dorsalSize * 0.22;
  const round = lerp(0.18, 0.72, config.fins.dorsalRoundness ?? config.fins.finRoundness);
  addRibbonFin(
    positions,
    indices,
    [
      { x: front.x + 0.02, y: front.thickness * 0.7, z: front.z },
      { x: lerp(front.x, back.x, lerp(0.2, 0.32, round)), y: lift * (0.56 + round * 0.28), z: lerp(front.z, back.z, 0.28) },
      { x: lerp(front.x, back.x, lerp(0.72, 0.5, round)), y: lift * (0.72 + round * 0.34), z: lerp(front.z, back.z, 0.64) },
      { x: back.x, y: back.thickness * 0.52, z: back.z },
      { x: lerp(front.x, back.x, 0.72), y: lift * (0.18 + round * 0.26), z: lerp(front.z, back.z, 0.72) },
      { x: lerp(front.x, back.x, 0.18), y: lift * (0.08 + round * 0.24), z: lerp(front.z, back.z, 0.18) },
    ],
    [0.02, 0.028, 0.032, 0.02, 0.016, 0.016],
  );
}

function addPectoralFins(positions, indices, stations, config) {
  const root = stations[2];
  const sweep = config.body.bodyLength * 0.16;
  const reach = config.fins.pectoralSize * lerp(0.14, 0.28, config.fins.finSpread);
  const thickness = 0.02 + config.fins.pectoralSize * 0.018;
  const rootWidth = root.width;
  const round = lerp(0.14, 0.62, config.fins.pectoralRoundness ?? config.fins.finRoundness);
  const tipPull = lerp(1.0, 0.42, round);
  const sideBulge = lerp(0.12, 0.62, round);
  const rootWrap = lerp(0.44, 0.68, round);
  const tipDip = lerp(0.014, 0.042, round);

  addRibbonFin(
    positions,
    indices,
    [
      { x: root.x - 0.04, y: -0.01, z: root.z + rootWidth * rootWrap },
      { x: root.x + 0.03, y: -0.012, z: root.z + rootWidth * lerp(0.74, 0.58, round) },
      { x: root.x + sweep * 0.42, y: -0.016, z: root.z + rootWidth + reach * sideBulge },
      { x: root.x + sweep * tipPull, y: -tipDip, z: root.z + rootWidth + reach },
      { x: root.x + sweep * 0.66, y: -tipDip * 1.24, z: root.z + rootWidth + reach * sideBulge * 0.86 },
      { x: root.x + sweep * 0.22, y: -0.02, z: root.z + rootWidth * lerp(0.72, 0.6, round) },
    ],
    [thickness * 0.84, thickness, thickness * 0.78, thickness * 0.5, thickness * 0.4, thickness * 0.56],
  );

  addRibbonFin(
    positions,
    indices,
    [
      { x: root.x - 0.04, y: -0.01, z: root.z - rootWidth * rootWrap },
      { x: root.x + 0.03, y: -0.012, z: root.z - rootWidth * lerp(0.74, 0.58, round) },
      { x: root.x + sweep * 0.42, y: -0.016, z: root.z - rootWidth - reach * sideBulge },
      { x: root.x + sweep * tipPull, y: -tipDip, z: root.z - rootWidth - reach },
      { x: root.x + sweep * 0.66, y: -tipDip * 1.24, z: root.z - rootWidth - reach * sideBulge * 0.86 },
      { x: root.x + sweep * 0.22, y: -0.02, z: root.z - rootWidth * lerp(0.72, 0.6, round) },
    ],
    [thickness * 0.84, thickness, thickness * 0.78, thickness * 0.5, thickness * 0.4, thickness * 0.56],
  );
}

function addPelvicAndAnalFins(positions, indices, stations, config) {
  const pelvic = stations[4];
  const anal = stations[5];
  const thickness = 0.018 + config.fins.pelvicSize * 0.016;

  addRibbonFin(
    positions,
    indices,
    [
      { x: pelvic.x - 0.03, y: -0.03, z: pelvic.z + pelvic.width * 0.24 },
      { x: pelvic.x + 0.04, y: -0.04, z: pelvic.z + pelvic.width * 0.36 },
      { x: pelvic.x + 0.08, y: -0.065, z: pelvic.z + pelvic.width * 0.06 },
      { x: pelvic.x + 0.04, y: -0.05, z: pelvic.z + pelvic.width * 0.02 },
    ],
    [thickness, thickness * 0.82, thickness * 0.56, thickness * 0.48],
  );

  addRibbonFin(
    positions,
    indices,
    [
      { x: anal.x - 0.02, y: -0.03, z: anal.z - anal.width * 0.18 },
      { x: anal.x + 0.1, y: -0.05, z: anal.z - anal.width * 0.02 },
      { x: anal.x + 0.12, y: -0.07, z: anal.z - anal.width * 0.14 },
      { x: anal.x + 0.06, y: -0.055, z: anal.z - anal.width * 0.22 },
    ],
    [thickness, thickness * 0.8, thickness * 0.52, thickness * 0.44],
  );
}

function addTwinTail(positions, indices, stations, config) {
  const base = stations[7];
  const tailLength = config.body.tailLength * 0.9;
  const fork = config.fins.tailFork ?? 0.5;
  const spread = config.fins.caudalSize * lerp(0.22, 0.92, fork) * lerp(0.72, 1.1, config.fins.finSpread);
  const thickness = 0.02 + config.fins.caudalSize * 0.028;
  const bend = config.pose.tailCurl * 0.1;

  addRibbonFin(
    positions,
    indices,
    [
      { x: base.x - 0.04, y: 0, z: base.z + base.width * 0.46 },
      { x: base.x + tailLength * 0.18, y: 0.01, z: base.z + base.width * 0.7 + spread * 0.18 },
      { x: base.x + tailLength * 0.56, y: 0.02, z: base.z + spread * 0.72 + bend },
      { x: base.x + tailLength, y: 0, z: base.z + spread * 0.42 + bend },
      { x: base.x + tailLength * 0.68, y: -0.015, z: base.z + spread * 0.2 + bend * 0.7 },
      { x: base.x + tailLength * 0.18, y: -0.01, z: base.z + base.width * 0.16 },
    ],
    [thickness * 0.66, thickness, thickness * 0.94, thickness * 0.44, thickness * 0.34, thickness * 0.44],
  );

  addRibbonFin(
    positions,
    indices,
    [
      { x: base.x - 0.04, y: 0, z: base.z - base.width * 0.46 },
      { x: base.x + tailLength * 0.18, y: 0.01, z: base.z - base.width * 0.7 - spread * 0.18 },
      { x: base.x + tailLength * 0.56, y: 0.02, z: base.z - spread * 0.72 + bend },
      { x: base.x + tailLength, y: 0, z: base.z - spread * 0.42 + bend },
      { x: base.x + tailLength * 0.68, y: -0.015, z: base.z - spread * 0.2 + bend * 0.7 },
      { x: base.x + tailLength * 0.18, y: -0.01, z: base.z - base.width * 0.16 },
    ],
    [thickness * 0.66, thickness, thickness * 0.94, thickness * 0.44, thickness * 0.34, thickness * 0.44],
  );
}

export function createSakanaGeneratorStub() {
  return {
    version: "0.6.2-prototype",
    generate(seed = 1, rawConfig = {}) {
      const { config, issues } = sanitizeSakanaConfig(rawConfig);
      const positions = [];
      const indices = [];

      const stations = buildCanonicalKoiStations(config);
      const ringStarts = stations.map((station, index) => {
        if (station.ring === "head_front") return addRing(positions, createHeadRing(station, "front"));
        if (station.ring === "head_mid") return addRing(positions, createHeadRing(station, "mid"));
        return addRing(positions, createRing(station));
      });
      for (let i = 0; i < ringStarts.length - 1; i += 1) {
        connectRings(indices, ringStarts[i], ringStarts[i + 1]);
      }
      addHeadSection(positions, indices, ringStarts[0], stations);
      addTailBridge(positions, indices, ringStarts[ringStarts.length - 1], stations);
      addDorsalFin(positions, indices, stations, config);
      addPectoralFins(positions, indices, stations, config);
      addPelvicAndAnalFins(positions, indices, stations, config);
      addTwinTail(positions, indices, stations, config);

      const bounds = computeBounds(positions);
      const patternSeed = clamp01((seed % 997) / 997);
      const colors = buildVertexColors(positions, config, seed);

      return {
        seed,
        config,
        status: "prototype",
        mesh: {
          positions,
          indices,
          colors,
        },
        materials: {
          baseColor: config.surface.baseColor,
          secondaryColor: config.surface.secondaryColor,
          accentColor: config.surface.accentColor,
          patternType: config.surface.patternType,
          paletteFamily: config.surface.paletteFamily,
          patternCoverage: config.surface.patternCoverage,
          patternContrast: config.surface.patternContrast,
          patternSeed,
        },
        bounds: {
          center: bounds.center,
          radius: bounds.radius,
        },
        metadata: {
          family: "sakana",
          variant: config.identity.variantCode,
          preset: config.identity.presetCode,
          triangleCount: indices.length / 3,
          vertexCount: positions.length / 3,
          signature: createSignature(
            seed,
            config,
            positions.length,
            indices.length,
          ),
          issues,
        },
      };
    },
  };
}
