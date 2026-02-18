const LOGICAL_WIDTH = 1080;
const LOGICAL_HEIGHT = 1920;

const deckLine = LOGICAL_HEIGHT * 0.78;

const enemyCatalog = {
  cod: { name: 'Cod Chunk', hp: 1, points: 110, speed: 38, radius: 34, color: '#9fc0cf' },
  biscuit: { name: 'Tea Biscuit Bomber', hp: 2, points: 160, speed: 42, radius: 36, color: '#d6ba82' },
  gravy: { name: 'Gravy Goblin', hp: 2, points: 170, speed: 35, radius: 34, color: '#8e6e49' },
  screech: { name: 'Screech Bottle', hp: 1, points: 190, speed: 66, radius: 29, color: '#8fd8d9' },
  jiggs: { name: 'Jiggs Dinner Stack', hp: 5, points: 260, speed: 28, radius: 44, color: '#f2ccb4' },
  fogged: { name: 'Fogged Bologna', hp: 2, points: 210, speed: 46, radius: 33, color: '#d6a5b1' }
};

const nonBossTypes = Object.keys(enemyCatalog);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function chooseEnemy(wave, col, row) {
  if (wave === 1) return 'cod';
  const pool = ['cod', 'biscuit', 'gravy', 'screech'];
  if (wave >= 2) pool.push('fogged');
  if (wave >= 3) pool.push('jiggs');
  if ((col + row + wave) % 5 === 0) return 'screech';
  if ((col + wave) % 7 === 0) return 'jiggs';
  return pool[Math.floor(Math.random() * pool.length)];
}

export class Game {
  constructor({ audio, highScore = 0 }) {
    this.audio = audio;
    this.highScore = highScore;
    this.reset();
  }

  reset() {
    this.state = 'title';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.wave = 0;
    this.waveClearDelay = 0;
    this.globalTime = 0;
    this.cameraShake = 0;
    this.bossWarningTimer = 0;

    this.player = {
      x: LOGICAL_WIDTH * 0.5,
      y: deckLine - 88,
      w: 78,
      h: 52,
      baseSpeed: 520,
      lives: 5,
      fireCooldown: 0,
      slowTimer: 0,
      reversedTimer: 0,
      autoFireTimer: 0
    };

    this.projectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    this.waveBonus = 0;
    this.boss = null;
  }

  startRun() {
    this.reset();
    this.state = 'running';
    this.startWave(1);
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'running';
  }

  getMultiplier() {
    return 1 + Math.floor(this.combo / 5);
  }

  addScore(base) {
    const gain = Math.floor(base * this.getMultiplier());
    this.score += gain;
    if (this.score > this.highScore) this.highScore = this.score;
  }

