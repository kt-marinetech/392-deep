<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  gameState: {
    type: String,
    default: 'ROLE_SELECT' // 'ROLE_SELECT' | 'BRIEFING_BASE' | 'BRIEFING_ROLE' | 'PLAYING' | 'COMPLETED'
  },
  briefingStep: {
    type: Number,
    default: 0
  },
  obstacles: {
    type: Array,
    default: () => [] // [{ id, obstacleType, solved }]
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  trapNonce: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['arrived', 'select-lantern']);

const canvasRef = ref(null);
const lanternHotspots = ref([]);
let rafId = null;
let pointerX = -1000;
let pointerY = -1000;
let pointerActive = false;
let reducedMotion = false;

// Lanterns 01..04 sit on the seabed during briefing
const LANTERN_POSITIONS = [0.42, 0.68, 0.94, 1.20];

// Obstacles start at 1.85, 2.85, ..., 7.85; final beacon at 9.05
const OBSTACLE_START_X = 1.85;
const BEACON_WORLD_X = 9.05;

let charWorldX = 0.18;
let targetWorldX = 0.18;
let cameraWorldX = 0;
let targetCameraWorldX = 0;
let waitingArrival = false;

// Trap / impact feedback state
let shakePower = 0;
let dimPower = 0;
let knockbackOffset = 0;
let stumbleTimer = 0;
const siltBurst = [];

const obstacleOpenMap = new Map();
const lanternGlowMap = [0, 0, 0, 0];

function syncTargets(triggerArrival = false) {
  if (props.gameState === 'ROLE_SELECT') {
    targetWorldX = 0.18;
    targetCameraWorldX = 0;
    waitingArrival = false;
  } else if (props.gameState === 'BRIEFING_BASE' || props.gameState === 'BRIEFING_ROLE') {
    const idx = Math.max(0, Math.min(3, props.briefingStep));
    targetWorldX = LANTERN_POSITIONS[idx] - 0.06;
    targetCameraWorldX = 0.02 + idx * 0.04;
    if (triggerArrival) {
      waitingArrival = true;
    }
  } else if (props.gameState === 'PLAYING') {
    const active = props.obstacles[props.currentIndex];
    const obsPos = props.currentIndex + OBSTACLE_START_X;
    targetWorldX = active && active.solved ? obsPos + 0.16 : obsPos - 0.36;
    targetCameraWorldX = Math.max(0.45, obsPos - 0.92);
    if (triggerArrival && !(active && active.solved)) {
      waitingArrival = true;
    }
  } else {
    targetWorldX = BEACON_WORLD_X - 0.42;
    targetCameraWorldX = BEACON_WORLD_X - 1.5;
    waitingArrival = false;
  }

  if (reducedMotion && waitingArrival) {
    charWorldX = targetWorldX;
    cameraWorldX = targetCameraWorldX;
    waitingArrival = false;
    emit('arrived');
  }
}

watch(
  () => [props.gameState, props.briefingStep, props.currentIndex],
  () => {
    syncTargets(true);
  },
  { immediate: true }
);

watch(
  () => props.obstacles.map((o) => o.solved).join(','),
  () => {
    syncTargets(false);
  }
);

watch(
  () => props.trapNonce,
  (val, oldVal) => {
    if (val > 0 && val !== oldVal) {
      if (!reducedMotion) {
        shakePower = 1;
        knockbackOffset = -0.22;
        stumbleTimer = 0.65;
      }
      dimPower = 0.85;
      for (let i = 0; i < 18; i++) {
        siltBurst.push({
          worldOffset: (Math.random() - 0.5) * 0.12,
          yOffset: -Math.random() * 14,
          vx: (Math.random() - 0.65) * 0.008,
          vy: -(0.6 + Math.random() * 1.9),
          r: 1.5 + Math.random() * 3.2,
          life: 1
        });
      }
    }
  }
);

function handlePointerMove(e) {
  pointerX = e.clientX;
  pointerY = e.clientY;
  pointerActive = true;
}

