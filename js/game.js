const METER_MAX = 100;

const EVENT_LIBRARY = [
  {
    id: 'fog',
    text: 'Fog thicker than pea soup!',
    immediate: { safety: -8 },
    ongoing: { safety: -2.4 },
    duration: 7,
    bonus: 10,
    tags: ['weather']
  },
  {
    id: 'iceberg',
    text: 'Iceberg drifting close!',
    immediate: { safety: -6 },
    ongoing: { safety: -7 },
    duration: 20,
    bonus: 22,
    tags: ['hazard'],
    clearAction: 'clearIceberg'
  },
  {
    id: 'squall',
    text: 'Atlantic squall hits sideways!',
    immediate: { production: -5, morale: -4 },
    ongoing: { production: -2, morale: -1.8 },
    duration: 8,
    bonus: 12,
    tags: ['weather']
  },
  {
    id: 'puffins',
    text: 'Puffins nesting on the helideck!',
    immediate: { production: -7 },
    ongoing: { production: -4.5 },
    duration: 16,
    bonus: 18,
    tags: ['puffin'],
    clearAction: 'shooPuffins'
  },
  {
    id: 'jiggs',
    text: 'Cook ran out of Jiggs dinner!',
    immediate: { morale: -10 },
    duration: 6,
    bonus: 8,
    tags: ['crew']
  },
  {
    id: 'coffee',
    text: 'Coffee machine acting up!',
    immediate: { morale: -5 },
    ongoing: { morale: -4 },
    duration: 16,
    bonus: 16,
    tags: ['crew'],
    clearAction: 'brewCoffee'
  },
  {
    id: 'crane',
    text: 'Crane jam!',
    immediate: { production: -9 },
    ongoing: { production: -5 },
    duration: 14,
    bonus: 16,
    tags: ['equipment'],
    clearAction: 'fixEquipment'
  },
  {
    id: 'alarmTest',
    text: 'Alarm test that nobody told you about!',
    immediate: { morale: -8 },
    duration: 4,
    bonus: 10,
    tags: ['alarm'],
    shake: 0.45
  },
  {
    id: 'seagullStrike',
    text: 'Seagull stole a wrench!',
    immediate: { production: -4, morale: -3 },
    duration: 5,
    bonus: 8,
    tags: ['crew']
  },
  {
    id: 'wetDeck',
    text: 'Deck got slippery with spray!',
    immediate: { safety: -7 },
    duration: 7,
    bonus: 10,
    tags: ['weather']
  }
];

const ACTIONS = {
  fixEquipment: {
    label: 'Fix Equipment',
    apply: { production: 16, morale: -4 },
    cooldown: 1.25,
    sfx: 'button'
  },
  clearIceberg: {
    label: 'Clear Iceberg',
    apply: { safety: 18, production: -4 },
    cooldown: 1.3,
    sfx: 'button'
  },
  brewCoffee: {
    label: 'Brew Coffee',
    apply: { morale: 16, production: -3 },
    cooldown: 1.1,
    sfx: 'button'
  },
  calmCrew: {
    label: 'Calm Crew',
    apply: { morale: 12, safety: -3 },
    cooldown: 1,
    sfx: 'button'
  },
  shooPuffins: {
    label: 'Shoo Puffins',
    apply: { production: 14, morale: -3 },
    cooldown: 1,
    sfx: 'button'
  },
  backupGenerator: {
    label: 'Start Backup Generator',
    apply: { production: 20, safety: -5 },
    cooldown: 2,
    sfx: 'button'
  }
};

function clampMeter(value) {
  return Math.max(0, Math.min(METER_MAX, value));
}

function pickRandomEvent(activeEvents) {
  const activeIds = new Set(activeEvents.map((e) => e.id));
  const pool = EVENT_LIBRARY.filter((event) => !activeIds.has(event.id));
  if (pool.length === 0) return null;
  return { ...pool[Math.floor(Math.random() * pool.length)] };
}

export class PuffinPlatformPanicGame {
  constructor() {
    this.state = 'start';
    this.lastTicker = 'KEEP THE SHIFT TOGETHER!';
    this.reset();
  }