  spawnParticles(x, y, count, color, speed = 420) {
    for (let i = 0; i < count; i += 1) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(speed * 0.35, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.7),
        age: 0,
        r: rand(4, 10),
        color
      });
    }
  }

  spawnEnemyProjectile(x, y, vx, vy, type = 'crumb') {
    this.enemyProjectiles.push({ x, y, vx, vy, r: type === 'note' ? 10 : 9, type, life: 5, trail: [] });
  }

  killEnemy(enemy, byPlayer = true) {
    enemy.dead = true;
    this.spawnParticles(enemy.x, enemy.y, enemy.type === 'jiggs' ? 24 : 14, enemy.color);
    this.audio.playExplosion(enemy.type === 'jiggs');
    if (byPlayer) {
      this.combo += 1;
      this.comboTimer = 2.2;
      this.addScore(enemy.points);
      if (Math.random() < 0.06) {
        this.powerups.push({
          type: 'integrity',
          x: enemy.x,
          y: enemy.y,
          r: 20,
          vy: 105,
          life: 9
        });
      }
    }
    if (enemy.type === 'jiggs') this.cameraShake = Math.max(this.cameraShake, 12);
  }

  hitPlayer() {
    this.player.lives -= 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.audio.playPlayerHit();
    this.cameraShake = Math.max(this.cameraShake, 8);
    if (this.player.lives <= 0) {
      this.state = 'gameover';
    }
  }

  firePlayerShot() {
    this.projectiles.push({
      x: this.player.x,
      y: this.player.y - 36,
      vx: 0,
      vy: -900,
      r: 8,
      life: 2.1,
      trail: []
    });
    this.player.fireCooldown = 0.16;
    this.audio.playShoot();
  }

  startWave(n) {
    this.wave = n;
    this.waveBonus = 0;
    this.enemies = [];
    this.enemyProjectiles = [];
    this.powerups = [];

    const isBossWave = n % 4 === 0;
    if (isBossWave) {
      this.bossWarningTimer = 2.5;
      this.audio.playBossWarning();
      this.cameraShake = 14;
      this.boss = {
        x: LOGICAL_WIDTH * 0.5,
        y: 230,
        w: 220,
        h: 120,
        hp: 42 + n * 11,
        maxHp: 42 + n * 11,
        dir: 1,
        shootTimer: 0,
        reversePulseTimer: 2.8,
        phase: 0
      };
      return;
    }

    this.boss = null;
    const rows = clamp(2 + Math.floor(n * 0.45), 2, 6);
    const cols = clamp(6 + Math.floor(n * 0.4), 6, 10);
    const spacingX = 95;
    const spacingY = 90;
    const startX = LOGICAL_WIDTH * 0.5 - ((cols - 1) * spacingX) / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const type = chooseEnemy(n, col, row);
        const cfg = enemyCatalog[type];
        this.enemies.push({
          type,
          x: startX + col * spacingX,
          y: 150 + row * spacingY,
          originX: startX + col * spacingX,
          hp: cfg.hp + Math.floor(n * 0.15),
          points: cfg.points,
          speed: cfg.speed + n * 4,
          radius: cfg.radius,
          color: cfg.color,
          phase: rand(0, Math.PI * 2),
          fireTimer: rand(0.4, 3.2),
          dead: false,
          alpha: 1
        });
      }
    }
  }

  updatePlayer(dt, input) {
    const speedScale = this.player.slowTimer > 0 ? 0.55 : 1;
    const reverse = this.player.reversedTimer > 0 ? -1 : 1;
    const dx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * reverse;
    this.player.x += dx * this.player.baseSpeed * speedScale * dt;
    this.player.x = clamp(this.player.x, 58, LOGICAL_WIDTH - 58);

    this.player.fireCooldown = Math.max(0, this.player.fireCooldown - dt);
    this.player.slowTimer = Math.max(0, this.player.slowTimer - dt);
    this.player.reversedTimer = Math.max(0, this.player.reversedTimer - dt);

    if (input.fire) {
      this.player.autoFireTimer -= dt;
      if (this.player.autoFireTimer <= 0 && this.player.fireCooldown <= 0) {
        this.firePlayerShot();
        this.player.autoFireTimer = 0.08;
      }
    } else {
      this.player.autoFireTimer = 0;
    }
  }

  updateBoss(dt) {
    if (!this.boss || this.bossWarningTimer > 0) return;

    this.boss.phase += dt * 1.4;
    this.boss.x += this.boss.dir * (190 + this.wave * 12) * dt;
    this.boss.y = 220 + Math.sin(this.boss.phase) * 18;

    if (this.boss.x < 130 || this.boss.x > LOGICAL_WIDTH - 130) this.boss.dir *= -1;

    this.boss.shootTimer -= dt;
    if (this.boss.shootTimer <= 0) {
      const volley = 3 + Math.floor(this.wave / 4);
      for (let i = 0; i < volley; i += 1) {
        const spread = (-volley / 2 + i + 0.5) * 0.24;
        this.spawnEnemyProjectile(this.boss.x + spread * 55, this.boss.y + 40, spread * 230, 300 + this.wave * 12, 'note');
      }
      this.audio.playBossNote();
      this.boss.shootTimer = Math.max(0.7, 1.35 - this.wave * 0.04);
    }

    this.boss.reversePulseTimer -= dt;
    if (this.boss.reversePulseTimer <= 0) {
      this.player.reversedTimer = 1.7;
      this.boss.reversePulseTimer = rand(4.8, 6.5);
    }
  }

  updateEnemies(dt) {
    const drift = 12 + this.wave * 4;
    const swing = 56;
    const time = this.globalTime;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.phase += dt * 1.4;

      if (enemy.type === 'screech') {
        enemy.x += Math.sin(time * 5 + enemy.phase) * (enemy.speed * 0.55) * dt;
      } else {
        enemy.x = enemy.originX + Math.sin(time * 1.7 + enemy.phase) * swing;
      }

      enemy.y += drift * dt;
      if (enemy.type === 'fogged') {
        enemy.alpha = 0.25 + (Math.sin(time * 3.2 + enemy.phase) * 0.5 + 0.5) * 0.6;
      }

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        if (enemy.type === 'biscuit') {
          this.spawnEnemyProjectile(enemy.x, enemy.y + 26, rand(-60, 60), 280 + this.wave * 8, 'crumb');
        } else if (enemy.type === 'gravy') {
          this.spawnEnemyProjectile(enemy.x, enemy.y + 26, 0, 260 + this.wave * 10, 'gravy');
        }
        enemy.fireTimer = rand(1.4, 3.5);
      }

      if (enemy.y + enemy.radius >= deckLine) {
        this.state = 'gameover';
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.15 });
      if (p.trail.length > 5) p.trail.shift();
      for (const t of p.trail) t.life -= dt;
      p.trail = p.trail.filter((t) => t.life > 0);

      if (this.boss && this.bossWarningTimer <= 0) {
        const hitBoss =
          p.x > this.boss.x - this.boss.w * 0.5 &&
          p.x < this.boss.x + this.boss.w * 0.5 &&
          p.y > this.boss.y - this.boss.h * 0.5 &&
          p.y < this.boss.y + this.boss.h * 0.5;
        if (hitBoss) {
          this.boss.hp -= 1;
          p.life = 0;
          this.audio.playEnemyHit();
          this.spawnParticles(p.x, p.y, 5, '#ffc857', 220);
          this.combo += 1;
          this.comboTimer = 2;
          this.addScore(42);
          if (this.boss.hp <= 0) {
            this.spawnParticles(this.boss.x, this.boss.y, 46, '#ff8a3d', 520);
            this.audio.playExplosion(true);
            this.cameraShake = 16;
            this.waveBonus = 550 * this.wave;
            this.addScore(this.waveBonus);
            this.boss = null;
            this.waveClearDelay = 1.4;
          }
        }
      }

      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        if (dx * dx + dy * dy < (p.r + e.radius * 0.7) ** 2) {
          e.hp -= 1;
          p.life = 0;
          this.audio.playEnemyHit();
          if (e.hp <= 0) {
            this.killEnemy(e, true);
          } else {
            this.spawnParticles(p.x, p.y, 4, '#f2f5f7', 180);
          }
          break;
        }
      }
    }

    for (const p of this.enemyProjectiles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y, life: 0.18 });
      if (p.trail.length > 5) p.trail.shift();
      for (const t of p.trail) t.life -= dt;
      p.trail = p.trail.filter((t) => t.life > 0);

      const hit =
        p.x > this.player.x - this.player.w * 0.5 &&
        p.x < this.player.x + this.player.w * 0.5 &&
        p.y > this.player.y - this.player.h * 0.5 &&
        p.y < this.player.y + this.player.h * 0.5;
      if (hit) {
        p.life = 0;
        this.hitPlayer();
        if (p.type === 'gravy') this.player.slowTimer = 2.2;
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.y > -80);
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.life > 0 && p.y < LOGICAL_HEIGHT + 80);
  }

  updatePowerups(dt) {
    for (const item of this.powerups) {
      item.life -= dt;
      item.y += item.vy * dt;
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      if (dx * dx + dy * dy < (item.r + 28) ** 2) {
        item.life = 0;
        this.player.lives = clamp(this.player.lives + 1, 0, 7);
        this.audio.playEnemyHit();
        this.spawnParticles(item.x, item.y, 12, '#1fa3a3', 260);
      }
    }
    this.powerups = this.powerups.filter((i) => i.life > 0 && i.y < LOGICAL_HEIGHT + 60);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vy += 80 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  updateWaveProgress(dt) {
    const noEnemies = this.enemies.length === 0 && !this.boss;
    if (this.state !== 'running') return;

    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
      return;
    }

    if (noEnemies) {
      this.waveClearDelay -= dt;
      if (this.waveClearDelay <= 0) {
        const bonus = 180 * this.wave;
        this.waveBonus = bonus;
        this.addScore(bonus);
        this.startWave(this.wave + 1);
      }
    }
  }

  update(dt, input) {
    if (this.state !== 'running') return;

    this.globalTime += dt;
    this.cameraShake = Math.max(0, this.cameraShake - dt * 22);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;

    this.updatePlayer(dt, input);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updatePowerups(dt);
    this.updateParticles(dt);
    this.updateWaveProgress(dt);

    if (this.score > this.highScore) this.highScore = this.score;
  }

  getDeckLine() {
    return deckLine;
  }

  getDimensions() {
    return { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };
  }

  getSnapshot() {
    return {
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      lives: this.player.lives,
      combo: this.getMultiplier(),
      deckLine,
      cameraShake: this.cameraShake,
      bossWarningTimer: this.bossWarningTimer,
      player: this.player,
      enemies: this.enemies,
      boss: this.boss,
      projectiles: this.projectiles,
      enemyProjectiles: this.enemyProjectiles,
      particles: this.particles,
      powerups: this.powerups,
      time: this.globalTime
    };
  }
}

export function getEnemyCatalog() {
  return enemyCatalog;
}

export function getNonBossTypes() {
  return nonBossTypes;
}
