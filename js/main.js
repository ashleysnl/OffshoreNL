import { AudioSystem } from './audio.js';
import { PuffinPlatformPanicGame } from './game.js';
import { Renderer } from './renderer.js';
import { loadData, resetData, saveData } from './storage.js';

const canvas = document.getElementById('gameCanvas');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const soundToggleBtn = document.getElementById('soundToggle');
const crtToggleBtn = document.getElementById('crtToggle');
const resetDataBtn = document.getElementById('resetDataBtn');
const bestScoreEl = document.getElementById('bestScore');
const actionButtons = Array.from(document.querySelectorAll('.action-btn'));

const renderer = new Renderer(canvas);
const game = new PuffinPlatformPanicGame();
const audio = new AudioSystem();

let store = loadData();
audio.setEnabled(store.settings.sound);
renderer.setCRT(store.settings.crt);

let last = performance.now();
let prevState = game.state;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function persist() {
  saveData(store);
}

function refreshSettingsUI() {
  soundToggleBtn.textContent = `Sound: ${store.settings.sound ? 'On' : 'Off'}`;
  crtToggleBtn.textContent = `CRT: ${store.settings.crt ? 'On' : 'Off'}`;
  bestScoreEl.textContent = String(store.bestScore);
}

function updateThemeState() {
  const shouldPlay = store.settings.sound && game.state === 'running' && !document.hidden;
  audio.setThemePlaying(shouldPlay);
}

function formatTime(sec) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function drawWorld(dt, nowSec) {
  renderer.beginFrame(dt);
  renderer.clear(0);
  renderer.drawSky(nowSec);
  renderer.drawOcean();

  renderer.drawRigComplex(nowSec);

  const flap = Math.floor(nowSec * 8) % 2 === 0 ? 'puffinA' : 'puffinB';
  const hasPuffinEvent = game.activeEvents.some((e) => e.id === 'puffins');
  const puffinCount = hasPuffinEvent ? 4 : 2;

  for (let i = 0; i < puffinCount; i += 1) {
    const px = 114 + i * 22 + Math.sin(nowSec * 2 + i) * 4;
    const py = 88 + Math.cos(nowSec * 2.6 + i * 0.8) * 3;
    renderer.drawSprite(flap, Math.floor(px), Math.floor(py), 2);
  }

  const icebergActive = game.activeEvents.some((e) => e.id === 'iceberg');
  if (icebergActive) {
    const ix = 24 + Math.sin(nowSec * 1.8) * 3;
    renderer.drawSprite('iceberg', Math.floor(ix), 126, 2);
  }

  const heliX = 228 + Math.sin(nowSec * 0.7) * 44;
  const heliY = 29 + Math.sin(nowSec * 1.4) * 4;
  renderer.drawSprite('helicopter', Math.floor(heliX), Math.floor(heliY), 1);

  const hasFog = game.activeEvents.some((e) => e.id === 'fog');
  const hasStorm = game.activeEvents.some((e) => e.id === 'squall');
  if (hasFog) renderer.drawFogOverlay(nowSec);
  if (hasStorm) renderer.drawStormOverlay(nowSec);
}

function drawHUD() {
  renderer.drawRect(0, 0, 320, 41, 0);
  renderer.drawMeter(8, 11, 96, 7, 'PROD', game.meters.production, 9);
  renderer.drawMeter(112, 11, 96, 7, 'SAFE', game.meters.safety, 6);
  renderer.drawMeter(216, 11, 96, 7, 'MORALE', game.meters.morale, 7);

  renderer.drawText(`TIME ${formatTime(game.timeSurvived)}`, 8, 22, 1, 5);
  renderer.drawText(`SCORE ${Math.floor(game.score)}`, 100, 22, 1, 5);

  const low = game.meters.production < 26 || game.meters.safety < 26 || game.meters.morale < 26;
  if (low) renderer.drawSprite('warning', 286, 22, 2);

  renderer.drawRect(6, 29, 308, 12, 1);
  const ticker = game.lastTicker;
  const tickerPixelWidth = ticker.length * 8;
  const tickerX = 308 - ((performance.now() * 0.04) % (tickerPixelWidth + 320));
  renderer.ctx.save();
  renderer.ctx.beginPath();
  renderer.ctx.rect(8, 30, 304, 10);
  renderer.ctx.clip();
  renderer.drawText(ticker, Math.floor(tickerX), 30, 2, 5);
  renderer.ctx.restore();

  if (game.activeEvents.length > 0) {
    renderer.drawText(`EVENTS ${game.activeEvents.length}`, 248, 22, 1, 8);
  }
}