  reset() {
    this.meters = {
      production: 78,
      safety: 80,
      morale: 76
    };
    this.activeEvents = [];
    this.cooldowns = {};
    this.timeSurvived = 0;
    this.score = 0;
    this.eventScore = 0;
    this.gameOverReason = '';
    this.nextEventAt = 2.5;
    this.tickerTime = 0;
    this.state = 'start';
  }

  getActions() {
    return ACTIONS;
  }

  start() {
    this.reset();
    this.state = 'running';
    this.lastTicker = 'SHIFT STARTED. HOLD THE LINE!';
  }

  togglePause() {
    if (this.state === 'running') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'running';
  }

  end(reason) {
    this.state = 'gameover';
    this.gameOverReason = reason;
  }

  applyDelta(delta, scale = 1) {
    if (!delta) return;
    for (const key of Object.keys(delta)) {
      if (this.meters[key] === undefined) continue;
      this.meters[key] = clampMeter(this.meters[key] + delta[key] * scale);
    }
  }

  triggerEvent(renderer, sfx) {
    const ev = pickRandomEvent(this.activeEvents);
    if (!ev) return;

    this.applyDelta(ev.immediate);
    ev.remaining = ev.duration;
    this.activeEvents.push(ev);
    this.lastTicker = ev.text;
    this.tickerTime = 3.2;

    if (ev.shake && renderer) renderer.triggerShake(ev.shake);
    if (sfx) sfx('alarm');
  }

  resolveEventsForAction(actionId) {
    let bonus = 0;
    const unresolved = [];

    for (const ev of this.activeEvents) {
      if (ev.clearAction === actionId) {
        bonus += ev.bonus;
      } else {
        unresolved.push(ev);
      }
    }

    this.activeEvents = unresolved;
    if (bonus > 0) {
      this.eventScore += bonus;
      this.score += bonus;
      this.lastTicker = 'EVENT CLEARED! +' + bonus;
      this.tickerTime = 2;
    }

    return bonus;
  }

  performAction(actionId) {
    if (this.state !== 'running') return { ok: false };
    const action = ACTIONS[actionId];
    if (!action) return { ok: false };

    const cd = this.cooldowns[actionId] || 0;
    if (cd > 0) return { ok: false, cooling: true };

    this.applyDelta(action.apply);
    this.resolveEventsForAction(actionId);
    this.cooldowns[actionId] = action.cooldown;

    return { ok: true, sfx: action.sfx };
  }

  update(dt, renderer, sfx) {
    if (this.state !== 'running') return;

    this.timeSurvived += dt;
    this.score = Math.floor(this.timeSurvived * 10 + this.eventScore);

    const difficulty = 1 + this.timeSurvived / 95;
    const decay = {
      production: -1.7 * difficulty,
      safety: -1.5 * difficulty,
      morale: -1.35 * difficulty
    };
    this.applyDelta(decay, dt);

    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }

    const remaining = [];
    for (const ev of this.activeEvents) {
      ev.remaining -= dt;
      if (ev.ongoing) this.applyDelta(ev.ongoing, dt);

      if (ev.remaining > 0) {
        remaining.push(ev);
      } else {
        if (ev.clearAction) {
          this.lastTicker = ev.text + ' PASSED ON ITS OWN.';
          this.tickerTime = 2.2;
        }
      }
    }
    this.activeEvents = remaining;

    this.nextEventAt -= dt;
    if (this.nextEventAt <= 0) {
      this.triggerEvent(renderer, sfx);
      const minGap = Math.max(1.4, 4.6 - this.timeSurvived * 0.025);
      const maxGap = Math.max(2.3, 7 - this.timeSurvived * 0.035);
      this.nextEventAt = minGap + Math.random() * (maxGap - minGap);
    }

    if (this.tickerTime > 0) this.tickerTime -= dt;
    if (this.tickerTime <= 0 && this.activeEvents.length > 0) {
      this.lastTicker = this.activeEvents[0].text;
      this.tickerTime = 1.1;
    }

    if (this.meters.production <= 0) this.end('Production collapsed');
    if (this.meters.safety <= 0) this.end('Safety redline reached');
    if (this.meters.morale <= 0) this.end('Morale cratered');
  }
}
