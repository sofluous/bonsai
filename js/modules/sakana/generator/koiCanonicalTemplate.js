const CANONICAL_KOI_STATIONS = Object.freeze([
  Object.freeze({ id: "head_lip", z: 0.03, width: 0.18, height: 0.34, y: 0.035, ring: "head_front" }),
  Object.freeze({ id: "head_face", z: 0.08, width: 0.24, height: 0.35, y: 0.05, ring: "head_front" }),
  Object.freeze({ id: "head_cheek", z: 0.16, width: 0.31, height: 0.34, y: 0.055, ring: "head_mid" }),
  Object.freeze({ id: "shoulder", z: 0.31, width: 0.45, height: 0.4, y: 0.04, ring: "body_round" }),
  Object.freeze({ id: "body_front", z: 0.48, width: 0.39, height: 0.37, y: 0.02, ring: "body_round" }),
  Object.freeze({ id: "body_mid", z: 0.63, width: 0.33, height: 0.32, y: 0.0, ring: "body_round" }),
  Object.freeze({ id: "tail_stalk_a", z: 0.79, width: 0.13, height: 0.13, y: -0.008, ring: "tail_stalk" }),
  Object.freeze({ id: "tail_stalk_b", z: 0.9, width: 0.09, height: 0.1, y: -0.015, ring: "tail_stalk" }),
]);

function applyCurve(config, t) {
  const bodyCurve = config.pose.bodyCurve * 0.16;
  const tailCurl = config.pose.tailCurl * 0.18;
  return bodyCurve * Math.sin(t * Math.PI * 1.08) + tailCurl * Math.sin(t * Math.PI * 1.6) * Math.max(0, (t - 0.58) / 0.42);
}

export function buildCanonicalKoiStations(config) {
  const bodyLength = config.body.bodyLength * 2.1;
  const widthScale = config.body.bodyWidth * 1.14;
  const headScale = config.body.headSize * 1.06;
  const heightScale = config.body.bodyDepth * 1.18;
  const tailScale = config.body.tailWidth * 0.92;

  return CANONICAL_KOI_STATIONS.map((station) => {
    const widthScaleForBand =
      station.id.startsWith("head") ? headScale :
      station.id.startsWith("tail") ? tailScale :
      widthScale;
    const x = lerp(-bodyLength * 0.54, bodyLength * 0.66, station.z);
    const z = applyCurve(config, station.z);
    return {
      id: station.id,
      ring: station.ring,
      x,
      z,
      width: station.width * widthScaleForBand,
      thickness: station.height * heightScale,
      y: station.y * heightScale,
      t: station.z,
      mouthOpen: config.pose?.mouthOpen ?? 0,
      mouthHeight: config.pose?.mouthHeight ?? 0.32,
      mouthWidth: config.pose?.mouthWidth ?? 0.3,
      mouthExtrusion: config.pose?.mouthExtrusion ?? 0.2,
      lipTaper: config.pose?.lipTaper ?? 0.5,
      snoutTaper: config.pose?.snoutTaper ?? 0.45,
    };
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
