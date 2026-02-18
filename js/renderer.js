import { FONT_3X5, PALETTE, SPRITES } from './sprites.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 320;
    this.height = 180;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;

    this.crtEnabled = true;
    this.shakeTimer = 0;
    this.oceanOffset = 0;
  }

  setCRT(enabled) {
    this.crtEnabled = Boolean(enabled);
  }

  triggerShake(duration = 0.35) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  beginFrame(dt) {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const amt = 1.25;
      const sx = (Math.random() * 2 - 1) * amt;
      const sy = (Math.random() * 2 - 1) * amt;
      this.ctx.translate(Math.round(sx), Math.round(sy));
    }

    this.oceanOffset = (this.oceanOffset + dt * 15) % 16;
  }

  clear(colorIndex = 0) {
    this.ctx.fillStyle = PALETTE[colorIndex];
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSky() {
    const bands = [4, 4, 3, 3, 2, 2, 1, 1];
    const bandHeight = Math.floor((this.height * 0.62) / bands.length);
    for (let i = 0; i < bands.length; i += 1) {
      this.ctx.fillStyle = PALETTE[bands[i]];
      this.ctx.fillRect(0, i * bandHeight, this.width, bandHeight + 1);
    }
  }

  drawOcean() {
    const tile = SPRITES.waveTile;
    const tileW = tile[0].length;
    const tileH = tile.length;
    const yStart = Math.floor(this.height * 0.62);

    for (let y = yStart; y < this.height; y += tileH) {
      for (let x = -tileW; x < this.width + tileW; x += tileW) {
        this.drawSprite(tile, Math.floor(x - this.oceanOffset), y, 1, false);
      }
    }
  }

  drawSprite(sprite, x, y, scale = 1, fromTable = true) {
    const rows = fromTable ? SPRITES[sprite] : sprite;
    if (!rows) return;

    for (let py = 0; py < rows.length; py += 1) {
      const row = rows[py];
      for (let px = 0; px < row.length; px += 1) {
        const key = row[px];
        if (key === '.') continue;
        const paletteIndex = parseInt(key, 16);
        if (Number.isNaN(paletteIndex) || PALETTE[paletteIndex] === undefined) continue;
        this.ctx.fillStyle = PALETTE[paletteIndex];
        this.ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
      }
    }
  }

  drawRect(x, y, w, h, colorIndex) {
    this.ctx.fillStyle = PALETTE[colorIndex];
    this.ctx.fillRect(x, y, w, h);
  }

  drawMeter(x, y, width, height, label, value, colorIndex) {
    const v = Math.max(0, Math.min(100, value));
    this.drawText(label, x, y - 7, 1, 5);
    this.drawRect(x, y, width, height, 0);
    this.drawRect(x + 1, y + 1, width - 2, height - 2, 1);
    const fillW = Math.floor((width - 2) * (v / 100));
    if (fillW > 0) {
      this.drawRect(x + 1, y + 1, fillW, height - 2, colorIndex);
    }
  }

  drawText(text, x, y, scale = 1, colorIndex = 5) {
    const upper = String(text).toUpperCase();
    let cursor = x;

    for (const char of upper) {
      const glyph = FONT_3X5[char] || FONT_3X5['?'];
      const glyphW = glyph[0].length;

      for (let gy = 0; gy < glyph.length; gy += 1) {
        const row = glyph[gy];
        for (let gx = 0; gx < row.length; gx += 1) {
          if (row[gx] !== '1') continue;
          this.ctx.fillStyle = PALETTE[colorIndex];
          this.ctx.fillRect(cursor + gx * scale, y + gy * scale, scale, scale);
        }
      }
      cursor += (glyphW + 1) * scale;
    }
  }

  drawFogOverlay(t) {
    for (let y = 0; y < this.height; y += 2) {
      for (let x = 0; x < this.width; x += 2) {
        const n = (x * 13 + y * 7 + Math.floor(t * 20)) % 9;
        if (n < 2) {
          this.ctx.fillStyle = 'rgba(231,242,248,0.2)';
          this.ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }

  drawStormOverlay(t) {
    for (let y = 0; y < this.height; y += 3) {
      const ox = Math.floor((y * 0.5 + t * 70) % 12);
      for (let x = -12; x < this.width + 12; x += 12) {
        this.ctx.fillStyle = 'rgba(185, 210, 225, 0.12)';
        this.ctx.fillRect(x + ox, y, 6, 1);
      }
    }
  }

  applyCRTEffects(time) {
    if (!this.crtEnabled) return;

    this.ctx.fillStyle = 'rgba(10, 16, 24, 0.14)';
    for (let y = 0; y < this.height; y += 2) {
      this.ctx.fillRect(0, y, this.width, 1);
    }

    const vignette = this.ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      this.height * 0.25,
      this.width * 0.5,
      this.height * 0.5,
      this.height * 0.72
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (Math.sin(time * 12) > 0.93) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.03)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
