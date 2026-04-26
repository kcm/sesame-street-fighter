const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");

const fighterOptionsEl = document.getElementById("fighter-options");
const startBtn = document.getElementById("start-btn");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const leftNameEl = document.getElementById("left-name");
const rightNameEl = document.getElementById("right-name");
const leftHpEl = document.getElementById("left-hp");
const rightHpEl = document.getElementById("right-hp");
const timerEl = document.getElementById("timer");
const leftScoreEl = document.getElementById("left-score");
const rightScoreEl = document.getElementById("right-score");
const spriteStatusEl = document.getElementById("sprite-status");
const raytraceStatusEl = document.getElementById("raytrace-status");

const FLOOR_Y = 455;
const GRAVITY = 0.75;
const ROUND_TIME = 60;
const WIN_ROUNDS = 2;
const SPRITE_DIR = "./assets/sprites";
const STAGE_BLOCKS = [
  { x: 100, y: 180, w: 130, h: 190, color: "#ffdd9a" },
  { x: 280, y: 220, w: 160, h: 150, color: "#ffc4c4" },
  { x: 500, y: 170, w: 150, h: 200, color: "#d2e0ff" },
  { x: 700, y: 210, w: 140, h: 160, color: "#ffe8c1" },
];

const keys = { a: false, d: false, w: false, f: false, g: false, r: false };

const fighters = [
  { name: "Elmo", color: "#f24236", speed: 4.8, power: 9, jump: 15, width: 70, height: 120 },
  { name: "Cookie Monster", color: "#1691ff", speed: 4.1, power: 11, jump: 14, width: 78, height: 126 },
  { name: "Big Bird", color: "#ffd23f", speed: 4.3, power: 10, jump: 16, width: 76, height: 138 },
  { name: "Oscar", color: "#4caf50", speed: 5.2, power: 8, jump: 15, width: 68, height: 110 },
  { name: "Bert", color: "#ff9f1c", speed: 4.7, power: 9, jump: 15, width: 70, height: 122 },
  { name: "Ernie", color: "#ff784f", speed: 5.0, power: 8, jump: 15, width: 68, height: 118 },
];

const spriteFileMap = {
  Elmo: "elmo",
  "Cookie Monster": "cookie_monster",
  "Big Bird": "big_bird",
  Oscar: "oscar",
  Bert: "bert",
  Ernie: "ernie",
};

const spriteCache = new Map();

function createSprite(path) {
  const img = new Image();
  img.src = path;
  return img;
}

function getCharacterSprites(name) {
  if (spriteCache.has(name)) return spriteCache.get(name);

  const base = spriteFileMap[name];
  const sprites = {
    idle: createSprite(`${SPRITE_DIR}/${base}_idle.png`),
    run: createSprite(`${SPRITE_DIR}/${base}_run.png`),
    jump: createSprite(`${SPRITE_DIR}/${base}_jump.png`),
    jab: createSprite(`${SPRITE_DIR}/${base}_jab.png`),
    kick: createSprite(`${SPRITE_DIR}/${base}_kick.png`),
    hit: createSprite(`${SPRITE_DIR}/${base}_hit.png`),
  };

  spriteCache.set(name, sprites);
  return sprites;
}

function hasLoadedSprite(image) {
  return image && image.complete && image.naturalWidth > 0;
}

class Fighter {
  constructor(opts) {
    this.name = opts.name;
    this.color = opts.color;
    this.baseSpeed = opts.speed;
    this.power = opts.power;
    this.jumpStrength = opts.jump;
    this.width = opts.width;
    this.height = opts.height;
    this.x = opts.x;
    this.y = opts.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = opts.facing;
    this.maxHp = 100;
    this.hp = 100;
    this.attackCooldown = 0;
    this.hitFlash = 0;
    this.attackBox = null;
    this.stun = 0;
    this.comboMult = 1;
    this.activeAttackType = null;
    this.attackAnim = 0;
    this.sprites = getCharacterSprites(this.name);
  }

  get onGround() {
    return this.y + this.height >= FLOOR_Y;
  }

  update() {
    if (this.attackCooldown > 0) this.attackCooldown -= 1;
    if (this.hitFlash > 0) this.hitFlash -= 1;
    if (this.stun > 0) this.stun -= 1;
    if (this.attackAnim > 0) this.attackAnim -= 1;
    if (this.attackAnim <= 0) this.activeAttackType = null;

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y + this.height >= FLOOR_Y) {
      this.y = FLOOR_Y - this.height;
      this.vy = 0;
    }

