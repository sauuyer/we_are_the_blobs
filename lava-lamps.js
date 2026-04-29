/*
  data_driven_lava_lamp_blobs.js

  p5.js lava-lamp relationship visualization driven by conversation_state_timeline.json

  Expected data file:
    conversation_state_timeline.json

  This JSON is produced by conversation_state_engine.py and should be placed in the
  same folder as this sketch, or in the p5 editor's project files.

  If the JSON cannot be loaded, the sketch falls back to demo scenes.
*/

let t = 0;
let timeline = [];
let usingRealData = false;
let currentFrame = 0;
let playbackSpeed = 0.018;
let smoothedState;
let personA = "person_1";
let personB = "person_2";
let labelHold = "loading...";
let lastDataError = "";

const fallbackScenes = [
  {
    label: "warm bid for connection",
    distance: 0.45,
    intimacy: 0.65,
    bigTone: 0.82,
    smallTone: 0.72,
    presenceBig: 0.75,
    presenceSmall: 0.65,
    communicationQuality: 0.8,
    flirt: 0.1,
    pursuitBig: 0.35,
    pursuitSmall: 0.2,
    avoidanceBig: 0.2,
    avoidanceSmall: 0.2,
    activation: 0.45,
    asymmetry: 0.2,
    sexualCharge: 0.1,
    drunkBig: 0,
    drunkSmall: 0
  },
  {
    label: "tender closeness",
    distance: 0.24,
    intimacy: 0.9,
    bigTone: 0.95,
    smallTone: 0.92,
    presenceBig: 0.9,
    presenceSmall: 0.85,
    communicationQuality: 0.9,
    flirt: 0.25,
    pursuitBig: 0.25,
    pursuitSmall: 0.25,
    avoidanceBig: 0.25,
    avoidanceSmall: 0.25,
    activation: 0.4,
    asymmetry: 0.08,
    sexualCharge: 0.2,
    drunkBig: 0,
    drunkSmall: 0
  },
  {
    label: "sexual flirting / permitted contact",
    distance: 0.06,
    intimacy: 0.88,
    bigTone: 0.92,
    smallTone: 0.88,
    presenceBig: 0.95,
    presenceSmall: 0.9,
    communicationQuality: 0.85,
    flirt: 1.0,
    pursuitBig: 0.45,
    pursuitSmall: 0.42,
    avoidanceBig: 0.0,
    avoidanceSmall: 0.0,
    activation: 0.85,
    asymmetry: 0.05,
    sexualCharge: 1.0,
    drunkBig: 0,
    drunkSmall: 0
  },
  {
    label: "avoidance / crescent around closeness",
    distance: 0.18,
    intimacy: 0.55,
    bigTone: 0.22,
    smallTone: 0.72,
    presenceBig: 0.5,
    presenceSmall: 0.75,
    communicationQuality: 0.35,
    flirt: 0.0,
    pursuitBig: 0.05,
    pursuitSmall: 0.18,
    avoidanceBig: 1.0,
    avoidanceSmall: 0.25,
    activation: 0.55,
    asymmetry: 0.65,
    sexualCharge: 0.0,
    drunkBig: 0,
    drunkSmall: 0
  },
  {
    label: "rupture / hurt distance",
    distance: 0.9,
    intimacy: 0.12,
    bigTone: 0.08,
    smallTone: 0.18,
    presenceBig: 0.35,
    presenceSmall: 0.55,
    communicationQuality: 0.12,
    flirt: 0.0,
    pursuitBig: 0.05,
    pursuitSmall: 0.05,
    avoidanceBig: 0.75,
    avoidanceSmall: 0.55,
    activation: 0.2,
    asymmetry: 0.25,
    sexualCharge: 0.0,
    drunkBig: 0,
    drunkSmall: 0
  },
  {
    label: "pursuit after withdrawal",
    distance: 0.78,
    intimacy: 0.38,
    bigTone: 0.58,
    smallTone: 0.24,
    presenceBig: 0.78,
    presenceSmall: 0.45,
    communicationQuality: 0.45,
    flirt: 0.0,
    pursuitBig: 1.0,
    pursuitSmall: 0.08,
    avoidanceBig: 0.15,
    avoidanceSmall: 0.62,
    activation: 0.62,
    asymmetry: 0.8,
    sexualCharge: 0.0,
    drunkBig: 0,
    drunkSmall: 0
  }
];

