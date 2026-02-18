import { AudioManager } from './audio.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { Storage } from './storage.js';

const el = {
  canvas: document.getElementById('game-canvas'),
  hud: document.getElementById('hud'),
  hudScore: document.getElementById('hud-score'),
  hudHigh: document.getElementById('hud-high'),
  hudWave: document.getElementById('hud-wave'),
  hudLives: document.getElementById('hud-lives'),
  hudCombo: document.getElementById('hud-combo'),

  startScreen: document.getElementById('start-screen'),
  pauseOverlay: document.getElementById('pause-overlay'),
  gameOverOverlay: document.getElementById('game-over-overlay'),
  settingsPanel: document.getElementById('settings-panel'),
  bossWarning: document.getElementById('boss-warning'),
  gameOverText: document.getElementById('game-over-text'),
  mobileControls: document.getElementById('mobile-controls'),

  startBtn: document.getElementById('start-btn'),
  resumeBtn: document.getElementById('resume-btn'),
  restartPauseBtn: document.getElementById('restart-btn-pause'),
  restartOverBtn: document.getElementById('restart-btn-over'),
  backTitleBtn: document.getElementById('back-title-btn'),
  openSettingsStart: document.getElementById('open-settings-start'),
  openSettingsPause: document.getElementById('open-settings-pause'),
  closeSettings: document.getElementById('close-settings'),
  soundToggle: document.getElementById('sound-toggle'),
  resetHighScore: document.getElementById('reset-high-score'),

  leftBtn: document.getElementById('ctrl-left'),
  rightBtn: document.getElementById('ctrl-right'),
  fireBtn: document.getElementById('ctrl-fire'),
  pauseBtn: document.getElementById('ctrl-pause')
};

const audio = new AudioManager();
const settings = Storage.getSettings();
const game = new Game({ audio, highScore: Storage.getHighScore() });
const renderer = new Renderer(el.canvas, game);

const input = {
  left: false,
  right: false,
  fire: false
};

let rafId = null;
let lastTs = 0;
let highScoreCache = game.highScore;
let settingsFrom = 'title';

function isRunning() {
  return game.state === 'running';
}

function setOverlayVisible(node, visible) {
  node.classList.toggle('visible', visible);
}

function updateHud(snapshot = game.getSnapshot()) {
  el.hudScore.textContent = `${snapshot.score}`;
  el.hudHigh.textContent = `${snapshot.highScore}`;
  el.hudWave.textContent = `${Math.max(1, snapshot.wave)}`;
  el.hudLives.textContent = `${snapshot.lives}`;
  el.hudCombo.textContent = `x${snapshot.combo}`;
}

function setPlayUiVisible(visible) {
  el.hud.classList.toggle('hidden', !visible);
  el.mobileControls.classList.toggle('hidden', !visible);
}

function showBossWarning(active) {
  el.bossWarning.classList.toggle('active', active);
}

function updateAudioFromSettings() {
  audio.setEnabled(settings.soundEnabled);
  el.soundToggle.checked = settings.soundEnabled;
}

function persistSettings() {
  Storage.setSettings(settings);
}

function applyGameStateUi() {
  const s = game.state;
  setOverlayVisible(el.startScreen, s === 'title');
  setOverlayVisible(el.pauseOverlay, s === 'paused');
  setOverlayVisible(el.gameOverOverlay, s === 'gameover');
  if (s !== 'paused') setOverlayVisible(el.settingsPanel, false);
  setPlayUiVisible(s === 'running' || s === 'paused' || s === 'gameover');

  if (s === 'gameover') {
    const snap = game.getSnapshot();
    el.gameOverText.textContent = `Final Score: ${snap.score}  •  Wave ${Math.max(1, snap.wave)}`;
    showBossWarning(false);
  }
}

function beginRun() {
  audio.init();
  audio.resume();
  updateAudioFromSettings();
  game.startRun();
  applyGameStateUi();
  updateHud();
}

function restartRun() {
  beginRun();
}

function backToTitle() {
  game.reset();
  game.state = 'title';
  applyGameStateUi();
  updateHud();
}

function openSettings(from) {
  settingsFrom = from;
  setOverlayVisible(el.settingsPanel, true);
}