    if (this.x < 20) this.x = 20;
    if (this.x + this.width > canvas.width - 20) this.x = canvas.width - this.width - 20;
  }

  draw() {
    ctx.save();
    if (this.hitFlash > 0) ctx.globalAlpha = 0.65;

    const state = this.getSpriteState();
    const sprite = this.sprites[state] || this.sprites.idle;

    if (hasLoadedSprite(sprite)) {
      this.drawSprite(sprite);
    } else {
      this.drawFallback();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x + this.width / 2, this.y - 8);
    ctx.restore();
  }

  getSpriteState() {
    if (this.stun > 0) return "hit";
    if (!this.onGround) return "jump";
    if (this.attackAnim > 0) return this.activeAttackType || "jab";
    if (Math.abs(this.vx) > 0.45) return "run";
    return "idle";
  }

  drawSprite(sprite) {
    const drawW = this.width * 1.35;
    const drawH = this.height * 1.35;
    const drawX = this.x + this.width / 2;
    const drawY = this.y + this.height / 2 + 4;

    ctx.translate(drawX, drawY);
    ctx.scale(this.facing, 1);
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
  }

  drawFallback() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = "#111";
    const eyeY = this.y + this.height * 0.22;
    if (this.facing === 1) {
      ctx.fillRect(this.x + this.width * 0.63, eyeY, 8, 8);
      ctx.fillRect(this.x + this.width * 0.76, eyeY, 8, 8);
    } else {
      ctx.fillRect(this.x + this.width * 0.24, eyeY, 8, 8);
      ctx.fillRect(this.x + this.width * 0.37, eyeY, 8, 8);
    }
  }

  tryAttack(type) {
    if (this.attackCooldown > 0 || this.stun > 0) return;

    const isKick = type === "kick";
    const range = isKick ? 70 : 52;
    const damage = Math.round((isKick ? 13 : 9) * (this.power / 10) * this.comboMult);
    const yOffset = isKick ? 42 : 28;
    const attackHeight = isKick ? 30 : 24;

    const x = this.facing === 1 ? this.x + this.width : this.x - range;
    this.attackBox = { x, y: this.y + yOffset, width: range, height: attackHeight, damage, ttl: 8 };
    this.attackCooldown = isKick ? 34 : 22;
    this.attackAnim = isKick ? 12 : 9;
    this.activeAttackType = isKick ? "kick" : "jab";
    this.comboMult = 1;
  }
}

let selectedFighter = null;
let player = null;
let cpu = null;
let roundTimer = ROUND_TIME;
let leftRounds = 0;
let rightRounds = 0;
let timerInterval = null;
let gameActive = false;
let lastTime = 0;
let raytraceEnabled = true;

function buildSelection() {
  fighters.forEach((fighter) => {
    const btn = document.createElement("button");
    btn.className = "fighter-btn";
    btn.textContent = fighter.name;
    btn.style.borderColor = fighter.color;

    btn.addEventListener("click", () => {
      selectedFighter = fighter;
      [...fighterOptionsEl.children].forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      startBtn.disabled = false;
      overlayText.textContent = `${fighter.name} selected. Start match when ready.`;
    });

    fighterOptionsEl.appendChild(btn);
  });
}

function spawnFighters() {
  const cpuPick = fighters[Math.floor(Math.random() * fighters.length)];
  const userPick = selectedFighter || fighters[0];

  player = new Fighter({ ...userPick, x: 160, y: FLOOR_Y - userPick.height, facing: 1 });
  cpu = new Fighter({ ...cpuPick, x: 730, y: FLOOR_Y - cpuPick.height, facing: -1 });

  leftNameEl.textContent = userPick.name;
  rightNameEl.textContent = `${cpuPick.name} (CPU)`;
  refreshHud();
}

function refreshHud() {
  leftHpEl.style.width = `${Math.max(0, player.hp)}%`;
  rightHpEl.style.width = `${Math.max(0, cpu.hp)}%`;
  timerEl.textContent = String(roundTimer);
  leftScoreEl.textContent = String(leftRounds);
  rightScoreEl.textContent = String(rightRounds);
}

function getMissingSpriteStates(fighter) {
  const required = ["idle", "run", "jump", "jab", "kick", "hit"];
  return required.filter((state) => !hasLoadedSprite(fighter.sprites[state]));
}