function handlePointerLeave() {
  pointerActive = false;
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

  const particles = Array.from({ length: 78 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.7 + Math.random() * 1.9,
    vy: -(0.0001 + Math.random() * 0.00024),
    vx: (Math.random() - 0.5) * 0.00012,
    ox: 0,
    oy: 0,
    alpha: 0.11 + Math.random() * 0.34,
    phase: i * 0.61
  }));

  // Deep-ocean ambient silhouettes (drawn behind towers, snow, seabed, and text)
  const marineLife = [
    {
      kind: 'school',
      xNorm: 0.74,
      yNorm: 0.62,
      dir: -1,
      speed: 0.018,
      scale: 1,
      alpha: 0.44,
      depth: 0.35,
      phase: 1.2,
      fish: Array.from({ length: 9 }, (_, idx) => ({
        ox: (idx - 4) * 14 + ((idx % 3) - 1) * 7,
        oy: Math.sin(idx * 1.7) * 18,
        size: 8.5 + (idx % 3) * 2.2,
        phase: idx * 0.9
      }))
    },
    {
      kind: 'jelly',
      xNorm: 0.86,
      yNorm: 0.66,
      dir: -1,
      speed: 0.0045,
      riseSpeed: 0.0085,
      scale: 0.95,
      alpha: 0.42,
      depth: 0.25,
      phase: 0.4
    }
  ];

  let nextCreatureTimer = 3.2;
  let nextWhaleTimer = 4.5;

  function spawnCreature(kindOverride) {
    const hasWhale = marineLife.some((c) => c.kind === 'whale');
    const kind =
      kindOverride ||
      (!hasWhale && nextWhaleTimer <= 0
        ? 'whale'
        : ['ray', 'school', 'jelly'][Math.floor(Math.random() * 3)]);

    const dir = Math.random() > 0.5 ? 1 : -1;
    const startX = dir === 1 ? -0.22 : 1.22;

    if (kind === 'whale') {
      nextWhaleTimer = 22 + Math.random() * 14;
      marineLife.push({
        kind: 'whale',
        xNorm: startX,
        yNorm: 0.28 + Math.random() * 0.3,
        dir,
        speed: 0.013 + Math.random() * 0.006,
        scale: 155 + Math.random() * 55,
        alpha: 0.42 + Math.random() * 0.1,
        depth: 0.24,
        phase: Math.random() * Math.PI * 2
      });
    } else if (kind === 'ray') {
      marineLife.push({
        kind: 'ray',
        xNorm: startX,
        yNorm: 0.34 + Math.random() * 0.34,
        dir,
        speed: 0.022 + Math.random() * 0.01,
        scale: 0.9 + Math.random() * 0.35,
        alpha: 0.44 + Math.random() * 0.08,
        depth: 0.32,
        phase: Math.random() * Math.PI * 2
      });
    } else if (kind === 'school') {
      const count = 7 + Math.floor(Math.random() * 5);
      marineLife.push({
        kind: 'school',
        xNorm: dir === 1 ? -0.16 : 1.16,
        yNorm: 0.44 + Math.random() * 0.26,
        dir,
        speed: 0.018 + Math.random() * 0.01,
        scale: 0.85 + Math.random() * 0.3,
        alpha: 0.44,
        depth: 0.38,
        phase: Math.random() * Math.PI * 2,
        fish: Array.from({ length: count }, (_, idx) => ({
          ox: (idx - count / 2) * 13 + (Math.random() - 0.5) * 10,
          oy: (Math.random() - 0.5) * 32,
          size: 8 + Math.random() * 5.5,
          phase: Math.random() * Math.PI * 2
        }))
      });
    } else {
      marineLife.push({
        kind: 'jelly',
        xNorm: 0.12 + Math.random() * 0.76,
        yNorm: 0.96,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 0.003 + Math.random() * 0.003,
        riseSpeed: 0.008 + Math.random() * 0.005,
        scale: 0.78 + Math.random() * 0.38,
        alpha: 0.4,
        depth: 0.28,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function drawWhale(ctxRef, c, sx, sy, t) {
    const L = c.scale;
    const flap = Math.sin(t * 0.95 + c.phase);
    const tailY = flap * (L * 0.075);

    ctxRef.save();
    ctxRef.translate(sx, sy + Math.sin(t * 0.45 + c.phase) * 7);
    ctxRef.scale(c.dir, 1);

    ctxRef.fillStyle = `rgba(3, 7, 11, ${c.alpha})`;
    ctxRef.beginPath();
    // Nose / top ridge
    ctxRef.moveTo(L * 0.48, -L * 0.01);
    ctxRef.bezierCurveTo(L * 0.46, -L * 0.12, L * 0.22, -L * 0.16, 0, -L * 0.13);
    // Slight dorsal hump & tail peduncle
    ctxRef.bezierCurveTo(-L * 0.15, -L * 0.12, -L * 0.18, -L * 0.155, -L * 0.21, -L * 0.115);
    ctxRef.bezierCurveTo(-L * 0.33, -L * 0.09, -L * 0.44, -L * 0.03 + tailY * 0.7, -L * 0.53, tailY);
    // Tail flukes
    ctxRef.quadraticCurveTo(-L * 0.62, -L * 0.13 + tailY, -L * 0.65, -L * 0.14 + tailY);
    ctxRef.quadraticCurveTo(-L * 0.58, -L * 0.02 + tailY, -L * 0.55, tailY * 1.05);
    ctxRef.quadraticCurveTo(-L * 0.59, L * 0.06 + tailY, -L * 0.64, L * 0.14 + tailY);
    ctxRef.quadraticCurveTo(-L * 0.57, L * 0.08 + tailY, -L * 0.51, L * 0.025 + tailY * 0.7);
    // Belly & throat curves
    ctxRef.bezierCurveTo(-L * 0.36, L * 0.06, -L * 0.18, L * 0.11, L * 0.05, L * 0.12);
    ctxRef.bezierCurveTo(L * 0.26, L * 0.13, L * 0.44, L * 0.08, L * 0.48, -L * 0.01);
    ctxRef.closePath();
    ctxRef.fill();

    // Long pectoral fin trailing gently
    ctxRef.beginPath();
    ctxRef.moveTo(L * 0.14, L * 0.08);
    ctxRef.quadraticCurveTo(
      L * 0.03,
      L * 0.23 + flap * 4,
      -L * 0.08,
      L * 0.25 + flap * 6
    );
    ctxRef.quadraticCurveTo(L * 0.04, L * 0.16, L * 0.07, L * 0.09);
    ctxRef.closePath();
    ctxRef.fill();

    // Ultra-subtle mist rim along back catching overhead shafts
    ctxRef.strokeStyle = 'rgba(182, 214, 230, 0.05)';
    ctxRef.lineWidth = 1.4;
    ctxRef.beginPath();
    ctxRef.moveTo(L * 0.46, -L * 0.03);
    ctxRef.bezierCurveTo(L * 0.36, -L * 0.13, L * 0.12, -L * 0.15, -L * 0.12, -L * 0.12);
    ctxRef.stroke();

    ctxRef.restore();
  }

  function drawMantaRay(ctxRef, c, sx, sy, t) {
    const s = 44 * c.scale;
    const flap = Math.sin(t * 2.15 + c.phase);
    const wingY = flap * (s * 0.34);

    ctxRef.save();
    ctxRef.translate(sx, sy + Math.sin(t * 1.1 + c.phase) * 8);
    ctxRef.scale(c.dir, 1);

    ctxRef.fillStyle = `rgba(3, 7, 11, ${c.alpha})`;
    ctxRef.beginPath();
    // Head / cephalic fins
    ctxRef.moveTo(s * 0.56, 0);
    ctxRef.quadraticCurveTo(s * 0.34, -s * 0.14, s * 0.12, -s * 0.22);
    // Upper wing sweep
    ctxRef.quadraticCurveTo(-s * 0.04, -s * 0.65 + wingY, -s * 0.24, -s * 0.72 + wingY * 1.15);
    ctxRef.quadraticCurveTo(-s * 0.22, -s * 0.25 + wingY * 0.4, -s * 0.34, -s * 0.04);
    // Lower wing sweep
    ctxRef.quadraticCurveTo(-s * 0.2, s * 0.22 - wingY * 0.3, -s * 0.16, s * 0.52 - wingY * 0.85);
    ctxRef.quadraticCurveTo(s * 0.06, s * 0.38 - wingY * 0.5, s * 0.22, s * 0.14);
    ctxRef.quadraticCurveTo(s * 0.44, s * 0.12, s * 0.56, 0);
    ctxRef.closePath();
    ctxRef.fill();

    // Slender whip tail
    ctxRef.strokeStyle = `rgba(3, 7, 11, ${c.alpha})`;
    ctxRef.lineWidth = 1.8;
    ctxRef.beginPath();
    ctxRef.moveTo(-s * 0.3, -s * 0.02);
    ctxRef.quadraticCurveTo(-s * 0.65, flap * 7, -s * 1.05, -flap * 6);
    ctxRef.stroke();

    ctxRef.restore();
  }

  function drawFishSchool(ctxRef, c, sx, sy, t) {
    ctxRef.save();
    ctxRef.fillStyle = `rgba(3, 7, 11, ${c.alpha})`;

    c.fish.forEach((f) => {
      const fx = sx + f.ox * c.scale;
      const fy = sy + f.oy * c.scale + Math.sin(t * 1.7 + f.phase) * 3.5;
      const wag = Math.sin(t * 6.5 + f.phase) * 2.2;
      const len = f.size * c.scale;

      ctxRef.save();
      ctxRef.translate(fx, fy);
      ctxRef.scale(c.dir, 1);

      ctxRef.beginPath();
      ctxRef.moveTo(len * 0.55, 0);
      ctxRef.quadraticCurveTo(len * 0.1, -len * 0.26, -len * 0.42, wag * 0.35);
      ctxRef.lineTo(-len * 0.68, -len * 0.22 + wag);
      ctxRef.lineTo(-len * 0.56, wag * 0.5);
      ctxRef.lineTo(-len * 0.68, len * 0.22 + wag);
      ctxRef.lineTo(-len * 0.42, wag * 0.35);
      ctxRef.quadraticCurveTo(len * 0.1, len * 0.26, len * 0.55, 0);
      ctxRef.closePath();
      ctxRef.fill();
      ctxRef.restore();
    });

    ctxRef.restore();
  }

  function drawJellyfish(ctxRef, c, sx, sy, t) {
    const pulse = Math.sin(t * 1.65 + c.phase);
    const rx = (13.5 - pulse * 2.4) * c.scale;
    const ry = (10.5 + pulse * 2.2) * c.scale;
    const tilt = Math.sin(t * 0.6 + c.phase) * 0.1;

    ctxRef.save();
    ctxRef.translate(sx, sy);
    ctxRef.rotate(tilt);

    // Translucent bell silhouette
    ctxRef.fillStyle = `rgba(4, 9, 14, ${c.alpha})`;
    ctxRef.beginPath();
    ctxRef.ellipse(0, 0, rx, ry, 0, Math.PI, 0);
    ctxRef.quadraticCurveTo(rx * 0.5, ry * 0.35, 0, ry * 0.15);
    ctxRef.quadraticCurveTo(-rx * 0.5, ry * 0.35, -rx, 0);
    ctxRef.closePath();
    ctxRef.fill();

    // Very soft deep-water rim on bell (never bright enough to distract from text)
    ctxRef.strokeStyle = 'rgba(182, 218, 236, 0.08)';
    ctxRef.lineWidth = 1;
    ctxRef.beginPath();
    ctxRef.ellipse(0, 0, rx * 0.92, ry * 0.9, 0, Math.PI * 1.08, -Math.PI * 0.08);
    ctxRef.stroke();

    // Trailing filaments
    ctxRef.strokeStyle = `rgba(5, 11, 16, ${c.alpha * 0.85})`;
    ctxRef.lineWidth = 1.1;
    for (let i = -2; i <= 2; i++) {
      const startX = (i / 2) * rx * 0.62;
      const sway = Math.sin(t * 1.8 + c.phase + i * 0.7) * 6 * c.scale;
      const len = (24 + (2 - Math.abs(i)) * 7) * c.scale;
      ctxRef.beginPath();
      ctxRef.moveTo(startX, ry * 0.12);
      ctxRef.quadraticCurveTo(startX + sway * 0.7, len * 0.52, startX - sway * 0.45, len);
      ctxRef.stroke();
    }

    ctxRef.restore();
  }

  function updateAndDrawMarineLife(ctxRef, dt, t, w, h, parallaxOffset) {
    if (!reducedMotion) {
      nextCreatureTimer -= dt;
      nextWhaleTimer -= dt;

      if (nextCreatureTimer <= 0 && marineLife.length < 3) {
        spawnCreature();
        nextCreatureTimer = 9 + Math.random() * 8;
      } else if (nextWhaleTimer <= 0 && marineLife.length < 4 && !marineLife.some((c) => c.kind === 'whale')) {
        spawnCreature('whale');
      }
    }

    for (let i = marineLife.length - 1; i >= 0; i--) {
      const c = marineLife[i];
      if (!reducedMotion) {
        if (c.kind === 'jelly') {
          c.yNorm -= c.riseSpeed * dt;
          c.xNorm += Math.sin(t * 0.45 + c.phase) * c.speed * dt;
        } else {
          c.xNorm += c.dir * c.speed * dt;
        }
      }

      if (c.xNorm < -0.35 || c.xNorm > 1.35 || c.yNorm < -0.18) {
        marineLife.splice(i, 1);
        continue;
      }

      const sx = c.xNorm * w + parallaxOffset * c.depth;
      const sy = c.yNorm * h;

      if (c.kind === 'whale') drawWhale(ctxRef, c, sx, sy, t);
      else if (c.kind === 'ray') drawMantaRay(ctxRef, c, sx, sy, t);
      else if (c.kind === 'school') drawFishSchool(ctxRef, c, sx, sy, t);
      else drawJellyfish(ctxRef, c, sx, sy, t);
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  function worldToScreenX(wx, w) {
    const unitPx = Math.max(420, w * 0.54);
    return (wx - cameraWorldX) * unitPx + w * 0.14;
  }

  function getGroundY(worldX, h) {
    const base = h * 0.87;
    const wave =
      Math.sin(worldX * 1.45 + 0.4) * 14 +
      Math.cos(worldX * 3.1) * 5.5 -
      Math.exp(-Math.pow((worldX - 2.4) / 1.1, 2)) * 10;
    return base + wave;
  }

  function drawBriefingLanterns(ctxRef, t, w, h) {
    const isBriefing =
      props.gameState === 'BRIEFING_BASE' || props.gameState === 'BRIEFING_ROLE';
    const nextHotspots = [];

    LANTERN_POSITIONS.forEach((wx, idx) => {
      const sx = worldToScreenX(wx, w);
      const gy = getGroundY(wx, h);

      const isActive = isBriefing && props.briefingStep === idx;
      const isLit = isBriefing && idx <= props.briefingStep && !waitingArrival;
      const targetGlow = isActive && !waitingArrival ? 1 : isLit ? 0.58 : 0.08;
      lanternGlowMap[idx] = reducedMotion
        ? targetGlow
        : lanternGlowMap[idx] + (targetGlow - lanternGlowMap[idx]) * 0.1;

      if (sx > -90 && sx < w + 90) {
        const g = lanternGlowMap[idx];
        const lampY = gy - 54;

        // Volumetric cone & halo when lantern is lit
        if (g > 0.05) {
          const halo = ctxRef.createRadialGradient(sx, lampY, 2, sx, lampY, 90 * (0.5 + g * 0.6));
          halo.addColorStop(0, `rgba(232, 246, 255, ${0.34 * g * (1 - dimPower * 0.7)})`);
          halo.addColorStop(0.4, `rgba(186, 222, 238, ${0.12 * g})`);
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctxRef.fillStyle = halo;
          ctxRef.beginPath();
          ctxRef.arc(sx, lampY, 95, 0, Math.PI * 2);
          ctxRef.fill();
        }

        // Industrial post silhouette
        ctxRef.save();
        ctxRef.fillStyle = '#020406';
        ctxRef.strokeStyle = '#020406';
        ctxRef.fillRect(sx - 2.5, gy - 54, 5, 58);
        ctxRef.fillRect(sx - 9, gy - 58, 18, 4);
        ctxRef.fillRect(sx - 6, gy - 44, 12, 3);
        // Lantern cage
        ctxRef.strokeRect(sx - 6, gy - 55, 12, 11);

        // Glowing core inside lantern
        ctxRef.fillStyle = `rgba(240, 250, 255, ${0.16 + g * 0.82})`;
        ctxRef.beginPath();
        ctxRef.arc(sx, gy - 50, 2.4 + g * 1.4, 0, Math.PI * 2);
        ctxRef.fill();

        // Subtle etched numeral 01..04 hovering just above post
        if (isBriefing) {
          ctxRef.font = '500 12px "Inter", sans-serif';
          ctxRef.textAlign = 'center';
          ctxRef.fillStyle = `rgba(226, 240, 248, ${0.28 + g * 0.68})`;
          ctxRef.fillText(`0${idx + 1}`, sx, gy - 70);
        }
        ctxRef.restore();

        if (isBriefing) {
          nextHotspots.push({
            idx,
            left: Math.round(sx - 28),
            top: Math.round(gy - 86),
            width: 56,
            height: 90,
            active: props.briefingStep === idx
          });
        }
      }
    });

    lanternHotspots.value = nextHotspots;
  }

  function drawObstacle(ctxRef, obs, idx, t, w, h) {
    const worldX = idx + OBSTACLE_START_X;
    const sx = worldToScreenX(worldX, w);
    if (sx < -180 || sx > w + 180) return;

    const prevOpen = obstacleOpenMap.get(obs.id) ?? (obs.solved ? 1 : 0);
    const targetOpen = obs.solved ? 1 : 0;
    const openVal = reducedMotion ? targetOpen : prevOpen + (targetOpen - prevOpen) * 0.08;
    obstacleOpenMap.set(obs.id, openVal);

    const gy = getGroundY(worldX, h);
    const isActive = idx === props.currentIndex && props.gameState === 'PLAYING';
    const glowAlpha = obs.solved ? 0.08 : isActive ? 0.24 : 0.1;

    ctxRef.save();

    const obsGlow = ctxRef.createRadialGradient(sx, gy - 48, 4, sx, gy - 48, 95);
    obsGlow.addColorStop(0, `rgba(216, 236, 244, ${glowAlpha * (1 - dimPower * 0.7)})`);
    obsGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctxRef.fillStyle = obsGlow;
    ctxRef.beginPath();
    ctxRef.arc(sx, gy - 48, 95, 0, Math.PI * 2);
    ctxRef.fill();

    ctxRef.fillStyle = '#020406';
    ctxRef.strokeStyle = '#020406';

    if (obs.obstacleType === 'gate') {
      const doorLift = openVal * 68;
      ctxRef.fillRect(sx - 26, gy - 96, 10, 104);
      ctxRef.fillRect(sx + 16, gy - 96, 10, 104);
      ctxRef.fillRect(sx - 30, gy - 104, 60, 12);
      ctxRef.fillStyle = '#05090d';
      ctxRef.fillRect(sx - 15, gy - 88 - doorLift, 30, 92);
      ctxRef.fillStyle = obs.solved
        ? 'rgba(152, 217, 190, 0.72)'
        : isActive
          ? 'rgba(220, 238, 246, 0.78)'
          : 'rgba(130, 150, 164, 0.35)';
      ctxRef.fillRect(sx - 2, gy - 72 - doorLift, 4, 14);
    } else if (obs.obstacleType === 'valve') {
      ctxRef.fillRect(sx - 8, gy - 135, 16, 142);
      ctxRef.fillRect(sx - 24, gy - 68, 48, 10);
      ctxRef.save();
      ctxRef.translate(sx, gy - 63);
      ctxRef.rotate(openVal * Math.PI * 1.5);
      ctxRef.strokeStyle = '#030609';
      ctxRef.lineWidth = 4;
      ctxRef.beginPath();
      ctxRef.arc(0, 0, 17, 0, Math.PI * 2);
      ctxRef.moveTo(-17, 0);
      ctxRef.lineTo(17, 0);
      ctxRef.moveTo(0, -17);
      ctxRef.lineTo(0, 17);
      ctxRef.stroke();
      ctxRef.restore();

      if (openVal < 0.92) {
        const steamAlpha = (1 - openVal) * 0.32;
        for (let b = 0; b < 7; b++) {
          const by = gy - 12 - ((b * 16 + (reducedMotion ? 0 : t * 48)) % 95);
          const bx = sx + Math.sin(t * 4 + b) * 7;
          ctxRef.fillStyle = `rgba(216, 234, 242, ${steamAlpha})`;
          ctxRef.beginPath();
          ctxRef.arc(bx, by, 4 + (b % 3) * 2.5, 0, Math.PI * 2);
          ctxRef.fill();
        }
      }
    } else if (obs.obstacleType === 'chain') {
      const retract = openVal * 82;
      ctxRef.strokeStyle = '#030508';
      ctxRef.lineWidth = 4;
      for (let linkY = gy - 260; linkY < gy - 18 - retract; linkY += 12) {
        ctxRef.beginPath();
        ctxRef.ellipse(sx, linkY, 4.5, 7, 0, 0, Math.PI * 2);
        ctxRef.stroke();
      }
      ctxRef.fillStyle = '#020406';
      ctxRef.beginPath();
      ctxRef.moveTo(sx - 16, gy - 24 - retract);
      ctxRef.lineTo(sx + 16, gy - 24 - retract);
      ctxRef.lineTo(sx + 10, gy + 2 - retract);
      ctxRef.lineTo(sx - 10, gy + 2 - retract);
      ctxRef.closePath();
      ctxRef.fill();
    } else if (obs.obstacleType === 'bridge') {
      ctxRef.fillRect(sx - 34, gy - 14, 14, 26);
      ctxRef.fillRect(sx + 20, gy - 14, 14, 26);
      ctxRef.save();
      ctxRef.translate(sx - 24, gy - 10);
      const angle = -(1 - openVal) * 1.18;
      ctxRef.rotate(angle);
      ctxRef.fillStyle = '#030508';
      ctxRef.fillRect(0, -6, 54, 8);
      ctxRef.restore();
    } else {
      const floatUp = openVal * 115;
      const sway = reducedMotion ? 0 : Math.sin(t * 1.5 + idx) * 4;
      const my = gy - 46 - floatUp;
      const mx = sx + sway;

      if (openVal < 0.85) {
        ctxRef.strokeStyle = 'rgba(10, 15, 20, 0.9)';
        ctxRef.lineWidth = 2;
        ctxRef.beginPath();
        ctxRef.moveTo(sx, gy + 4);
        ctxRef.lineTo(mx, my);
        ctxRef.stroke();
      }

      ctxRef.fillStyle = '#020406';
      ctxRef.beginPath();
      ctxRef.arc(mx, my, 16, 0, Math.PI * 2);
      ctxRef.fill();
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + openVal * 0.8;
        ctxRef.beginPath();
        ctxRef.moveTo(mx + Math.cos(ang) * 14, my + Math.sin(ang) * 14);
        ctxRef.lineTo(mx + Math.cos(ang) * 23, my + Math.sin(ang) * 23);
        ctxRef.lineWidth = 3;
        ctxRef.stroke();
      }
      ctxRef.fillStyle = obs.solved
        ? 'rgba(152, 217, 190, 0.72)'
        : 'rgba(220, 236, 244, 0.84)';
      ctxRef.beginPath();
      ctxRef.arc(mx, my, 2.8, 0, Math.PI * 2);
      ctxRef.fill();
    }

    ctxRef.restore();
  }

  let lastTime = performance.now();

  function drawScene(timeMs) {
    const dt = Math.min(0.05, (timeMs - lastTime) / 1000);
    lastTime = timeMs;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const t = reducedMotion ? 0 : timeMs * 0.001;
    const normPX = pointerActive ? pointerX / w : 0.5;

    // Move diver smoothly with guaranteed minimum stride speed so short hops feel crisp
    if (reducedMotion) {
      charWorldX = targetWorldX;
      cameraWorldX = targetCameraWorldX;
      knockbackOffset = 0;
      shakePower = 0;
      stumbleTimer = 0;
    } else {
      const dist = targetWorldX - charWorldX;
      if (Math.abs(dist) > 0.004) {
        const step = dist * 0.095 + Math.sign(dist) * Math.min(Math.abs(dist), dt * 0.48);
        if (Math.abs(step) >= Math.abs(dist)) {
          charWorldX = targetWorldX;
        } else {
          charWorldX += step;
        }
      } else {
        charWorldX = targetWorldX;
      }

      if (waitingArrival && Math.abs(targetWorldX - charWorldX) < 0.028) {
        waitingArrival = false;
        emit('arrived');
      }

      cameraWorldX += (targetCameraWorldX - cameraWorldX) * 0.065;
      knockbackOffset += (0 - knockbackOffset) * 0.09;
      shakePower = Math.max(0, shakePower - dt * 2.4);
      stumbleTimer = Math.max(0, stumbleTimer - dt);
    }
    dimPower = Math.max(0, dimPower - dt * 0.85);

    const effectiveCharWorld = charWorldX + knockbackOffset;
    const diff = targetWorldX - charWorldX;
    const isMoving = Math.abs(diff) > 0.014;

    ctx.save();
    if (shakePower > 0.01 && !reducedMotion) {
      const sx = (Math.random() - 0.5) * 13 * shakePower;
      const sy = (Math.random() - 0.5) * 8 * shakePower;
      ctx.translate(sx, sy);
    }

    // 1. Abyssal backdrop
    const dimFactor = 1 - dimPower * 0.62;
    const bgGrad = ctx.createRadialGradient(
      w * (0.44 + (normPX - 0.5) * 0.04),
      h * 0.1,
      w * 0.04,
      w * 0.5,
      h * 0.58,
      Math.max(w, h) * 0.96
    );
    bgGrad.addColorStop(0, `rgba(${Math.round(28 * dimFactor)}, ${Math.round(42 * dimFactor)}, ${Math.round(52 * dimFactor)}, 1)`);
    bgGrad.addColorStop(0.38, `rgba(${Math.round(11 * dimFactor)}, ${Math.round(19 * dimFactor)}, ${Math.round(26 * dimFactor)}, 1)`);
    bgGrad.addColorStop(0.76, '#05090d');
    bgGrad.addColorStop(1, '#020406');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    // 2. Volumetric underwater light shafts
    ctx.save();
    const beams = [
      { x: 0.22, width: 0.2, skew: 0.17, opacity: 0.075 },
      { x: 0.5, width: 0.28, skew: 0.13, opacity: 0.105 },
      { x: 0.8, width: 0.15, skew: 0.1, opacity: 0.06 }
    ];
    beams.forEach((b, idx) => {
      const sway = Math.sin(t * 0.25 + idx) * 0.012;
      const topX = w * (b.x + sway + (normPX - 0.5) * 0.02);
      const topW = w * b.width;
      const botX = topX + w * b.skew;
      const op = b.opacity * (1 - dimPower * 0.72);
      const beamGrad = ctx.createLinearGradient(topX, 0, botX, h * 0.94);
      beamGrad.addColorStop(0, `rgba(216, 232, 240, ${op})`);
      beamGrad.addColorStop(0.55, `rgba(182, 210, 224, ${op * 0.45})`);
      beamGrad.addColorStop(1, 'rgba(10, 16, 22, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(topX - topW * 0.4, 0);
      ctx.lineTo(topX + topW * 0.4, 0);
      ctx.lineTo(botX + topW * 0.9, h);
      ctx.lineTo(botX - topW * 0.5, h);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // Subtle warm/luminous cursor scattering glow
    if (pointerActive && !reducedMotion) {
      const cursorGlow = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 130);
      cursorGlow.addColorStop(0, 'rgba(220, 238, 248, 0.055)');
      cursorGlow.addColorStop(0.5, 'rgba(180, 214, 230, 0.02)');
      cursorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cursorGlow;
      ctx.beginPath();
      ctx.arc(pointerX, pointerY, 130, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2.5 Deep-ocean silhouettes (whales, rays, fish schools, jellyfish) behind towers & marine snow
    const parallaxOffset = -cameraWorldX * 52 + (normPX - 0.5) * -12;
    updateAndDrawMarineLife(ctx, dt, t, w, h, parallaxOffset);

    // 3. Distant parallax ridge & sunken towers
    ctx.save();
    ctx.fillStyle = 'rgba(7, 12, 17, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= 44; i++) {
      const nx = i / 44;
      const ry =
        h * 0.76 +
        Math.sin(nx * 5.2 + cameraWorldX * 0.4 + 1.2) * 22 +
        Math.cos(nx * 11 + cameraWorldX * 0.7) * 7;
      ctx.lineTo(nx * w, ry);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    [0.72, 2.3].forEach((towerAnchor) => {
      const tx = towerAnchor * w + parallaxOffset * 0.45;
      if (tx < -120 || tx > w + 120) return;
      ctx.strokeStyle = 'rgba(7, 11, 16, 0.74)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(tx - 26, h * 0.86);
      ctx.lineTo(tx - 6, h * 0.14);
      ctx.moveTo(tx + 24, h * 0.86);
      ctx.lineTo(tx + 12, h * 0.14);
      for (let step = 0.24; step < 0.82; step += 0.11) {
        const yPos = h * step;
        ctx.moveTo(tx - 22, yPos);
        ctx.lineTo(tx + 20, yPos - 14);
      }
      ctx.stroke();
    });
    ctx.restore();

    // 4. Drifting marine snow reacting gently to cursor light/heat
    particles.forEach((p) => {
      if (!reducedMotion) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(t * 0.6 + p.phase) * 0.00008;
        if (p.y < -0.02) p.y = 1.02;
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;
      }

      const basePx = p.x * w;
      const basePy = p.y * h;
      let boost = 0;

      if (pointerActive && !reducedMotion) {
        const dx = basePx + p.ox - pointerX;
        const dy = basePy + p.oy - pointerY;
        const dist = Math.hypot(dx, dy);
        const radius = 145;
        if (dist < radius && dist > 1) {
          const force = (1 - dist / radius) * 1.45;
          p.ox += (dx / dist) * force;
          p.oy += (dy / dist) * force - force * 0.25; // slight thermal updraft
          boost = (1 - dist / radius) * 0.45;
        }
      }

      p.ox *= 0.96;
      p.oy *= 0.96;

      const px = basePx + p.ox;
      const py = basePy + p.oy;
      const flicker = 0.7 + 0.3 * Math.sin(t * 1.4 + p.phase);
      ctx.fillStyle = `rgba(224, 240, 248, ${Math.min(0.9, (p.alpha * flicker + boost) * (1 - dimPower * 0.5))})`;
      ctx.beginPath();
      ctx.arc(px, py, p.r + boost * 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Final Abyssal Beacon Dome
    const beaconX = worldToScreenX(BEACON_WORLD_X, w);
    if (beaconX > -120 && beaconX < w + 160) {
      const beaconY = getGroundY(BEACON_WORLD_X, h);
      const beaconGlow = ctx.createRadialGradient(beaconX, beaconY - 28, 4, beaconX, beaconY - 28, 95);
      beaconGlow.addColorStop(0, 'rgba(224, 242, 250, 0.42)');
      beaconGlow.addColorStop(0.45, 'rgba(170, 206, 222, 0.12)');
      beaconGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beaconGlow;
      ctx.beginPath();
      ctx.arc(beaconX, beaconY - 28, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#030508';
      ctx.beginPath();
      ctx.arc(beaconX, beaconY - 10, 28, Math.PI, 0);
      ctx.lineTo(beaconX + 34, beaconY + 14);
      ctx.lineTo(beaconX - 34, beaconY + 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(236, 248, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(beaconX, beaconY - 24, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Swaying kelp silhouettes
    ctx.save();
    ctx.strokeStyle = '#020406';
    for (let k = 0; k < 15; k++) {
      const kwx = k * 0.72 + 0.14;
      const ksx = worldToScreenX(kwx, w);
      if (ksx < -80 || ksx > w + 80) continue;
      const kgy = getGroundY(kwx, h) + 6;
      for (let b = 0; b < 3; b++) {
        const ox = (b - 1) * 7;
        const bh = 64 + ((k + b) % 4) * 18;
        const sway = Math.sin(t * 1.15 + k + b * 0.7) * 12;
        ctx.lineWidth = 3 - (b % 2) * 0.8;
        ctx.beginPath();
        ctx.moveTo(ksx + ox, kgy);
        ctx.quadraticCurveTo(ksx + ox + sway * 0.55, kgy - bh * 0.55, ksx + ox + sway, kgy - bh);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 7. Briefing industrial lanterns (01..04) along seabed
    drawBriefingLanterns(ctx, t, w, h);

    // 8. Physical obstacles along seabed
    props.obstacles.forEach((obs, idx) => {
      drawObstacle(ctx, obs, idx, t, w, h);
    });

    // 9. Foreground pitch-black seabed silhouette
    ctx.save();
    ctx.fillStyle = '#020406';
    ctx.beginPath();
    ctx.moveTo(0, h);
    const unitPx = Math.max(420, w * 0.54);
    for (let sx = 0; sx <= w; sx += 18) {
      const wx = (sx - w * 0.14) / unitPx + cameraWorldX;
      ctx.lineTo(sx, getGroundY(wx, h));
    }
    const endWx = (w - w * 0.14) / unitPx + cameraWorldX;
    ctx.lineTo(w, getGroundY(endWx, h));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#020406';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 45; i++) {
      const twx = Math.floor(cameraWorldX * 5) * 0.2 + i * 0.12;
      const tsx = worldToScreenX(twx, w);
      if (tsx < 0 || tsx > w) continue;
      const tgy = getGroundY(twx, h);
      const tuftSway = Math.sin(t * 1.4 + i) * 2.6;
      ctx.beginPath();
      ctx.moveTo(tsx, tgy + 2);
      ctx.lineTo(tsx - 2 + tuftSway, tgy - 6 - (i % 3) * 2.5);
      ctx.stroke();
    }
    ctx.restore();

    // 10. Trap silt burst particles
    for (let i = siltBurst.length - 1; i >= 0; i--) {
      const sb = siltBurst[i];
      sb.worldOffset += sb.vx;
      sb.yOffset += sb.vy;
      sb.vy += 0.08;
      sb.life -= dt * 1.3;
      if (sb.life <= 0) {
        siltBurst.splice(i, 1);
        continue;
      }
      const bx = worldToScreenX(effectiveCharWorld + sb.worldOffset, w);
      const by = getGroundY(effectiveCharWorld, h) + sb.yOffset;
      ctx.fillStyle = `rgba(170, 195, 210, ${sb.life * 0.35})`;
      ctx.beginPath();
      ctx.arc(bx, by, sb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11. Limbo Explorer Character
    const charSX = worldToScreenX(effectiveCharWorld, w);
    const charSY = getGroundY(effectiveCharWorld, h);
    const walkPhase = isMoving ? t * 11.5 : t * 1.8;
    const bob = isMoving ? Math.abs(Math.sin(walkPhase)) * 3.5 : Math.sin(walkPhase) * 1.1;
    const stumbleTilt = stumbleTimer > 0 ? -Math.sin(stumbleTimer * 18) * 0.22 : 0;
    const facing = diff < -0.008 ? -1 : 1;

    ctx.save();
    ctx.translate(charSX, charSY - bob);
    ctx.rotate(stumbleTilt);
    ctx.scale(facing, 1);

    const charAura = ctx.createRadialGradient(0, -28, 4, 0, -28, 72);
    charAura.addColorStop(0, `rgba(216, 232, 240, ${0.15 * (1 - dimPower * 0.55)})`);
    charAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = charAura;
    ctx.beginPath();
    ctx.arc(0, -28, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#010203';
    ctx.strokeStyle = '#010203';
    ctx.lineCap = 'round';

    const stride = isMoving ? Math.sin(walkPhase) * 7.5 : stumbleTimer > 0 ? -5 : 2.5;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(-3 - stride, 2);
    ctx.moveTo(2, -14);
    ctx.lineTo(3 + stride, 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-7, -33, 4, 15, 2);
    ctx.roundRect(-5, -34, 10, 21, 4);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(1, -43, 9.5, 0, Math.PI * 2);
    ctx.fill();

    const eyeAlpha = stumbleTimer > 0 && Math.floor(t * 24) % 2 === 0 ? 0.35 : 0.96;
    ctx.shadowColor = `rgba(235, 248, 255, ${eyeAlpha})`;
    ctx.shadowBlur = 9;
    ctx.fillStyle = `rgba(242, 249, 252, ${eyeAlpha})`;
    ctx.beginPath();
    ctx.ellipse(4.5, -43.5, 1.8, 2.3, 0, 0, Math.PI * 2);
    ctx.ellipse(8.2, -43.5, 1.5, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 12. Vignette
    const vig = ctx.createRadialGradient(
      w * 0.5,
      h * 0.45,
      Math.min(w, h) * 0.28,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.8
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(2, 4, 6, ${0.7 + dimPower * 0.2})`);
    ctx.fillStyle = vig;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    ctx.restore();
    rafId = requestAnimationFrame(drawScene);
  }

  rafId = requestAnimationFrame(drawScene);

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerleave', handlePointerLeave);
  });
});
</script>

<template>
  <div class="abyss-backdrop">
    <canvas ref="canvasRef" class="abyss-canvas" aria-hidden="true" />
    <!-- Clickable world lantern hotspots during briefing -->
    <button
      v-for="spot in lanternHotspots"
      :key="spot.idx"
      type="button"
      class="lantern-hotspot"
      :aria-label="`Перейти к фонарю 0${spot.idx + 1}`"
      :style="{
        left: `${spot.left}px`,
        top: `${spot.top}px`,
        width: `${spot.width}px`,
        height: `${spot.height}px`
      }"
      @click="emit('select-lantern', spot.idx)"
    />
  </div>
</template>

<style lang="scss" scoped>
.abyss-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.abyss-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.lantern-hotspot {
  position: absolute;
  pointer-events: auto;
  z-index: 2;
  background: transparent;
  border: none;
  cursor: pointer;
}
</style>
