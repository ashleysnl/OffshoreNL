const KEYS = {
  highScore: 'gbb_high_score',
  settings: 'gbb_settings'
};

const defaultSettings = {
  soundEnabled: true
};

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore write failures in private mode or strict environments.
  }
}

export const Storage = {
  getHighScore() {
    const value = Number(safeRead(KEYS.highScore, 0));
    return Number.isFinite(value) ? value : 0;
  },

  setHighScore(score) {
    safeWrite(KEYS.highScore, Math.max(0, Math.floor(score)));
  },

  resetHighScore() {
    safeWrite(KEYS.highScore, 0);
  },

  getSettings() {
    const value = safeRead(KEYS.settings, defaultSettings);
    return {
      ...defaultSettings,
      ...(value && typeof value === 'object' ? value : {})
    };
  },

  setSettings(settings) {
    safeWrite(KEYS.settings, {
      ...defaultSettings,
      ...settings
    });
  }
};