function preload() {
  loadJSON(
    "conversation_state_timeline.json",
    data => {
      timeline = normalizeTimeline(data);
      usingRealData = timeline.length > 0;
    },
    err => {
      usingRealData = false;
      lastDataError = "No conversation_state_timeline.json loaded; using demo scenes.";
      console.warn(lastDataError, err);
    }
  );
}

function setup() {
  createCanvas(700, 700);
  frameRate(60);
  textFont("Georgia");

  if (usingRealData) {
    detectPeople(timeline[0]);
    smoothedState = stateFromTimelineRow(timeline[0]);
    labelHold = smoothedState.label;
  } else {
    smoothedState = fallbackScenes[0];
    labelHold = smoothedState.label;
  }
}

function draw() {
  background(245);
  t += 0.016 + smoothedState.activation * 0.018;

  const targetState = getTargetState();
  smoothedState = smoothState(smoothedState, targetState, 0.045);

  drawLavaLamp(smoothedState);
  drawLabels(smoothedState);
  drawTimelineProgress();
}

function getTargetState() {
  if (!usingRealData || timeline.length === 0) {
    return getFallbackState();
  }

  currentFrame += playbackSpeed;
  if (currentFrame >= timeline.length - 1) {
    currentFrame = 0;
  }

  const i = floor(currentFrame);
  const amt = easeInOut(currentFrame - i);
  const a = stateFromTimelineRow(timeline[i]);
  const b = stateFromTimelineRow(timeline[min(i + 1, timeline.length - 1)]);
  return lerpState(a, b, amt);
}

function getFallbackState() {
  currentFrame += playbackSpeed;
  const sceneProgress = currentFrame % fallbackScenes.length;
  const i = floor(sceneProgress);
  const amt = easeInOut(sceneProgress - i);
  const a = fallbackScenes[i];
  const b = fallbackScenes[(i + 1) % fallbackScenes.length];
  return lerpState(a, b, amt);
}

function normalizeTimeline(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.timeline)) return data.timeline;
  return [];
}

function detectPeople(row) {
  const prefixes = new Set();

  Object.keys(row).forEach(key => {
    const match = key.match(/^(person_\d+|person_\d{3})_/);
    if (match) prefixes.add(match[1]);
  });

  const people = Array.from(prefixes).sort();
  if (people.length >= 2) {
    personA = people[0];
    personB = people[1];
  }
}

