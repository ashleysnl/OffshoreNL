const KEY = 'puffin-platform-panic.save.v1';

const DEFAULTS = {
  bestScore: 0,
  settings: {
    sound: true,
    crt: true
  }
};

function cloneDefaults() {
  return {
    bestScore: DEFAULTS.bestScore,
    settings: {
      sound: DEFAULTS.settings.sound,
      crt: DEFAULTS.settings.crt
    }
  };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadData() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return cloneDefaults();
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== 'object') return cloneDefaults();

  return {
    bestScore: Number(parsed.bestScore) || 0,
    settings: {
      sound: parsed.settings?.sound !== false,
      crt: parsed.settings?.crt !== false
    }
  };
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetData() {
  localStorage.removeItem(KEY);
  return cloneDefaults();
}