function updateSpriteStatus() {
  if (!player || !cpu || !spriteStatusEl) return;

  const playerMissing = getMissingSpriteStates(player);
  const cpuMissing = getMissingSpriteStates(cpu);
  const allMissing = playerMissing.length === 6 && cpuMissing.length === 6;

  if (allMissing) {
    spriteStatusEl.textContent =
      "Sprite status: no PNG sprites found. Using fallback blocks. Add files in assets/sprites.";
    return;
  }

  if (playerMissing.length === 0 && cpuMissing.length === 0) {
    spriteStatusEl.textContent = "Sprite status: full sprites loaded for both fighters.";
    return;
  }

  spriteStatusEl.textContent = `Sprite status: partial sprites loaded. Missing states -> ${player.name}: ${playerMissing.join(", ") || "none"} | ${cpu.name}: ${cpuMissing.join(", ") || "none"}`;
}

function updateRaytraceStatus() {
  if (!raytraceStatusEl) return;
  raytraceStatusEl.textContent = `Raytrace mode: ${raytraceEnabled ? "enabled" : "disabled"}`;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Exact line-AABB intersection via Liang-Barsky clipping.
function segmentIntersectsRect(a, b, rect) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ps = [-dx, dx, -dy, dy];
  const qs = [a.x - rect.x, rect.x + rect.w - a.x, a.y - rect.y, rect.y + rect.h - a.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (ps[i] === 0) {
      if (qs[i] < 0) return false;
    } else {
      const t = qs[i] / ps[i];
      if (ps[i] < 0) { if (t > t0) t0 = t; } else { if (t < t1) t1 = t; }
    }
  }
  return t0 <= t1;
}

function isOccluded(light, target) {
  return STAGE_BLOCKS.some((block) => segmentIntersectsRect(light, target, block));
}

// Area-light soft shadow: samples 8 points around the light disc, returns 0 (fully lit) – 1 (fully shadowed).
function occlusionFraction(light, target) {
  const SAMPLES = 8;
  const RADIUS = 22;
  let blocked = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const angle = (i / SAMPLES) * Math.PI * 2;
    const sample = { x: light.x + Math.cos(angle) * RADIUS, y: light.y + Math.sin(angle) * RADIUS * 0.25 };
    if (STAGE_BLOCKS.some((b) => segmentIntersectsRect(sample, target, b))) blocked++;
  }
  return blocked / SAMPLES;
}

function getLightSource(timeNow) {
  const sway = Math.sin(timeNow * 0.00045) * 210;
  return { x: canvas.width * 0.5 + sway, y: 78 };
}

function projectToGround(light, p) {
  const dy = p.y - light.y;
  if (Math.abs(dy) < 0.01) return { x: p.x, y: FLOOR_Y };
  const t = (FLOOR_Y - light.y) / dy;
  return { x: light.x + (p.x - light.x) * t, y: FLOOR_Y };
}