function stateFromTimelineRow(row) {
  const a = personA;
  const b = personB;

  const aWarmth = getNum(row, `${a}_warmth`);
  const bWarmth = getNum(row, `${b}_warmth`);
  const aCoolness = getNum(row, `${a}_coolness`);
  const bCoolness = getNum(row, `${b}_coolness`);

  const aPursuit = getNum(row, `${a}_pursuit`);
  const bPursuit = getNum(row, `${b}_pursuit`);
  const aWithdrawal = getNum(row, `${a}_withdrawal`);
  const bWithdrawal = getNum(row, `${b}_withdrawal`);

  const aVolume = getNum(row, `${a}_communication_volume`);
  const bVolume = getNum(row, `${b}_communication_volume`);
  const aActivation = getNum(row, `${a}_activation`);
  const bActivation = getNum(row, `${b}_activation`);

  const aDrunk = max(
    getNum(row, `${a}_drunk`),
    getNum(row, `${a}_drinking`)
  );

  const bDrunk = max(
    getNum(row, `${b}_drunk`),
    getNum(row, `${b}_drinking`)
  );

  const mutualWarmth = getNum(row, "mutual_warmth");
  const mutualIntimacy = getNum(row, "mutual_intimacy");
  const sexualCharge = getNum(row, "sexual_charge");
  const asymmetry = getNum(row, "asymmetry");
  const approachAvoidance = getNum(row, "approach_avoidance", 0.5);

  const labels = String(row.labels || "").split("|").filter(Boolean);
  const label = readableMomentLabel(labels, row);

  return {
    label,
    datetime: row.datetime || "",
    labels,

    distance: constrain(1 - approachAvoidance + asymmetry * 0.22 - mutualWarmth * 0.16, 0.04, 0.96),
    intimacy: constrain(mutualWarmth * 0.52 + mutualIntimacy * 0.48, 0, 1),

    bigTone: constrain(0.42 + aWarmth * 0.58 - aCoolness * 0.48 + sexualCharge * 0.25, 0, 1),
    smallTone: constrain(0.42 + bWarmth * 0.58 - bCoolness * 0.48 + sexualCharge * 0.25, 0, 1),

    presenceBig: constrain(0.45 + aVolume * 0.55, 0, 1),
    presenceSmall: constrain(0.45 + bVolume * 0.55, 0, 1),
    communicationQuality: constrain(0.25 + mutualWarmth * 0.5 + (aVolume + bVolume) * 0.16, 0, 1),

    flirt: constrain(sexualCharge, 0, 1),
    sexualCharge,

    pursuitBig: constrain(aPursuit, 0, 1),
    pursuitSmall: constrain(bPursuit, 0, 1),
    avoidanceBig: constrain(aWithdrawal + aCoolness * 0.35, 0, 1),
    avoidanceSmall: constrain(bWithdrawal + bCoolness * 0.35, 0, 1),

    drunkBig: constrain(aDrunk, 0, 1),
    drunkSmall: constrain(bDrunk, 0, 1),

    activation: constrain((aActivation + bActivation) / 2 + asymmetry * 0.25, 0, 1),
    asymmetry,
    sender: row.sender || ""
  };
}

function drawLavaLamp(state) {
  const cx = width / 2;
  const cy = height / 2 + 4;

  const baseR = map(state.communicationQuality, 0, 1, 54, 86);
  const bigR = baseR * map(state.presenceBig, 0, 1, 0.78, 1.28);
  const smallR = baseR * map(state.presenceSmall, 0, 1, 0.78, 1.28);

  const withdrawalDistance =
    max(state.avoidanceBig, state.avoidanceSmall) * 42;

  const distancePush =
    map(state.distance, 0, 1, 42, 180) + withdrawalDistance;

  const orbitX = distancePush + state.asymmetry * 26;
  const orbitY = map(state.distance, 0, 1, 26, 112);

  const bigPursuitSpeed = 1 + state.pursuitBig * 1.1;
  const smallPursuitSpeed = 1 + state.pursuitSmall * 1.1;

  let big = createVector(
    cx + cos(t * 0.42 * bigPursuitSpeed + PI) * orbitX * 0.33,
    cy + sin(t * 0.66) * orbitY * 0.28
  );

  let small = createVector(
    cx + cos(t * smallPursuitSpeed) * orbitX,
    cy + sin(t * 1.18) * orbitY
  );

  applyAvoidance(big, small, bigR, smallR, state.avoidanceBig, true);
  applyAvoidance(small, big, smallR, bigR, state.avoidanceSmall, false);

  applyPursuit(big, small, state.pursuitBig, state.flirt);
  applyPursuit(small, big, state.pursuitSmall, state.flirt);

  enforceNoTouch(big, small, bigR, smallR, state);

  const bigColor = emotionalColor(state.bigTone, state.intimacy, state.sexualCharge);
  const smallColor = emotionalColor(state.smallTone, state.intimacy, state.sexualCharge);

  bigColor.setAlpha(map(state.drunkBig || 0, 0, 1, 255, 150));
  smallColor.setAlpha(map(state.drunkSmall || 0, 0, 1, 255, 150));

  drawGlow(big, bigR, bigColor, state);
  drawGlow(small, smallR, smallColor, state);

  drawBlob(big.x, big.y, bigR, small, true, bigColor, {
    ...state,
    pursuit: state.pursuitBig,
    avoidance: state.avoidanceBig
  });

  drawBlob(small.x, small.y, smallR, big, false, smallColor, {
    ...state,
    pursuit: state.pursuitSmall,
    avoidance: state.avoidanceSmall
  });

  if (state.flirt > 0.72) {
    drawSoftContact(big, small, bigR, smallR, state, bigColor, smallColor);
  }
}