function closeSettings() {
  setOverlayVisible(el.settingsPanel, false);
  if (settingsFrom === 'paused') applyGameStateUi();
}

function togglePause() {
  if (game.state === 'running') {
    game.pause();
  } else if (game.state === 'paused') {
    game.resume();
  }
  applyGameStateUi();
}

function bindHoldButton(button, key) {
  const down = (ev) => {
    ev.preventDefault();
    input[key] = true;
  };
  const up = (ev) => {
    ev.preventDefault();
    input[key] = false;
  };

  button.addEventListener('pointerdown', down, { passive: false });
  button.addEventListener('pointerup', up, { passive: false });
  button.addEventListener('pointercancel', up, { passive: false });
  button.addEventListener('pointerleave', up, { passive: false });
}

function bindKeyboard() {
  const map = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ' ': 'fire'
  };

  window.addEventListener('keydown', (ev) => {
    if (map[ev.key] && !ev.repeat) {
      ev.preventDefault();
      input[map[ev.key]] = true;
    }
    if (ev.key.toLowerCase() === 'p' || ev.key === 'Escape') {
      ev.preventDefault();
      togglePause();
    }
  });

  window.addEventListener('keyup', (ev) => {
    if (map[ev.key]) {
      ev.preventDefault();
      input[map[ev.key]] = false;
    }
  });
}

function bindUi() {
  el.startBtn.addEventListener('click', () => {
    audio.playUI();
    beginRun();
  });

  el.resumeBtn.addEventListener('click', () => {
    audio.playUI();
    game.resume();
    applyGameStateUi();
  });

  el.restartPauseBtn.addEventListener('click', () => {
    audio.playUI();
    restartRun();
  });

  el.restartOverBtn.addEventListener('click', () => {
    audio.playUI();
    restartRun();
  });

  el.backTitleBtn.addEventListener('click', () => {
    audio.playUI();
    backToTitle();
  });

  el.pauseBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    audio.playUI();
    togglePause();
  });

  el.openSettingsStart.addEventListener('click', () => {
    audio.playUI();
    openSettings('title');
  });

  el.openSettingsPause.addEventListener('click', () => {
    audio.playUI();
    openSettings('paused');
  });

  el.closeSettings.addEventListener('click', () => {
    audio.playUI();
    closeSettings();
  });

  el.soundToggle.addEventListener('change', () => {
    settings.soundEnabled = el.soundToggle.checked;
    updateAudioFromSettings();
    persistSettings();
  });

  el.resetHighScore.addEventListener('click', () => {
    audio.playUI();
    Storage.resetHighScore();
    game.highScore = 0;
    highScoreCache = 0;
    updateHud();
  });
}

function bindGlobalTouchBlock() {
  document.addEventListener(
    'touchmove',
    (ev) => {
      ev.preventDefault();
    },
    { passive: false }
  );
}

function handleResize() {
  renderer.resize();
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0);
  lastTs = ts;

  if (isRunning()) game.update(dt, input);
  const snapshot = game.getSnapshot();

  if (snapshot.highScore !== highScoreCache) {
    highScoreCache = snapshot.highScore;
    Storage.setHighScore(snapshot.highScore);
  }

  updateHud(snapshot);
  showBossWarning(snapshot.bossWarningTimer > 0 && game.state === 'running');
  renderer.render(snapshot);

  if (game.state === 'gameover') {
    for (const key of Object.keys(input)) input[key] = false;
  }

  applyGameStateUi();
  rafId = requestAnimationFrame(tick);
}

function init() {
  bindUi();
  bindKeyboard();
  bindHoldButton(el.leftBtn, 'left');
  bindHoldButton(el.rightBtn, 'right');
  bindHoldButton(el.fireBtn, 'fire');
  bindGlobalTouchBlock();

  updateAudioFromSettings();
  updateHud();
  applyGameStateUi();

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  handleResize();
  rafId = requestAnimationFrame((ts) => {
    lastTs = ts;
    rafId = requestAnimationFrame(tick);
  });
}

init();

window.addEventListener('beforeunload', () => {
  if (rafId) cancelAnimationFrame(rafId);
});
