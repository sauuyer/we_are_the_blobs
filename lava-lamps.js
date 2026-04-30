/*
  data_driven_lava_lamp_blobs.js

  p5.js lava-lamp relationship visualization driven by conversation_state_timeline.json

  Updated:
  - Blob A = person_1
  - Blob B = person_2
  - Per-person color, pursuit, avoidance, drinking, presence
  - Keeps original lava-lamp / crescent / no-touch behavior
*/

let t = 0;
let timeline = [];
let usingRealData = false;
let currentFrame = 0;
let playbackSpeed = 0.012;
let smoothedState;

let personA = "person_1";
let personB = "person_2";

let labelHold = "loading...";
let lastDataError = "";

let SHOW_PERSON_LABELS = false;

// Recorder
let recordingPlaybackSpeed = 0.12;
let recorder;
let recordedChunks = [];
let recording = false;
let recordingStartFrame = 0;

// Smoothed color memory
let smoothedColorA;
let smoothedColorB;

const fallbackScenes = [
  {
    label: "warm bid for connection",
    distance: 0.45,
    intimacy: 0.65,
    toneA: 0.82,
    toneB: 0.72,
    warmthA: 0.72,
    warmthB: 0.62,
    coolnessA: 0.05,
    coolnessB: 0.08,
    presenceA: 0.75,
    presenceB: 0.65,
    communicationQuality: 0.8,
    flirt: 0.1,
    flirtA: 0.1,
    flirtB: 0.05,
    pursuitA: 0.35,
    pursuitB: 0.2,
    avoidanceA: 0.2,
    avoidanceB: 0.2,
    activation: 0.45,
    asymmetry: 0.2,
    sexualCharge: 0.1,
    sexualChargeA: 0.08,
    sexualChargeB: 0.04,
    drunkA: 0,
    drunkB: 0
  },
  {
    label: "tender closeness",
    distance: 0.24,
    intimacy: 0.9,
    toneA: 0.95,
    toneB: 0.92,
    warmthA: 0.9,
    warmthB: 0.86,
    coolnessA: 0.02,
    coolnessB: 0.02,
    presenceA: 0.9,
    presenceB: 0.85,
    communicationQuality: 0.9,
    flirt: 0.25,
    flirtA: 0.24,
    flirtB: 0.2,
    pursuitA: 0.25,
    pursuitB: 0.25,
    avoidanceA: 0.25,
    avoidanceB: 0.25,
    activation: 0.4,
    asymmetry: 0.08,
    sexualCharge: 0.2,
    sexualChargeA: 0.14,
    sexualChargeB: 0.16,
    drunkA: 0,
    drunkB: 0
  },
  {
    label: "sexual flirting / permitted contact",
    distance: 0.06,
    intimacy: 0.88,
    toneA: 0.92,
    toneB: 0.88,
    warmthA: 0.82,
    warmthB: 0.8,
    coolnessA: 0,
    coolnessB: 0,
    presenceA: 0.95,
    presenceB: 0.9,
    communicationQuality: 0.85,
    flirt: 1.0,
    flirtA: 1.0,
    flirtB: 0.85,
    pursuitA: 0.45,
    pursuitB: 0.42,
    avoidanceA: 0.0,
    avoidanceB: 0.0,
    activation: 0.85,
    asymmetry: 0.05,
    sexualCharge: 1.0,
    sexualChargeA: 1.0,
    sexualChargeB: 0.8,
    drunkA: 0,
    drunkB: 0
  },
  {
    label: "avoidance / crescent around closeness",
    distance: 0.18,
    intimacy: 0.55,
    toneA: 0.22,
    toneB: 0.72,
    warmthA: 0.18,
    warmthB: 0.65,
    coolnessA: 0.72,
    coolnessB: 0.18,
    presenceA: 0.5,
    presenceB: 0.75,
    communicationQuality: 0.35,
    flirt: 0.0,
    flirtA: 0.0,
    flirtB: 0.0,
    pursuitA: 0.05,
    pursuitB: 0.18,
    avoidanceA: 1.0,
    avoidanceB: 0.25,
    activation: 0.55,
    asymmetry: 0.65,
    sexualCharge: 0.0,
    sexualChargeA: 0,
    sexualChargeB: 0,
    drunkA: 0,
    drunkB: 0
  },
  {
    label: "rupture / hurt distance",
    distance: 0.9,
    intimacy: 0.12,
    toneA: 0.08,
    toneB: 0.18,
    warmthA: 0.05,
    warmthB: 0.12,
    coolnessA: 0.85,
    coolnessB: 0.62,
    presenceA: 0.35,
    presenceB: 0.55,
    communicationQuality: 0.12,
    flirt: 0.0,
    flirtA: 0.0,
    flirtB: 0.0,
    pursuitA: 0.05,
    pursuitB: 0.05,
    avoidanceA: 0.75,
    avoidanceB: 0.55,
    activation: 0.2,
    asymmetry: 0.25,
    sexualCharge: 0.0,
    sexualChargeA: 0,
    sexualChargeB: 0,
    drunkA: 0.8,
    drunkB: 0
  },
  {
    label: "pursuit after withdrawal",
    distance: 0.78,
    intimacy: 0.38,
    toneA: 0.58,
    toneB: 0.24,
    warmthA: 0.55,
    warmthB: 0.2,
    coolnessA: 0.18,
    coolnessB: 0.65,
    presenceA: 0.78,
    presenceB: 0.45,
    communicationQuality: 0.45,
    flirt: 0.0,
    flirtA: 0.0,
    flirtB: 0.0,
    pursuitA: 1.0,
    pursuitB: 0.08,
    avoidanceA: 0.15,
    avoidanceB: 0.62,
    activation: 0.62,
    asymmetry: 0.8,
    sexualCharge: 0.0,
    sexualChargeA: 0,
    sexualChargeB: 0,
    drunkA: 0,
    drunkB: 0
  }
];