function drawRayTracedShadow(fighter, light) {
  const cx = fighter.x + fighter.width * 0.5;
  const occ = occlusionFraction(light, { x: cx, y: fighter.y + fighter.height * 0.4 });

  // Contact shadow: dark ellipse at feet, always present regardless of light angle.
  ctx.save();
  ctx.filter = "blur(5px)";
  ctx.globalAlpha = 0.45 - occ * 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, FLOOR_Y - 1, fighter.width * 0.44, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Projected shadow trapezoid with soft penumbra edges.
  const topLeft  = { x: fighter.x + 8,                y: fighter.y + 8 };
  const topRight = { x: fighter.x + fighter.width - 8, y: fighter.y + 8 };
  const footLeft  = { x: fighter.x + 8,                y: FLOOR_Y - 2 };
  const footRight = { x: fighter.x + fighter.width - 8, y: FLOOR_Y - 2 };
  const projLeft  = projectToGround(light, topLeft);
  const projRight = projectToGround(light, topRight);

  const baseAlpha = 0.38 - occ * 0.22;
  const grad = ctx.createLinearGradient(0, fighter.y + fighter.height * 0.5, 0, FLOOR_Y + 60);
  grad.addColorStop(0,    `rgba(0,0,0,${baseAlpha.toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(0,0,0,${(baseAlpha * 0.45).toFixed(3)})`);
  grad.addColorStop(1,    "rgba(0,0,0,0)");

  ctx.save();
  ctx.filter = "blur(3px)";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(footLeft.x,  footLeft.y);
  ctx.lineTo(footRight.x, footRight.y);
  ctx.lineTo(projRight.x, projRight.y + 30);
  ctx.lineTo(projLeft.x,  projLeft.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRayTraceLighting(light) {
  ctx.save();

  // Sun glow — warmer, larger, with a hot inner core.
  const sunGlow = ctx.createRadialGradient(light.x, light.y, 8, light.x, light.y, 300);
  sunGlow.addColorStop(0,    "rgba(255, 252, 210, 0.90)");
  sunGlow.addColorStop(0.18, "rgba(255, 238, 160, 0.55)");
  sunGlow.addColorStop(0.55, "rgba(255, 225, 120, 0.18)");
  sunGlow.addColorStop(1,    "rgba(255, 220, 100, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(light.x, light.y, 300, 0, Math.PI * 2);
  ctx.fill();

  // Atmospheric darkening pass.
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(11, 24, 36, 0.14)";
  ctx.fillRect(0, 0, canvas.width, FLOOR_Y);

  // God rays — 36 beams, varied width and brightness for a volumetric feel.
  ctx.globalCompositeOperation = "source-over";
  const BEAMS = 36;
  for (let i = 0; i < BEAMS; i++) {
    const x = (i / (BEAMS - 1)) * canvas.width;
    const target = { x, y: FLOOR_Y };
    if (isOccluded(light, target)) continue;

    const accent = i % 6 === 0;
    ctx.strokeStyle = accent ? "rgba(255, 245, 190, 0.11)" : "rgba(255, 243, 175, 0.048)";
    ctx.lineWidth = accent ? 2.4 : 0.9;
    ctx.beginPath();
    ctx.moveTo(light.x, light.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  // Ambient occlusion: soft shadow pooling at the base of stage blocks.
  ctx.globalCompositeOperation = "multiply";
  for (const b of STAGE_BLOCKS) {
    const ao = ctx.createLinearGradient(0, b.y + b.h - 4, 0, b.y + b.h + 26);
    ao.addColorStop(0, "rgba(0,0,0,0.30)");
    ao.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ao;
    ctx.fillRect(b.x - 5, b.y + b.h - 4, b.w + 10, 30);
  }

  ctx.restore();
}

function drawFighterBounceLight(fighter, light) {
  const cx = fighter.x + fighter.width * 0.5;
  const cy = fighter.y + fighter.height * 0.42;
  const blocked = isOccluded(light, { x: cx, y: cy });
  const radius = fighter.width * 1.15;
  const lightDir = light.x > cx ? 1 : -1;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // Main ambient halo.
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
  halo.addColorStop(0, blocked ? "rgba(255,255,220,0.04)" : "rgba(255,255,220,0.20)");
  halo.addColorStop(1, "rgba(255,255,220,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Directional specular: warm highlight on the light-facing edge.
  if (!blocked) {
    const hlX = cx + lightDir * fighter.width * 0.28;
    const hlY = cy - fighter.height * 0.08;
    const spec = ctx.createRadialGradient(hlX, hlY, 2, hlX, hlY, fighter.width * 0.62);
    spec.addColorStop(0, "rgba(255, 252, 200, 0.30)");
    spec.addColorStop(1, "rgba(255, 252, 200, 0)");
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.arc(hlX, hlY, fighter.width * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cool rim light on the shadow side.
  const rimX = cx - lightDir * fighter.width * 0.36;
  const rim = ctx.createRadialGradient(rimX, cy, 2, rimX, cy, fighter.width * 0.52);
  rim.addColorStop(0, "rgba(130, 190, 255, 0.13)");
  rim.addColorStop(1, "rgba(130, 190, 255, 0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(rimX, cy, fighter.width * 0.52, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function processAttack(attacker, defender) {
  if (!attacker.attackBox) return;

  attacker.attackBox.ttl -= 1;
  if (attacker.attackBox.ttl <= 0) {
    attacker.attackBox = null;
    return;
  }

  if (intersects(attacker.attackBox, defender) && defender.stun <= 0) {
    defender.hp -= attacker.attackBox.damage;
    defender.hitFlash = 5;
    defender.stun = 10;
    defender.vx = attacker.facing * 4.5;
    defender.vy = -3.5;
    attacker.comboMult = Math.min(1.45, attacker.comboMult + 0.08);
    attacker.attackBox = null;
  }
}

function updatePlayerInput() {
  if (player.stun > 0) return;

  player.vx = 0;
  if (keys.a) player.vx = -player.baseSpeed;
  if (keys.d) player.vx = player.baseSpeed;
  if (keys.a && keys.d) player.vx = 0;

  if (player.vx !== 0) player.facing = Math.sign(player.vx);
  if (keys.w && player.onGround) player.vy = -player.jumpStrength;
}

function runCpuAI() {
  if (cpu.stun > 0) return;

  const distance = player.x - cpu.x;
  const abs = Math.abs(distance);
  cpu.vx = 0;

  if (abs > 100) {
    cpu.vx = Math.sign(distance) * cpu.baseSpeed * 0.9;
  } else if (abs < 70) {
    cpu.vx = -Math.sign(distance) * cpu.baseSpeed * 0.55;
  }

  if (cpu.vx !== 0) cpu.facing = Math.sign(cpu.vx);
  if (cpu.onGround && Math.random() < 0.006) cpu.vy = -cpu.jumpStrength;

  if (abs < 95 && Math.random() < 0.065) cpu.tryAttack(Math.random() > 0.55 ? "kick" : "jab");
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#87e9ff");
  sky.addColorStop(1, "#f2fbff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#9be57a";
  ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

  // Stylized "street" and building blocks.
  ctx.fillStyle = "#a0b6c6";
  ctx.fillRect(0, FLOOR_Y - 8, canvas.width, 8);

  for (const b of STAGE_BLOCKS) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#2d4958";
    ctx.fillRect(b.x + 18, b.y + 20, 30, 38);
    ctx.fillRect(b.x + 65, b.y + 20, 30, 38);
    ctx.fillRect(b.x + 18, b.y + 80, 30, 38);
    ctx.fillRect(b.x + 65, b.y + 80, 30, 38);
  }
}

function drawAttackBox(fighter) {
  if (!fighter.attackBox) return;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = fighter === player ? "#ff4d4d" : "#00a2ff";
  const a = fighter.attackBox;
  ctx.fillRect(a.x, a.y, a.width, a.height);
  ctx.restore();
}

function updateRound() {
  if (!gameActive) return;

  updatePlayerInput();
  runCpuAI();

  player.update();
  cpu.update();

  processAttack(player, cpu);
  processAttack(cpu, player);

  if (player.hp <= 0 || cpu.hp <= 0 || roundTimer <= 0) {
    finishRound();
  }

  refreshHud();
}

function render() {
  drawBackground();
  const light = getLightSource(performance.now());
  if (raytraceEnabled) {
    drawRayTraceLighting(light);
    drawRayTracedShadow(player, light);
    drawRayTracedShadow(cpu, light);
  }
  player.draw();
  cpu.draw();
  if (raytraceEnabled) {
    drawFighterBounceLight(player, light);
    drawFighterBounceLight(cpu, light);
  }
  drawAttackBox(player);
  drawAttackBox(cpu);
}

function finishRound() {
  if (!gameActive) return;
  gameActive = false;
  clearInterval(timerInterval);

  let msg = "Round draw!";
  if (player.hp > cpu.hp) {
    leftRounds += 1;
    msg = `${player.name} wins round!`;
  } else if (cpu.hp > player.hp) {
    rightRounds += 1;
    msg = `${cpu.name} wins round!`;
  }

  refreshHud();

  if (leftRounds >= WIN_ROUNDS || rightRounds >= WIN_ROUNDS) {
    const champion = leftRounds > rightRounds ? player.name : cpu.name;
    overlayText.textContent = `${champion} wins the match! Click Start Match for a new set.`;
    overlay.classList.remove("hidden");
    return;
  }

  overlayText.textContent = `${msg} Next round starts in 2 seconds...`;
  overlay.classList.remove("hidden");

  setTimeout(() => {
    if (leftRounds >= WIN_ROUNDS || rightRounds >= WIN_ROUNDS) return;
    startRound(false);
  }, 2000);
}

function startRound(fullReset) {
  if (fullReset) {
    leftRounds = 0;
    rightRounds = 0;
  }

  spawnFighters();
  roundTimer = ROUND_TIME;
  refreshHud();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameActive) return;
    roundTimer -= 1;
    timerEl.textContent = String(roundTimer);
    if (roundTimer <= 0) finishRound();
  }, 1000);

  overlay.classList.add("hidden");
  gameActive = true;
  setTimeout(updateSpriteStatus, 120);
}

function tick(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // If tab is suspended and resumed, run a single safe update.
  if (dt > 130) {
    updateRound();
  } else {
    updateRound();
  }

  render();
  requestAnimationFrame(tick);
}

startBtn.addEventListener("click", () => {
  if (!selectedFighter) return;
  startRound(true);
});

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = true;
  if (k === "r") {
    raytraceEnabled = !raytraceEnabled;
    updateRaytraceStatus();
  }
  if (!gameActive) return;

  if (k === "f") player.tryAttack("jab");
  if (k === "g") player.tryAttack("kick");
});

document.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = false;
});

buildSelection();
spawnFighters();
refreshHud();
updateRaytraceStatus();
setTimeout(updateSpriteStatus, 120);
requestAnimationFrame(tick);
