import { getEnemyCatalog } from './game.js';

const palette = {
  deepNavy: '#0B1C2C',
  oceanBlue: '#123A5A',
  teal: '#1FA3A3',
  steel: '#8A9BA8',
  darkSteel: '#5F6E78',
  warning: '#FF8A3D',
  flare: '#FFC857',
  uiWhite: '#F2F5F7',
  shadow: 'rgba(0,0,0,0.25)'
};

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.game = game;
    this.enemyCatalog = getEnemyCatalog();
    this.flarePulse = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const logical = this.game.getDimensions();
    this.scale = Math.min(rect.width / logical.width, rect.height / logical.height);
    this.offsetX = (rect.width - logical.width * this.scale) * 0.5;
    this.offsetY = (rect.height - logical.height * this.scale) * 0.5;
  }

  withCamera(snapshot, fn) {
    const { ctx } = this;
    const shakeX = (Math.random() - 0.5) * snapshot.cameraShake;
    const shakeY = (Math.random() - 0.5) * snapshot.cameraShake;
    ctx.save();
    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.scale(this.scale, this.scale);
    fn();
    ctx.restore();
  }

  drawBackground(snapshot) {
    const { ctx } = this;
    const { width, height } = this.game.getDimensions();

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0a2236');
    sky.addColorStop(0.55, '#123A5A');
    sky.addColorStop(1, '#0f324e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const oceanTop = height * 0.55;
    const ocean = ctx.createLinearGradient(0, oceanTop, 0, height);
    ocean.addColorStop(0, 'rgba(23,83,120,0.35)');
    ocean.addColorStop(1, 'rgba(11,28,44,0.9)');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, oceanTop, width, height - oceanTop);

    for (let i = 0; i < 8; i += 1) {
      const y = oceanTop + i * 45;
      const wobble = Math.sin(snapshot.time * 1.1 + i * 0.6) * 8;
      ctx.strokeStyle = `rgba(189,224,242,${0.08 - i * 0.007})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y + wobble);
      ctx.bezierCurveTo(width * 0.25, y - 10 + wobble, width * 0.6, y + 15 + wobble, width, y + wobble);
      ctx.stroke();
    }

    const fogAlpha = 0.06 + Math.sin(snapshot.time * 0.6) * 0.02;
    ctx.fillStyle = `rgba(235,247,255,${fogAlpha})`;
    ctx.fillRect(0, 0, width, height);
  }

  drawPlatform(snapshot) {
    const { ctx } = this;
    const { width, height } = this.game.getDimensions();
    const deckY = snapshot.deckLine;

    ctx.save();
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;

    for (let i = 0; i < 4; i += 1) {
      const x = width * 0.17 + i * width * 0.2;
      const colGrad = ctx.createLinearGradient(x - 52, deckY, x + 52, deckY + 320);
      colGrad.addColorStop(0, '#7b8c98');
      colGrad.addColorStop(0.5, '#93a6b3');
      colGrad.addColorStop(1, '#5e6e78');
      roundRect(ctx, x - 52, deckY - 10, 104, 310, 50);
      ctx.fillStyle = colGrad;
      ctx.fill();
    }

    const deckGrad = ctx.createLinearGradient(0, deckY - 250, 0, deckY + 80);
    deckGrad.addColorStop(0, '#a2b2bd');
    deckGrad.addColorStop(1, '#657682');
    roundRect(ctx, 90, deckY - 260, width - 180, 230, 20);
    ctx.fillStyle = deckGrad;
    ctx.fill();

    roundRect(ctx, 170, deckY - 320, width - 340, 80, 14);
    ctx.fillStyle = '#768794';
    ctx.fill();

    roundRect(ctx, width * 0.38, deckY - 540, 120, 220, 24);
    roundRect(ctx, width * 0.52, deckY - 560, 120, 240, 24);
    ctx.fillStyle = '#738592';
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = '#d7bd6a';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(170, deckY - 300);
    ctx.lineTo(84, deckY - 460);
    ctx.stroke();

    ctx.strokeStyle = '#9eb0be';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(width - 160, deckY - 300);
    ctx.lineTo(width - 20, deckY - 500);
    ctx.stroke();

    this.flarePulse += 0.11;
    const glow = 0.65 + (Math.sin(this.flarePulse) * 0.5 + 0.5) * 0.5;
    const flareX = width - 20;
    const flareY = deckY - 500;

    const flareGrad = ctx.createRadialGradient(flareX, flareY, 4, flareX, flareY, 38);
    flareGrad.addColorStop(0, `rgba(255,230,120,${0.9 * glow})`);
    flareGrad.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(flareX, flareY, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffb14e';
    ctx.beginPath();
    ctx.moveTo(flareX, flareY - 26);
    ctx.quadraticCurveTo(flareX + 12, flareY - 6, flareX, flareY + 12);
    ctx.quadraticCurveTo(flareX - 12, flareY - 4, flareX, flareY - 26);
    ctx.fill();

    ctx.fillStyle = 'rgba(8, 18, 26, 0.5)';
    ctx.fillRect(0, deckY - 3, width, 6);
  }

  drawPlayer(player, time) {
    const { ctx } = this;
    const bounce = Math.sin(time * 6) * 2;
    const x = player.x;
    const y = player.y + bounce;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(-50, -10, 50, 22);
    body.addColorStop(0, '#8fa0ad');
    body.addColorStop(1, '#5f6e78');
    roundRect(ctx, -42, -18, 84, 38, 12);
    ctx.fillStyle = body;
    ctx.fill();

    roundRect(ctx, -16, -42, 32, 24, 8);
    ctx.fillStyle = '#90a7b6';
    ctx.fill();

    ctx.strokeStyle = '#d8e8f0';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(0, -76);
    ctx.stroke();

    ctx.restore();
  }

  drawEnemy(enemy, time) {
    const { ctx } = this;
    const b = Math.sin(time * 3 + enemy.phase) * 5;
    const x = enemy.x;
    const y = enemy.y + b;
    const r = enemy.radius;

    ctx.save();
    ctx.globalAlpha = enemy.alpha ?? 1;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.85, r * 0.68, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#f2f5f7');
    g.addColorStop(1, enemy.color);
    ctx.fillStyle = g;

    if (enemy.type === 'screech') {
      roundRect(ctx, x - r * 0.55, y - r * 0.95, r * 1.1, r * 1.85, 14);
      ctx.fill();
      ctx.fillStyle = '#24566a';
      roundRect(ctx, x - r * 0.32, y - r * 0.72, r * 0.64, r * 0.46, 8);
      ctx.fill();
    } else if (enemy.type === 'jiggs') {
      roundRect(ctx, x - r, y - r * 0.8, r * 2, r * 0.7, 15);
      ctx.fill();
      ctx.fillStyle = '#cfa987';
      roundRect(ctx, x - r * 0.85, y - r * 0.08, r * 1.7, r * 0.62, 14);
      ctx.fill();
    } else {
      roundRect(ctx, x - r, y - r * 0.76, r * 2, r * 1.5, 20);
      ctx.fill();
    }

    if (enemy.type === 'fogged') {
      ctx.strokeStyle = 'rgba(242,245,247,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBoss(boss, time) {
    if (!boss) return;
    const { ctx } = this;
    const x = boss.x;
    const y = boss.y;

    ctx.save();

    const glow = ctx.createRadialGradient(x, y, 30, x, y, 160);
    glow.addColorStop(0, 'rgba(255,138,61,0.2)');
    glow.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 160, 0, Math.PI * 2);
    ctx.fill();

    const shell = ctx.createLinearGradient(x - 120, y - 40, x + 120, y + 60);
    shell.addColorStop(0, '#ffd7b0');
    shell.addColorStop(1, '#b37d54');
    roundRect(ctx, x - 110, y - 52, 220, 120, 26);
    ctx.fillStyle = shell;
    ctx.fill();

    for (let i = -2; i <= 2; i += 1) {
      ctx.strokeStyle = 'rgba(35,20,10,0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 80 + i * 40, y - 40);
      ctx.lineTo(x - 80 + i * 40, y + 50);
      ctx.stroke();
    }

    for (let i = 0; i < 3; i += 1) {
      const bx = x - 60 + i * 60;
      const by = y - 70 + Math.sin(time * 6 + i) * 4;
      ctx.fillStyle = '#1fa3a3';
      ctx.beginPath();
      ctx.arc(bx, by, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2f5f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 18);
      ctx.lineTo(bx, by - 30);
      ctx.stroke();
    }

    const hpW = 240;
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    roundRect(ctx, x - hpW * 0.5, y + 80, hpW, 18, 8);
    ctx.fillStyle = 'rgba(12,20,28,0.65)';
    ctx.fill();
    roundRect(ctx, x - hpW * 0.5 + 2, y + 82, (hpW - 4) * hpRatio, 14, 6);
    ctx.fillStyle = '#ff8a3d';
    ctx.fill();

    ctx.restore();
  }

  drawProjectile(p, enemy = false) {
    const { ctx } = this;
    ctx.save();
    for (const t of p.trail) {
      ctx.globalAlpha = Math.max(0, t.life / 0.18) * (enemy ? 0.45 : 0.55);
      ctx.fillStyle = enemy ? '#ff9a5c' : '#5de9f1';
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 2.5);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, enemy ? '#ff8a3d' : '#1fa3a3');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPowerup(item, time) {
    const { ctx } = this;
    const pulse = 1 + Math.sin(time * 5 + item.x * 0.01) * 0.08;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = 'rgba(31,163,163,0.24)';
    ctx.beginPath();
    ctx.arc(0, 0, item.r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1fa3a3';
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f2f5f7';
    roundRect(ctx, -4, -11, 8, 22, 3);
    ctx.fill();
    roundRect(ctx, -11, -4, 22, 8, 3);
    ctx.fill();

    ctx.restore();
  }

  drawParticles(particles) {
    const { ctx } = this;
    for (const p of particles) {
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  render(snapshot) {
    const { ctx } = this;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    this.withCamera(snapshot, () => {
      this.drawBackground(snapshot);
      this.drawPlatform(snapshot);

      for (const enemy of snapshot.enemies) this.drawEnemy(enemy, snapshot.time);
      this.drawBoss(snapshot.boss, snapshot.time);
      for (const p of snapshot.projectiles) this.drawProjectile(p, false);
      for (const p of snapshot.enemyProjectiles) this.drawProjectile(p, true);
      for (const item of snapshot.powerups) this.drawPowerup(item, snapshot.time);
      this.drawPlayer(snapshot.player, snapshot.time);
      this.drawParticles(snapshot.particles);
    });
  }
}