function applyAvoidance(self, other, selfR, otherR, avoidance, isBig) {
  const away = p5.Vector.sub(self, other);
  const d = max(away.mag(), 0.001);
  away.normalize();

  const closeness = constrain(map(d, selfR + otherR + 90, selfR + otherR + 8, 0, 1), 0, 1);
  const sidestep = createVector(-away.y, away.x);
  const crescentBias = isBig ? 1 : -1;

  self.add(away.mult(closeness * avoidance * 22));
  self.add(sidestep.mult(closeness * avoidance * 18 * crescentBias));
}

function applyPursuit(self, other, pursuit, flirt) {
  const toward = p5.Vector.sub(other, self);
  const d = max(toward.mag(), 0.001);
  toward.normalize();

  const allowedPull = pursuit * (flirt > 0.72 ? 16 : 8);
  const farness = constrain(map(d, 40, 210, 0, 1), 0, 1);
  self.add(toward.mult(allowedPull * farness));
}

function enforceNoTouch(big, small, bigR, smallR, state) {
  if (state.flirt > 0.72) return;

  const minGap = 10 + state.asymmetry * 8;
  const minDist = bigR + smallR + minGap;
  const actualDist = p5.Vector.dist(big, small);

  if (actualDist < minDist) {
    const push = p5.Vector.sub(small, big).normalize();
    const needed = minDist - actualDist;
    small.add(push.mult(needed));
  }
}

function drawBlob(x, y, r, other, isBig, c, state) {
  push();
  translate(x, y);
  noStroke();
  fill(c);

  beginShape();

  const points = 96;
  for (let i = 0; i < points; i++) {
    const a = map(i, 0, points, 0, TWO_PI);

    const drunkFactor = isBig ? state.drunkBig || 0 : state.drunkSmall || 0;

    const agitation =
      0.6 +
      state.activation * 1.2 -
      drunkFactor * 0.15;

    const wobble =
      sin(a * 3 + frameCount * 0.025 * agitation) * r * 0.04 +
      sin(a * 5 + frameCount * 0.015 * agitation) * r * 0.025 +
      sin(a * 8 + frameCount * 0.011) * r * 0.01 * state.asymmetry;

    const drunkMelt =
      sin(a * 2 + frameCount * 0.012) *
      r *
      0.045 *
      drunkFactor;

    const toOther = createVector(other.x - x, other.y - y);
    const angleToOther = atan2(toOther.y, toOther.x);
    const dist = toOther.mag();
    const diff = atan2(sin(a - angleToOther), cos(a - angleToOther));

    const closeness = constrain(map(dist, r * 3.1, r * 1.05, 0, 1), 0, 1);
    const farReach = constrain(map(dist, r * 1.7, r * 3.9, 0, 1), 0, 1);

    let deform = 0;

    deform +=
      -exp(-pow(diff, 2) * 4.2) *
      r *
      0.54 *
      closeness *
      state.avoidance;

    deform +=
      exp(-pow(abs(diff) - 1.12, 2) * 7) *
      r *
      0.24 *
      closeness *
      state.avoidance;

    deform +=
      exp(-pow(diff, 2) * 18) *
      r *
      0.58 *
      farReach *
      state.pursuit;

    deform +=
      exp(-pow(diff, 2) * 12) *
      r *
      0.18 *
      state.intimacy *
      (1 - state.avoidance);

    deform +=
      exp(-pow(diff, 2) * 20) *
      r *
      0.42 *
      state.flirt;

    const rr = max(8, r + wobble + deform + drunkMelt);
    curveVertex(cos(a) * rr, sin(a) * rr);
  }

  endShape(CLOSE);
  pop();
}

function drawGlow(pos, r, c, state) {
  push();
  noStroke();
  const glow = color(red(c), green(c), blue(c), 22 + state.activation * 32);
  fill(glow);
  ellipse(pos.x, pos.y, r * 2.4, r * 2.4);
  pop();
}