function preload() {
  loadJSON(
    "data/textxml/conversation_state_timeline_apr29.json",
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
  createCanvas(900, 900);
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

  t += 0.007 + smoothedState.activation * 0.006;

  const targetState = getTargetState();
  smoothedState = smoothState(smoothedState, targetState, 0.026);

  drawLavaLamp(smoothedState);
  drawLabels(smoothedState);
  drawTimelineProgress();
  if (recording) {
  fill(0);
  noStroke();
  textSize(12);
  textAlign(RIGHT);

  const percent = floor((currentFrame / max(1, timeline.length - 1)) * 100);
  text(`recording ${min(percent, 100)}%`, width - 18, 20);

  if (usingRealData && currentFrame >= timeline.length - 2) {
    stopRecording();
  }
}
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

  if (people.includes("person_1")) personA = "person_1";
  if (people.includes("person_2")) personB = "person_2";

  if (!people.includes("person_1") || !people.includes("person_2")) {
    if (people.length >= 2) {
      personA = people[0];
      personB = people[1];
    }
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

  const aSexting = getNum(row, `${a}_sexting`);
  const bSexting = getNum(row, `${b}_sexting`);
  const aConnectionBid = getNum(row, `${a}_connection_bid`);
  const bConnectionBid = getNum(row, `${b}_connection_bid`);
  const aEmotionalIntimacy = getNum(row, `${a}_emotional_intimacy`);
  const bEmotionalIntimacy = getNum(row, `${b}_emotional_intimacy`);

  const aDrunk = max(getNum(row, `${a}_drunk`), getNum(row, `${a}_drinking`));
  const bDrunk = max(getNum(row, `${b}_drunk`), getNum(row, `${b}_drinking`));

  const mutualWarmth = getNum(row, "mutual_warmth");
  const mutualIntimacy = getNum(row, "mutual_intimacy");
  const asymmetry = getNum(row, "asymmetry");
  const approachAvoidance = getNum(row, "approach_avoidance", 0.5);

  const sexualChargeA = constrain(aSexting, 0, 1);
  const sexualChargeB = constrain(bSexting, 0, 1);
  const sexualCharge = constrain((sexualChargeA + sexualChargeB) / 2, 0, 1);

  const flirtA = constrain(
    max(aSexting, aConnectionBid * 0.25, aEmotionalIntimacy * 0.2),
    0,
    1
  );

  const flirtB = constrain(
    max(bSexting, bConnectionBid * 0.25, bEmotionalIntimacy * 0.2),
    0,
    1
  );

  const flirt = constrain(max(sexualCharge, mutualWarmth * 0.45), 0, 1);

  const labels = String(row.labels || "").split("|").filter(Boolean);
  const label = readableMomentLabel(labels, row);

  return {
    label,
    datetime: row.datetime || "",
    labels,
    sender: row.sender || "",

    distance: constrain(
      1 - approachAvoidance + asymmetry * 0.22 - mutualWarmth * 0.16,
      0.04,
      0.96
    ),

    intimacy: constrain(mutualWarmth * 0.52 + mutualIntimacy * 0.48, 0, 1),

    warmthA: constrain(aWarmth, 0, 1),
    warmthB: constrain(bWarmth, 0, 1),
    coolnessA: constrain(aCoolness, 0, 1),
    coolnessB: constrain(bCoolness, 0, 1),

    toneA: constrain(
      0.42 + aWarmth * 0.58 - aCoolness * 0.48 + sexualChargeA * 0.25,
      0,
      1
    ),

    toneB: constrain(
      0.42 + bWarmth * 0.58 - bCoolness * 0.48 + sexualChargeB * 0.25,
      0,
      1
    ),

    presenceA: constrain(0.45 + aVolume * 0.55, 0, 1),
    presenceB: constrain(0.45 + bVolume * 0.55, 0, 1),

    communicationQuality: constrain(
      0.25 + mutualWarmth * 0.5 + (aVolume + bVolume) * 0.16,
      0,
      1
    ),

    flirt,
    flirtA,
    flirtB,

    sexualCharge,
    sexualChargeA,
    sexualChargeB,

    pursuitA: constrain(aPursuit, 0, 1),
    pursuitB: constrain(bPursuit, 0, 1),

    avoidanceA: constrain(aWithdrawal + aCoolness * 0.35, 0, 1),
    avoidanceB: constrain(bWithdrawal + bCoolness * 0.35, 0, 1),

    drunkA: constrain(aDrunk, 0, 1),
    drunkB: constrain(bDrunk, 0, 1),

    activation: constrain((aActivation + bActivation) / 2 + asymmetry * 0.25, 0, 1),
    asymmetry
  };
}

function drawLavaLamp(state) {
  const cx = width / 2;
  const cy = height / 2 + 4;

  const baseR = map(state.communicationQuality, 0, 1, 54, 86);
  const rA = baseR * map(state.presenceA, 0, 1, 0.78, 1.28);
  const rB = baseR * map(state.presenceB, 0, 1, 0.78, 1.28);

  const withdrawalDistance = max(state.avoidanceA, state.avoidanceB) * 72;

  const distancePush =
    map(state.distance, 0, 1, 42, 205) + withdrawalDistance;

  const orbitX = distancePush + state.asymmetry * 34;
  const orbitY = map(state.distance, 0, 1, 26, 120);

  const pursuitSpeedA = 1 + state.pursuitA * 1.08;
  const pursuitSpeedB = 1 + state.pursuitB * 1.08;

  const lagA = map(state.drunkA || 0, 0, 1, 1, 0.72);
  const lagB = map(state.drunkB || 0, 0, 1, 1, 0.72);

  let blobA = createVector(
    cx + cos(t * 0.34 * pursuitSpeedA * lagA + 2.65) * orbitX * 0.52,
    cy + sin(t * 0.53 * lagA + 0.4) * orbitY * 0.42
  );

  let blobB = createVector(
    cx + cos(t * 0.82 * pursuitSpeedB * lagB + 5.1) * orbitX * 0.95,
    cy + sin(t * 0.93 * lagB + 1.45) * orbitY * 0.88
  );

  const driftA = state.drunkA || 0;
  const driftB = state.drunkB || 0;

  blobA.x += sin(t * 0.28 + 1.7) * 18 * driftA;
  blobA.y += cos(t * 0.22 + 0.6) * 14 * driftA;

  blobB.x += sin(t * 0.31 + 2.4) * 18 * driftB;
  blobB.y += cos(t * 0.23 + 1.2) * 14 * driftB;

  applyAvoidance(blobA, blobB, rA, rB, state.avoidanceA, true);
  applyAvoidance(blobB, blobA, rB, rA, state.avoidanceB, false);

  applyPursuit(blobA, blobB, state.pursuitA, state.flirt);
  applyPursuit(blobB, blobA, state.pursuitB, state.flirt);

  enforceNoTouch(blobA, blobB, rA, rB, state);

  const targetColorA = emotionalColor(
    state.warmthA,
    state.coolnessA,
    state.flirtA,
    state.sexualChargeA
  );

  const targetColorB = emotionalColor(
    state.warmthB,
    state.coolnessB,
    state.flirtB,
    state.sexualChargeB
  );

  if (!smoothedColorA) smoothedColorA = targetColorA;
  if (!smoothedColorB) smoothedColorB = targetColorB;

  smoothedColorA = lerpColor(smoothedColorA, targetColorA, 0.025);
  smoothedColorB = lerpColor(smoothedColorB, targetColorB, 0.025);

  drawGlow(blobA, rA, smoothedColorA, state, state.drunkA || 0);
  drawGlow(blobB, rB, smoothedColorB, state, state.drunkB || 0);

  drawBlob(blobA.x, blobA.y, rA, blobB, true, smoothedColorA, {
    ...state,
    pursuit: state.pursuitA,
    avoidance: state.avoidanceA,
    drunkLocal: state.drunkA,
    flirtLocal: state.flirtA
  });

  drawBlob(blobB.x, blobB.y, rB, blobA, false, smoothedColorB, {
    ...state,
    pursuit: state.pursuitB,
    avoidance: state.avoidanceB,
    drunkLocal: state.drunkB,
    flirtLocal: state.flirtB
  });

  if (state.flirt > 0.72 || state.sexualCharge > 0.72) {
    drawSoftContact(blobA, blobB, rA, rB, state, smoothedColorA, smoothedColorB);
  }

  if (SHOW_PERSON_LABELS) {
    drawPersonLabels(blobA, blobB);
  }
}

function applyAvoidance(self, other, selfR, otherR, avoidance, isA) {
  const away = p5.Vector.sub(self, other);
  const d = max(away.mag(), 0.001);
  away.normalize();

  const closeness = constrain(
    map(d, selfR + otherR + 115, selfR + otherR + 8, 0, 1),
    0,
    1
  );

  const sidestep = createVector(-away.y, away.x);
  const crescentBias = isA ? 1 : -1;

  self.add(away.mult(closeness * avoidance * 26));
  self.add(sidestep.mult(closeness * avoidance * 19 * crescentBias));
}

function applyPursuit(self, other, pursuit, flirt) {
  const toward = p5.Vector.sub(other, self);
  const d = max(toward.mag(), 0.001);
  toward.normalize();

  const allowedPull = pursuit * (flirt > 0.72 ? 15 : 9);
  const farness = constrain(map(d, 40, 240, 0, 1), 0, 1);

  self.add(toward.mult(allowedPull * farness));
}

function enforceNoTouch(blobA, blobB, rA, rB, state) {
  if (state.flirt > 0.72 || state.sexualCharge > 0.72) return;

  const minGap =
    12 +
    state.asymmetry * 12 +
    max(state.avoidanceA, state.avoidanceB) * 12;

  const minDist = rA + rB + minGap;
  const actualDist = p5.Vector.dist(blobA, blobB);

  if (actualDist < minDist) {
    const push = p5.Vector.sub(blobB, blobA).normalize();
    const needed = minDist - actualDist;
    blobB.add(push.mult(needed));
  }
}

function drawBlob(x, y, r, other, isA, c, state) {
  push();
  translate(x, y);
  noStroke();
  fill(c);

  beginShape();

  const points = 96;

  for (let i = 0; i < points; i++) {
    const a = map(i, 0, points, 0, TWO_PI);

    const drunkFactor = state.drunkLocal || 0;

    const agitation =
      0.52 +
      state.activation * 0.95 -
      drunkFactor * 0.2;

    const wobble =
      sin(a * 3 + frameCount * 0.018 * agitation) * r * 0.04 +
      sin(a * 5 + frameCount * 0.011 * agitation) * r * 0.025 +
      sin(a * 8 + frameCount * 0.008) * r * 0.01 * state.asymmetry;

    const drunkMelt =
      sin(a * 2 + frameCount * 0.007) *
      r *
      0.075 *
      drunkFactor;

    const drunkSlosh =
      sin(a + frameCount * 0.005 + cos(frameCount * 0.004)) *
      r *
      0.045 *
      drunkFactor;

    const toOther = createVector(other.x - x, other.y - y);
    const angleToOther = atan2(toOther.y, toOther.x);
    const dist = toOther.mag();
    const diff = atan2(sin(a - angleToOther), cos(a - angleToOther));

    const closeness = constrain(map(dist, r * 3.3, r * 1.05, 0, 1), 0, 1);
    const farReach = constrain(map(dist, r * 1.45, r * 4.25, 0, 1), 0, 1);

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
      0.86 *
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
      state.flirtLocal;

    const rr = max(8, r + wobble + deform + drunkMelt + drunkSlosh);
    curveVertex(cos(a) * rr, sin(a) * rr);
  }

  endShape(CLOSE);
  pop();
}

function drawGlow(pos, r, c, state, drunkFactor = 0) {
  push();
  noStroke();

  const glowSize =
    r *
    (2.4 + drunkFactor * 1.35);

  const glowAlpha =
    18 +
    state.activation * 24 -
    drunkFactor * 5;

  const glow = color(
    red(c),
    green(c),
    blue(c),
    constrain(glowAlpha, 10, 48)
  );

  fill(glow);
  ellipse(pos.x, pos.y, glowSize, glowSize);
  pop();
}

function drawSoftContact(blobA, blobB, rA, rB, state, colorA, colorB) {
  const d = p5.Vector.dist(blobA, blobB);
  const maxContactDist = rA + rB + 20;
  if (d > maxContactDist) return;

  const contactColor = lerpColor(colorA, colorB, 0.5);
  contactColor.setAlpha(175);

  const mid = p5.Vector.lerp(blobA, blobB, 0.5);

  noStroke();
  fill(contactColor);

  const pulse = sin(frameCount * 0.08) * 5;
  ellipse(mid.x, mid.y, 24 + state.flirt * 38 + pulse, 14 + state.flirt * 22);
}

function emotionalColor(warmth, coolness, flirt, sexualCharge) {
  const deepCool = color(28, 38, 88);
  const lightCool = color(135, 172, 222);
  const neutral = color(190, 198, 205);
  const warmOrange = color(255, 172, 91);
  const flirtyPink = color(248, 145, 190);
  const sexualPink = color(196, 45, 126);

  let base;

  if (coolness > warmth && coolness > 0.08) {
    base = lerpColor(lightCool, deepCool, constrain(coolness, 0, 1));
  } else {
    base = lerpColor(neutral, warmOrange, constrain(warmth, 0, 1));
  }

  base = lerpColor(base, flirtyPink, constrain(flirt * 0.75, 0, 1));
  base = lerpColor(base, sexualPink, constrain(sexualCharge, 0, 1));

  return base;
}

function drawLabels(state) {
  const label = state.label || "";

  if (!label || label === "conversation begins") return;

  fill(35);
  noStroke();
  textAlign(LEFT);

  textSize(14);
  text(label, 18, 26);

  if (state.datetime) {
    textSize(11);
    fill(70);
    text(formatDate(state.datetime), 18, 43);
  }
}

function drawPersonLabels(blobA, blobB) {
  push();
  textAlign(CENTER);
  textSize(12);
  noStroke();
  rectMode(CENTER);

  fill(255, 255, 255, 185);
  const labelA = personA;
  const wA = textWidth(labelA) + 12;
  rect(blobA.x, blobA.y - 32, wA, 18, 6);

  fill(30);
  text(labelA, blobA.x, blobA.y - 28);

  fill(255, 255, 255, 185);
  const labelB = personB;
  const wB = textWidth(labelB) + 12;
  rect(blobB.x, blobB.y - 32, wB, 18, 6);

  fill(30);
  text(labelB, blobB.x, blobB.y - 28);

  pop();
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

  if (labels.includes("timing_start")) return "";

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
    "toneA",
    "toneB",
    "warmthA",
    "warmthB",
    "coolnessA",
    "coolnessB",
    "presenceA",
    "presenceB",
    "communicationQuality",
    "flirt",
    "flirtA",
    "flirtB",
    "pursuitA",
    "pursuitB",
    "avoidanceA",
    "avoidanceB",
    "activation",
    "asymmetry",
    "sexualCharge",
    "sexualChargeA",
    "sexualChargeB",
    "drunkA",
    "drunkB"
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

function startRecording() {
  if (recording) return;

  const canvas = document.querySelector("canvas");
  const stream = canvas.captureStream(60);

  recordedChunks = [];

  let options = { mimeType: "video/webm;codecs=vp9" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/webm;codecs=vp8" };
  }

  recorder = new MediaRecorder(stream, options);

  recorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "lava_lamp_blobs.webm";
    a.click();

    URL.revokeObjectURL(url);
  };

  currentFrame = 0;
  playbackSpeed = recordingPlaybackSpeed;
  recordingStartFrame = frameCount;
  recording = true;
  recorder.start();

  console.log("Recording started");
}

function stopRecording() {
  if (!recording) return;

  recording = false;
  playbackSpeed = 0.012;

  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  console.log("Recording stopped");
}

function keyPressed() {
  if (key === "r" || key === "R") startRecording();
  if (key === "s" || key === "S") stopRecording();
}