function drawOverlay() {
  if (game.state === 'running') return;

  renderer.drawRect(36, 50, 248, 84, 0);
  renderer.drawRect(38, 52, 244, 80, 1);

  if (game.state === 'start') {
    renderer.drawText('PUFFIN PLATFORM PANIC!', 56, 62, 2, 6);
    renderer.drawText('KEEP ALL 3 METERS ABOVE ZERO', 56, 86, 1, 5);
    renderer.drawText('TAP ACTIONS. SURVIVE THE SHIFT.', 56, 95, 1, 5);
    renderer.drawText('PRESS START', 120, 112, 1, 10);
  }

  if (game.state === 'paused') {
    renderer.drawText('PAUSED', 128, 78, 2, 6);
    renderer.drawText('PRESS PAUSE TO RESUME', 98, 101, 1, 5);
  }

  if (game.state === 'gameover') {
    renderer.drawText('GAME OVER', 112, 68, 2, 8);
    renderer.drawText(game.gameOverReason, 70, 90, 1, 5);
    renderer.drawText(`FINAL SCORE ${Math.floor(game.score)}`, 90, 102, 1, 6);
    renderer.drawText('PRESS RESTART', 105, 114, 1, 10);
  }
}

function updateActionButtons() {
  for (const btn of actionButtons) {
    const actionId = btn.dataset.action;
    const cd = game.cooldowns[actionId] || 0;
    btn.disabled = game.state !== 'running' || cd > 0;
    if (cd > 0) {
      btn.textContent = `${btn.dataset.label} (${cd.toFixed(1)}s)`;
    } else {
      btn.textContent = btn.dataset.label;
    }
  }
}

function onAction(actionId) {
  audio.unlock();
  const result = game.performAction(actionId);
  if (!result.ok) return;
  audio.play(result.sfx);
}

function handleGameOver() {
  if (game.state !== 'gameover') return;
  if (game.score > store.bestScore) {
    store.bestScore = Math.floor(game.score);
    persist();
    refreshSettingsUI();
  }
}

function loop(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  const nowSec = now / 1000;
  last = now;

  game.update(dt, renderer, (sfxName) => audio.play(sfxName));

  drawWorld(dt, nowSec);
  drawHUD();
  drawOverlay();
  renderer.applyCRTEffects(nowSec);

  updateActionButtons();

  if (game.state === 'gameover') {
    handleGameOver();
  }

  if (game.state !== prevState && game.state === 'gameover') {
    audio.play('gameover');
  }
  prevState = game.state;

  updateThemeState();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', () => {
  audio.unlock();
  game.start();
  audio.play('button');
  updateThemeState();
});

pauseBtn.addEventListener('click', () => {
  if (game.state === 'start' || game.state === 'gameover') return;
  game.togglePause();
  audio.play('button');
  updateThemeState();
});

restartBtn.addEventListener('click', () => {
  audio.unlock();
  game.start();
  audio.play('button');
  updateThemeState();
});

soundToggleBtn.addEventListener('click', () => {
  store.settings.sound = !store.settings.sound;
  audio.setEnabled(store.settings.sound);
  persist();
  refreshSettingsUI();
  audio.unlock();
  audio.play('button');
  updateThemeState();
});

crtToggleBtn.addEventListener('click', () => {
  store.settings.crt = !store.settings.crt;
  renderer.setCRT(store.settings.crt);
  persist();
  refreshSettingsUI();
  audio.play('button');
});

resetDataBtn.addEventListener('click', () => {
  store = resetData();
  audio.setEnabled(store.settings.sound);
  renderer.setCRT(store.settings.crt);
  refreshSettingsUI();
  persist();
  audio.unlock();
  audio.play('button');
  updateThemeState();
});

for (const btn of actionButtons) {
  btn.addEventListener('click', () => onAction(btn.dataset.action));
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (game.state === 'start' || game.state === 'gameover') {
      game.start();
    } else {
      game.togglePause();
    }
    audio.play('button');
    updateThemeState();
  }
});

window.addEventListener('pointerdown', () => {
  audio.unlock();
  updateThemeState();
}, { once: true });

document.addEventListener('visibilitychange', () => {
  updateThemeState();
});

refreshSettingsUI();
requestAnimationFrame((ts) => {
  last = ts;
  requestAnimationFrame(loop);
});