function drawSoftContact(big, small, bigR, smallR, state, bigColor, smallColor) {
  const d = p5.Vector.dist(big, small);
  const maxContactDist = bigR + smallR + 20;
  if (d > maxContactDist) return;

  const contactColor = lerpColor(bigColor, smallColor, 0.5);
  contactColor.setAlpha(175);

  const mid = p5.Vector.lerp(big, small, 0.5);

  noStroke();
  fill(contactColor);

  const pulse = sin(frameCount * 0.12) * 5;
  ellipse(mid.x, mid.y, 24 + state.flirt * 38 + pulse, 14 + state.flirt * 22);
}

function emotionalColor(tone, intimacy, sexualCharge) {
  const cold = color(38, 48, 86);
  const cool = color(83, 108, 158);
  const softPink = color(245, 174, 202);
  const warm = color(255, 211, 166);
  const red = color(220, 58, 74);

  let base;
  if (tone < 0.35) {
    base = lerpColor(cold, cool, tone / 0.35);
  } else if (tone < 0.72) {
    base = lerpColor(cool, softPink, map(tone, 0.35, 0.72, 0, 1));
  } else {
    base = lerpColor(softPink, warm, intimacy);
  }

  return lerpColor(base, red, constrain(sexualCharge, 0, 1));
}

function drawLabels(state) {
  fill(35);
  noStroke();
  textAlign(LEFT);

  textSize(14);
  text(state.label, 18, 26);

  textSize(10);
  fill(80);

  if (usingRealData && state.datetime) {
    text(formatDate(state.datetime), 18, 44);
  } else if (lastDataError) {
    text(lastDataError, 18, 44);
  }
}

function drawTimelineProgress() {
  const x = 18;
  const y = height - 10;
  const w = width - 36;
  const h = 3;

  noStroke();
  fill(210);
  rect(x, y, w, h, 20);

  fill(80, 80, 80, 120);
  const denom = usingRealData ? max(1, timeline.length - 1) : fallbackScenes.length;
  const progress = (currentFrame % denom) / denom;
  rect(x, y, w * progress, h, 20);
}

function readableMomentLabel(labels, row) {
  if (!labels || labels.length === 0) return "quiet / low-signal moment";

  if (labels.includes("sexting")) return "sexual flirting / permitted contact";
  if (labels.includes("emotional_intimacy")) return "emotional intimacy";
  if (labels.includes("connection_bid")) return "bid for connection";
  if (labels.includes("dismissal")) return "dismissal / deflection";
  if (labels.includes("withdrawal")) return "withdrawal";
  if (labels.includes("pursuit")) return "pursuit";
  if (labels.includes("timing_repeated_send")) return "repeated send / pursuit signal";
  if (labels.includes("timing_delay")) return "delay / distance opens";
  if (labels.includes("timing_long_gap_return")) return "return after long gap";
  if (labels.includes("timing_fast_reply")) return "fast reply / active exchange";
  if (labels.includes("timing_initiation")) return "new initiation after gap";

  return labels[0].replaceAll("_", " ");
}

function lerpState(a, b, amt) {
  const out = { ...a };
  const keys = [
    "distance",
    "intimacy",
    "bigTone",
    "smallTone",
    "presenceBig",
    "presenceSmall",
    "communicationQuality",
    "flirt",
    "pursuitBig",
    "pursuitSmall",
    "avoidanceBig",
    "avoidanceSmall",
    "activation",
    "asymmetry",
    "sexualCharge",
    "drunkBig",
    "drunkSmall"
  ];

  keys.forEach(key => {
    out[key] = lerp(a[key] || 0, b[key] || 0, amt);
  });

  out.label = amt < 0.5 ? a.label : b.label;
  out.datetime = amt < 0.5 ? a.datetime : b.datetime;
  out.labels = amt < 0.5 ? a.labels : b.labels;
  out.sender = amt < 0.5 ? a.sender : b.sender;

  return out;
}

function smoothState(current, target, amt) {
  if (!current) return target;
  return lerpState(current, target, amt);
}

function getNum(row, key, fallback = 0) {
  const value = Number(row[key]);
  return Number.isFinite(value) ? constrain(value, 0, 1) : fallback;
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2;
}