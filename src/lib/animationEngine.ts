import {
  BeatVisualDirection,
  CharacterAppearance,
  CharacterBible,
  StoryboardBeat,
  StoryboardData,
  VisualStyleId,
} from '../types';
import { buildSubtitleCues } from './scriptUtils';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const TOTAL_DURATION_SEC = 30;

interface PaletteColors {
  skyTop: string;
  skyBottom: string;
  wall: string;
  wallAccent: string;
  wood: string;
  woodDark: string;
  foliage: string;
  sunlight: string;
  ink: string;
}

const PALETTES: Record<CharacterBible['paletteMood'], PaletteColors> = {
  morning_sage: {
    skyTop: '#CFE4E7',
    skyBottom: '#F5F7EE',
    wall: '#EDF2EE',
    wallAccent: '#D8E5DD',
    wood: '#C69F79',
    woodDark: '#9A7654',
    foliage: '#7BA087',
    sunlight: 'rgba(255, 249, 224, 0.42)',
    ink: '#293536',
  },
  golden_afternoon: {
    skyTop: '#D8E3EC',
    skyBottom: '#FBEBD4',
    wall: '#F3EFE6',
    wallAccent: '#E3DACB',
    wood: '#C5966B',
    woodDark: '#8E6644',
    foliage: '#789A78',
    sunlight: 'rgba(255, 232, 185, 0.45)',
    ink: '#2E2B29',
  },
  twilight_calm: {
    skyTop: '#9BB0C7',
    skyBottom: '#E9D6CE',
    wall: '#E8EBF0',
    wallAccent: '#D5DCE6',
    wood: '#A98468',
    woodDark: '#785B45',
    foliage: '#5F7F75',
    sunlight: 'rgba(255, 215, 186, 0.34)',
    ink: '#252B36',
  },
  rainy_cozy: {
    skyTop: '#B5C5CF',
    skyBottom: '#DCE5E9',
    wall: '#EAEFF1',
    wallAccent: '#D6E0E4',
    wood: '#B38E6F',
    woodDark: '#82634B',
    foliage: '#628578',
    sunlight: 'rgba(246, 236, 206, 0.30)',
    ink: '#253138',
  },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = clamp(((num >> 16) & 255) + Math.round(2.55 * percent), 0, 255);
  const g = clamp(((num >> 8) & 255) + Math.round(2.55 * percent), 0, 255);
  const b = clamp((num & 255) + Math.round(2.55 * percent), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawSettingBackground(
  ctx: CanvasRenderingContext2D,
  settingType: CharacterBible['settingType'],
  palette: PaletteColors,
  style: VisualStyleId,
  t: number
) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  // Sky / backdrop gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, palette.skyTop);
  skyGrad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Watercolor subtle paper wash blooms
  if (style === 'watercolor') {
    const washes = [
      { x: 240, y: 160, r: 340, color: 'rgba(182, 212, 206, 0.25)' },
      { x: 1020, y: 200, r: 380, color: 'rgba(244, 219, 190, 0.28)' },
      { x: 640, y: 500, r: 420, color: 'rgba(218, 226, 208, 0.22)' },
    ];
    for (const w of washes) {
      const rg = ctx.createRadialGradient(w.x, w.y, 20, w.x, w.y, w.r);
      rg.addColorStop(0, w.color);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Setting architecture
  if (settingType === 'cafe' || settingType === 'library' || settingType === 'dorm_studio') {
    // Interior wall
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, 0, W, H * 0.78);

    // Lower wainscoting
    ctx.fillStyle = palette.wallAccent;
    ctx.fillRect(0, H * 0.56, W, H * 0.22);

    // Large sunlit window on left-center
    const winX = 110;
    const winY = 64;
    const winW = 540;
    const winH = 340;

    // Outside sky through window
    const winSky = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    winSky.addColorStop(0, palette.skyTop);
    winSky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = winSky;
    drawRoundedRect(ctx, winX, winY, winW, winH, 14);
    ctx.fill();

    // Soft distant campus trees outside window
    ctx.save();
    drawRoundedRect(ctx, winX, winY, winW, winH, 14);
    ctx.clip();
    const sway = Math.sin(t * 0.8) * 6;
    ctx.fillStyle = palette.foliage;
    ctx.beginPath();
    ctx.arc(winX + 90 + sway, winY + winH - 30, 95, 0, Math.PI * 2);
    ctx.arc(winX + 240 - sway * 0.5, winY + winH - 10, 110, 0, Math.PI * 2);
    ctx.arc(winX + 440 + sway * 0.7, winY + winH - 25, 105, 0, Math.PI * 2);
    ctx.fill();

    // Soft clouds drifting
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    const cx = winX + ((t * 14) % (winW + 160)) - 80;
    ctx.beginPath();
    ctx.arc(cx, winY + 84, 34, 0, Math.PI * 2);
    ctx.arc(cx + 32, winY + 76, 40, 0, Math.PI * 2);
    ctx.arc(cx + 68, winY + 86, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Window mullions
    ctx.strokeStyle = palette.woodDark;
    ctx.lineWidth = style === 'clay' ? 14 : 9;
    drawRoundedRect(ctx, winX, winY, winW, winH, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY);
    ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH * 0.52);
    ctx.lineTo(winX + winW, winY + winH * 0.52);
    ctx.stroke();

    // Bookshelf or cafe shelves on right
    const shelfX = 760;
    const shelfY = 92;
    const shelfW = 390;
    const shelfH = 290;
    ctx.fillStyle = shadeHex(palette.wood, -6);
    drawRoundedRect(ctx, shelfX, shelfY, shelfW, shelfH, 12);
    ctx.fill();
    ctx.fillStyle = shadeHex(palette.wood, -18);
    for (let row = 0; row < 3; row++) {
      const ry = shelfY + 24 + row * 86;
      ctx.fillRect(shelfX + 18, ry, shelfW - 36, 66);
      // Decorative muted books / ceramic jars
      const bookColors = ['#6D8C85', '#C7A98B', '#8FA3B3', '#B8897A', '#A2B39B', '#D5C5AE'];
      let bx = shelfX + 28;
      for (let b = 0; b < 8; b++) {
        const bw = 24 + ((b * 7 + row * 5) % 16);
        const bh = 44 + ((b * 11 + row * 3) % 16);
        ctx.fillStyle = bookColors[(b + row * 2) % bookColors.length];
        drawRoundedRect(ctx, bx, ry + 66 - bh, bw, bh, 4);
        ctx.fill();
        bx += bw + 6;
        if (bx > shelfX + shelfW - 50) break;
      }
      ctx.fillStyle = shadeHex(palette.wood, -18);
    }

    // Hanging pendant lamp
    const lampX = 640;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lampX, 0);
    ctx.lineTo(lampX, 74);
    ctx.stroke();
    ctx.fillStyle = '#F7F1E1';
    ctx.beginPath();
    ctx.arc(lampX, 94, 34, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    if (style === '2d-animation' || style === 'watercolor') {
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Diagonal sunlit window beam
    ctx.fillStyle = palette.sunlight;
    ctx.beginPath();
    ctx.moveTo(winX + 40, winY + 10);
    ctx.lineTo(winX + winW, winY + 10);
    ctx.lineTo(winX + winW + 260, H);
    ctx.lineTo(winX + 160, H);
    ctx.closePath();
    ctx.fill();
  } else {
    // Outdoor rooftop / campus park
    // Distant gentle hills & university hall silhouettes
    ctx.fillStyle = shadeHex(palette.foliage, 12);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62);
    ctx.quadraticCurveTo(320, H * 0.44, 680, H * 0.58);
    ctx.quadraticCurveTo(980, H * 0.46, W, H * 0.56);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Soft campus buildings in background
    ctx.fillStyle = palette.wallAccent;
    drawRoundedRect(ctx, 140, 290, 220, 170, 8);
    ctx.fill();
    drawRoundedRect(ctx, 920, 260, 240, 190, 8);
    ctx.fill();

    // Swaying campus trees
    const sway = Math.sin(t * 0.9) * 7;
    ctx.fillStyle = palette.foliage;
    ctx.beginPath();
    ctx.arc(120 + sway, 320, 110, 0, Math.PI * 2);
    ctx.arc(1140 - sway, 310, 125, 0, Math.PI * 2);
    ctx.fill();

    // Rooftop railing / park terrace floor
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
    ctx.strokeStyle = palette.woodDark;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.56);
    ctx.lineTo(W, H * 0.56);
    ctx.stroke();
    for (let rx = 60; rx < W; rx += 95) {
      ctx.beginPath();
      ctx.moveTo(rx, H * 0.56);
      ctx.lineTo(rx, H * 0.68);
      ctx.stroke();
    }
  }

  // Live-action cinematic bokeh light orbs in background
  if (style === 'live-action') {
    const orbs = [
      { x: 180, y: 150, r: 44, a: 0.28 },
      { x: 340, y: 230, r: 28, a: 0.22 },
      { x: 910, y: 130, r: 52, a: 0.26 },
      { x: 1110, y: 240, r: 36, a: 0.24 },
      { x: 640, y: 120, r: 30, a: 0.2 },
    ];
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const ox = o.x + Math.sin(t * 0.5 + i) * 14;
      const oy = o.y + Math.cos(t * 0.4 + i) * 8;
      const rg = ctx.createRadialGradient(ox, oy, 4, ox, oy, o.r);
      rg.addColorStop(0, `rgba(255, 246, 218, ${o.a})`);
      rg.addColorStop(1, 'rgba(255, 246, 218, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: CharacterAppearance,
  side: 'left' | 'right',
  emotion: BeatVisualDirection['emotionA'],
  pose: BeatVisualDirection['poseA'],
  isSpeaking: boolean,
  mouthOpen: number, // 0..1
  style: VisualStyleId,
  inkColor: string,
  t: number
) {
  ctx.save();
  const baseX = side === 'left' ? 405 : 875;
  const baseY = 535;
  const facing = side === 'left' ? 1 : -1;

  // Natural breathing & subtle speaking nod
  const breatheY = Math.sin(t * 2.1 + (side === 'left' ? 0 : 1.7)) * 3.5;
  const speakBob = isSpeaking ? Math.sin(t * 8.5) * (2.5 * mouthOpen) : 0;
  const headTilt =
    emotion === 'thoughtful'
      ? 0.06 * facing
      : emotion === 'overjoyed' || emotion === 'laughing'
      ? Math.sin(t * 4.5) * 0.04
      : isSpeaking
      ? Math.sin(t * 3.2) * 0.025
      : 0;

  ctx.translate(baseX, baseY + breatheY + speakBob);

  const strokeWeight =
    style === '2d-animation'
      ? 3.2
      : style === 'watercolor'
      ? 1.8
      : style === 'clay'
      ? 0
      : 0.8;

  const strokeStyle =
    style === 'watercolor' ? 'rgba(65, 58, 52, 0.55)' : inkColor;

  // Helper for clay 3D radial shading vs cel-shading
  const fillShape = (baseColor: string, cx: number, cy: number, radius: number) => {
    if (style === 'clay') {
      const g = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.35,
        radius * 0.1,
        cx,
        cy,
        radius * 1.15
      );
      g.addColorStop(0, shadeHex(baseColor, 18));
      g.addColorStop(0.65, baseColor);
      g.addColorStop(1, shadeHex(baseColor, -18));
      ctx.fillStyle = g;
    } else if (style === 'live-action') {
      const g = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      g.addColorStop(0, shadeHex(baseColor, 10));
      g.addColorStop(1, shadeHex(baseColor, -12));
      ctx.fillStyle = g;
    } else if (style === 'watercolor') {
      const g = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.2);
      g.addColorStop(0, shadeHex(baseColor, 8));
      g.addColorStop(1, shadeHex(baseColor, -6));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = baseColor;
    }
    ctx.fill();
    if (strokeWeight > 0) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWeight;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  // --- Back Hair Layer (for ponytail / bob) ---
  if (char.hairStyle === 'ponytail') {
    ctx.save();
    ctx.rotate(headTilt);
    ctx.beginPath();
    ctx.ellipse(-62 * facing, -195, 32, 54, 0.35 * facing, 0, Math.PI * 2);
    fillShape(char.hairColor, -62 * facing, -195, 48);
    ctx.restore();
  } else if (char.hairStyle === 'bob') {
    ctx.save();
    ctx.rotate(headTilt);
    ctx.beginPath();
    ctx.ellipse(0, -188, 74, 72, 0, 0, Math.PI * 2);
    fillShape(char.hairColor, 0, -188, 74);
    ctx.restore();
  }

  // --- Torso / Outfit (consistent topType & outfitColor!) ---
  ctx.beginPath();
  drawRoundedRect(ctx, -78, -118, 156, 178, 52);
  fillShape(char.outfitColor, 0, -30, 105);

  // Inner shirt / collar detail depending on topType
  if (char.topType === 'cardigan' || char.topType === 'jacket') {
    ctx.beginPath();
    ctx.moveTo(-22, -118);
    ctx.lineTo(22, -118);
    ctx.lineTo(14, 58);
    ctx.lineTo(-14, 58);
    ctx.closePath();
    fillShape('#FAF8F3', 0, -30, 50);

    // Collar lapels
    ctx.beginPath();
    ctx.moveTo(-24, -116);
    ctx.lineTo(-42, -72);
    ctx.lineTo(-18, -72);
    ctx.closePath();
    fillShape(char.accentColor, -28, -94, 24);

    ctx.beginPath();
    ctx.moveTo(24, -116);
    ctx.lineTo(42, -72);
    ctx.lineTo(18, -72);
    ctx.closePath();
    fillShape(char.accentColor, 28, -94, 24);
  } else if (char.topType === 'hoodie') {
    // Hoodie collar & drawstrings
    ctx.beginPath();
    ctx.ellipse(0, -112, 46, 20, 0, 0, Math.PI * 2);
    fillShape(shadeHex(char.outfitColor, -10), 0, -112, 40);
    ctx.strokeStyle = '#F7F5EE';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -100);
    ctx.lineTo(-16, -42);
    ctx.moveTo(14, -100);
    ctx.lineTo(16, -42);
    ctx.stroke();
  } else {
    // Crewneck sweater stripe
    ctx.beginPath();
    ctx.ellipse(0, -114, 34, 13, 0, 0, Math.PI * 2);
    fillShape(char.accentColor, 0, -114, 30);
  }

  // --- Expressive Arms & Poses ---
  const armWave = Math.sin(t * 3.5) * 8;
  ctx.save();
  if (pose === 'hands_on_head') {
    // Both arms raised toward head
    ctx.beginPath();
    ctx.moveTo(-66, -86);
    ctx.quadraticCurveTo(-110, -155, -58, -210);
    ctx.lineWidth = 26;
    ctx.strokeStyle = char.outfitColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(66, -86);
    ctx.quadraticCurveTo(110, -155, 58, -210);
    ctx.stroke();
  } else if (pose === 'waving' || pose === 'high_five' || pose === 'pointing_up') {
    // Front arm raised enthusiastically
    ctx.beginPath();
    ctx.moveTo(58 * facing, -84);
    ctx.quadraticCurveTo(
      (112 + armWave * 0.4) * facing,
      -135,
      (94 + armWave) * facing,
      pose === 'pointing_up' ? -215 : -186
    );
    ctx.lineWidth = 26;
    ctx.strokeStyle = char.outfitColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Hand
    ctx.beginPath();
    ctx.arc(
      (94 + armWave) * facing,
      pose === 'pointing_up' ? -220 : -190,
      15,
      0,
      Math.PI * 2
    );
    fillShape(char.skinTone, (94 + armWave) * facing, -190, 15);
  } else if (pose === 'patting_shoulder') {
    ctx.beginPath();
    ctx.moveTo(60 * facing, -82);
    ctx.quadraticCurveTo(125 * facing, -92, 165 * facing, -78 + armWave * 0.5);
    ctx.lineWidth = 26;
    ctx.strokeStyle = char.outfitColor;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // Relaxed arms resting near table / coffee / notes
    ctx.beginPath();
    ctx.moveTo(-62, -78);
    ctx.quadraticCurveTo(-88, -24, -44, 16);
    ctx.moveTo(62, -78);
    ctx.quadraticCurveTo(88, -24, 44, 16);
    ctx.lineWidth = 26;
    ctx.strokeStyle = char.outfitColor;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();

  // --- Neck ---
  ctx.beginPath();
  drawRoundedRect(ctx, -17, -142, 34, 34, 10);
  fillShape(shadeHex(char.skinTone, -5), 0, -128, 22);

  // --- Head Group ---
  ctx.save();
  ctx.translate(0, -196);
  ctx.rotate(headTilt);

  // Ears
  ctx.beginPath();
  ctx.arc(-56, 8, 12, 0, Math.PI * 2);
  ctx.arc(56, 8, 12, 0, Math.PI * 2);
  fillShape(char.skinTone, 0, 8, 56);

  // Face oval
  ctx.beginPath();
  ctx.ellipse(0, 0, 58, 64, 0, 0, Math.PI * 2);
  fillShape(char.skinTone, 0, 0, 64);

  // Warm cheek blush
  ctx.fillStyle =
    emotion === 'nervous' || emotion === 'overjoyed'
      ? 'rgba(232, 138, 130, 0.34)'
      : 'rgba(232, 148, 138, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-28 + 6 * facing, 14, 13, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(28 + 6 * facing, 14, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Eyes (with natural periodic blink) ---
  const blinkCycle = (t + (side === 'left' ? 0.5 : 2.3)) % 3.8;
  const isBlinking = blinkCycle > 3.66;
  const eyeOffsetX = 6 * facing;
  const leftEyeX = -21 + eyeOffsetX;
  const rightEyeX = 21 + eyeOffsetX;
  const eyeY = -4;

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';

  if (isBlinking || emotion === 'laughing' || emotion === 'overjoyed' || emotion === 'relieved') {
    // Happy curved eyes
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.beginPath();
      if (isBlinking) {
        ctx.moveTo(ex - 8, eyeY);
        ctx.lineTo(ex + 8, eyeY);
      } else {
        ctx.arc(ex, eyeY + 3, 9, Math.PI * 1.12, Math.PI * 1.88);
      }
      ctx.stroke();
    }
  } else {
    const eyeR = emotion === 'surprised' ? 7.5 : 5.8;
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // Catchlight sparkle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex + 2, eyeY - 2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = inkColor;
    }
  }

  // --- Eyebrows ---
  ctx.strokeStyle = shadeHex(char.hairColor, -8);
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const ex = i === 0 ? leftEyeX : rightEyeX;
    const dir = i === 0 ? -1 : 1;
    ctx.beginPath();
    if (emotion === 'nervous') {
      ctx.moveTo(ex - 9, eyeY - 14 - dir * 3);
      ctx.lineTo(ex + 9, eyeY - 14 + dir * 3);
    } else if (emotion === 'determined') {
      ctx.moveTo(ex - 9, eyeY - 16 + dir * 3);
      ctx.lineTo(ex + 9, eyeY - 16 - dir * 3);
    } else if (emotion === 'surprised') {
      ctx.arc(ex, eyeY - 14, 10, Math.PI * 1.15, Math.PI * 1.85);
    } else {
      ctx.moveTo(ex - 9, eyeY - 16);
      ctx.quadraticCurveTo(ex, eyeY - 19, ex + 9, eyeY - 16);
    }
    ctx.stroke();
  }

  // --- Optional Round Glasses (kept consistent per character bible!) ---
  if (char.glasses) {
    ctx.strokeStyle = '#3B4249';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(leftEyeX + 15, eyeY);
    ctx.lineTo(rightEyeX - 15, eyeY);
    ctx.stroke();
  }

  // --- Mouth (Audio-Driven Lip Sync when speaking!) ---
  const mouthX = eyeOffsetX;
  const mouthY = 26;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 3;

  if (isSpeaking && mouthOpen > 0.08) {
    const openH = clamp(5 + mouthOpen * 16, 5, 20);
    const openW = clamp(10 + mouthOpen * 8, 10, 17);
    ctx.fillStyle = '#B45B59';
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY, openW, openH * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Subtle upper teeth hint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.rect(mouthX - openW * 0.55, mouthY - openH * 0.45, openW * 1.1, 3.5);
    ctx.fill();
  } else if (emotion === 'nervous') {
    // Wavy nervous mouth
    ctx.beginPath();
    ctx.moveTo(mouthX - 10, mouthY + 2);
    ctx.quadraticCurveTo(mouthX - 4, mouthY - 3, mouthX, mouthY + 2);
    ctx.quadraticCurveTo(mouthX + 5, mouthY + 6, mouthX + 10, mouthY + 1);
    ctx.stroke();
  } else if (emotion === 'surprised') {
    ctx.fillStyle = '#B45B59';
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY + 1, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (emotion === 'overjoyed' || emotion === 'laughing') {
    ctx.fillStyle = '#C96864';
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - 2, 14, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Gentle warm smile
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - 4, 11, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  // --- Front Hair / Bangs ---
  ctx.beginPath();
  if (char.hairStyle === 'short_wavy' || char.hairStyle === 'parted') {
    ctx.arc(0, -14, 62, Math.PI * 0.98, Math.PI * 2.02);
    ctx.quadraticCurveTo(22, -26, 6, -38);
    ctx.quadraticCurveTo(-18, -22, -60, -12);
    ctx.closePath();
  } else {
    ctx.arc(0, -12, 63, Math.PI * 0.92, Math.PI * 2.08);
    ctx.quadraticCurveTo(32, -32, 0, -24);
    ctx.quadraticCurveTo(-30, -32, -62, -4);
    ctx.closePath();
  }
  fillShape(char.hairColor, 0, -40, 62);

  ctx.restore(); // End head group
  ctx.restore(); // End character
}

function drawForegroundTable(
  ctx: CanvasRenderingContext2D,
  palette: PaletteColors,
  style: VisualStyleId,
  t: number
) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const tableY = H - 178;

  // Table surface
  ctx.fillStyle = palette.wood;
  ctx.fillRect(0, tableY, W, H - tableY);

  // Top edge highlight
  ctx.fillStyle = shadeHex(palette.wood, 12);
  ctx.fillRect(0, tableY, W, 12);

  if (style === '2d-animation' || style === 'watercolor') {
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, tableY);
    ctx.lineTo(W, tableY);
    ctx.stroke();
  }

  // Open study notebook in center-right
  ctx.save();
  ctx.translate(640, tableY + 34);
  ctx.fillStyle = '#F9F8F4';
  drawRoundedRect(ctx, -95, -26, 190, 62, 8);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Notebook center crease & subtle lines
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(0, 36);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-78, -10 + i * 14);
    ctx.lineTo(-14, -10 + i * 14);
    ctx.moveTo(14, -10 + i * 14);
    ctx.lineTo(78, -10 + i * 14);
    ctx.stroke();
  }
  ctx.restore();

  // Two warm ceramic mugs with rising steam
  const mugs = [
    { x: 482, y: tableY + 12, color: '#EAE5D9' },
    { x: 798, y: tableY + 14, color: '#D2E2DE' },
  ];
  for (const m of mugs) {
    // Handle
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(m.x + 24, m.y + 8, 11, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Mug body
    ctx.fillStyle = m.color;
    drawRoundedRect(ctx, m.x - 22, m.y - 20, 44, 48, 9);
    ctx.fill();
    if (style === '2d-animation') {
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // Gentle rising steam wisps
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let s = 0; s < 2; s++) {
      const sy = ((t * 22 + s * 18) % 34);
      const sx = m.x - 6 + s * 12 + Math.sin(t * 2.4 + s) * 5;
      ctx.globalAlpha = 1 - sy / 34;
      ctx.beginPath();
      ctx.moveTo(sx, m.y - 26 - sy);
      ctx.quadraticCurveTo(sx + 5, m.y - 34 - sy, sx - 2, m.y - 44 - sy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawPropEffects(
  ctx: CanvasRenderingContext2D,
  effect: BeatVisualDirection['propEffect'],
  t: number
) {
  ctx.save();
  if (effect === 'butterflies') {
    for (let i = 0; i < 5; i++) {
      const bx = 300 + i * 165 + Math.sin(t * 1.9 + i * 1.3) * 38;
      const by = 180 + (i % 3) * 65 + Math.cos(t * 2.5 + i) * 24;
      const wing = Math.abs(Math.sin(t * 9 + i)) * 12 + 4;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(139, 179, 173, 0.85)' : 'rgba(235, 193, 134, 0.85)';
      ctx.beginPath();
      ctx.ellipse(bx - 7, by, wing, 8, -0.3, 0, Math.PI * 2);
      ctx.ellipse(bx + 7, by, wing, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effect === 'sparkles' || effect === 'warm_rays') {
    for (let i = 0; i < 8; i++) {
      const sx = 220 + i * 120 + Math.sin(t * 1.2 + i) * 18;
      const sy = 120 + ((i * 53) % 190) + Math.cos(t * 1.6 + i) * 14;
      const scale = 0.5 + 0.5 * Math.sin(t * 4.5 + i * 0.9);
      const r = 12 * scale;
      ctx.fillStyle = `rgba(250, 218, 128, ${0.45 + 0.5 * scale})`;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.quadraticCurveTo(sx, sy, sx + r, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy + r);
      ctx.quadraticCurveTo(sx, sy, sx - r, sy);
      ctx.quadraticCurveTo(sx, sy, sx, sy - r);
      ctx.fill();
    }
  } else if (effect === 'lightbulb') {
    const pulse = 0.75 + 0.25 * Math.sin(t * 5);
    const lx = 640;
    const ly = 155;
    const glow = ctx.createRadialGradient(lx, ly, 8, lx, ly, 68 * pulse);
    glow.addColorStop(0, 'rgba(255, 232, 148, 0.82)');
    glow.addColorStop(1, 'rgba(255, 232, 148, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly, 68 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FDE68A';
    ctx.strokeStyle = '#8A6B2F';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (effect === 'sweat_drop') {
    const dy = (t * 28) % 26;
    ctx.fillStyle = 'rgba(135, 195, 224, 0.88)';
    ctx.beginPath();
    ctx.moveTo(476, 260 + dy);
    ctx.quadraticCurveTo(486, 276 + dy, 476, 282 + dy);
    ctx.quadraticCurveTo(466, 276 + dy, 476, 260 + dy);
    ctx.fill();
  } else if (effect === 'leaves' || effect === 'notes') {
    for (let i = 0; i < 6; i++) {
      const lx = (120 + i * 210 + t * 28) % (CANVAS_WIDTH + 60) - 30;
      const ly = 90 + ((i * 77 + t * 18) % 280);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(t * 0.9 + i);
      ctx.fillStyle =
        effect === 'leaves' ? 'rgba(122, 160, 130, 0.72)' : 'rgba(248, 245, 235, 0.85)';
      if (effect === 'leaves') {
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawRoundedRect(ctx, -10, -13, 20, 26, 3);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawStylePostProcess(
  ctx: CanvasRenderingContext2D,
  style: VisualStyleId
) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  if (style === 'clay') {
    // Warm miniature studio vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(42, 30, 22, 0.22)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  } else if (style === 'watercolor') {
    // Soft paper vignette border
    ctx.strokeStyle = 'rgba(248, 246, 240, 0.85)';
    ctx.lineWidth = 28;
    ctx.strokeRect(0, 0, W, H);
  } else if (style === 'live-action') {
    // Subtle indie film warm grade + soft letterbox framing
    ctx.fillStyle = 'rgba(28, 38, 46, 0.05)';
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.34, W / 2, H / 2, W * 0.68);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(15, 23, 42, 0.24)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawBurnedInSubtitles(
  ctx: CanvasRenderingContext2D,
  beat: StoryboardBeat,
  beatLocalTime: number,
  speechDurationSec: number
) {
  const cues = buildSubtitleCues(beat.englishLine);
  if (cues.length === 0) return;

  // Speech starts ~0.25s into the beat for natural pacing
  const speechStart = 0.2;
  const effectiveSpeechDur = Math.max(1.8, Math.min(beat.durationSec - 0.3, speechDurationSec));
  const speechProgress = clamp((beatLocalTime - speechStart) / effectiveSpeechDur, 0, 0.999);

  const activeCue =
    cues.find((c) => speechProgress >= c.startRatio && speechProgress <= c.endRatio) ||
    cues[cues.length - 1];

  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  // Measured bottom gradient scrim for WCAG AA+ contrast across all 4 styles
  const scrimH = 175;
  const scrim = ctx.createLinearGradient(0, H - scrimH, 0, H);
  scrim.addColorStop(0, 'rgba(15, 23, 42, 0)');
  scrim.addColorStop(0.55, 'rgba(15, 23, 42, 0.56)');
  scrim.addColorStop(1, 'rgba(15, 23, 42, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H - scrimH, W, scrimH);

  // Strictly white bold text, bottom of screen, max 2 lines
  ctx.save();
  ctx.font = '700 38px "DM Sans", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = activeCue.lines.slice(0, 2);
  const lineHeight = 50;
  const baseBottomY = H - 54;
  const startY = lines.length === 2 ? baseBottomY - lineHeight : baseBottomY - 6;

  lines.forEach((lineText, idx) => {
    const y = startY + idx * lineHeight;
    // Crisp dark outline + subtle drop shadow so white bold text pops cleanly
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeText(lineText, W / 2, y);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(lineText, W / 2, y);
  });

  ctx.restore();
}

export interface RenderFrameOptions {
  storyboard: StoryboardData;
  style: VisualStyleId;
  currentTimeSec: number; // 0..30 (or up to 32.5 when rendering end credit card)
  mouthOpen: number; // 0..1 live audio amplitude
  beatSpeechDurations?: Record<string, number>;
  creatorName?: string;
  showCreditCard?: boolean;
}

export function getBeatAtTime(
  beats: StoryboardBeat[],
  timeSec: number
): { beat: StoryboardBeat; beatIndex: number; localTime: number } {
  const clamped = clamp(timeSec, 0, TOTAL_DURATION_SEC - 0.001);
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (clamped >= b.startSec && clamped < b.endSec) {
      return { beat: b, beatIndex: i, localTime: clamped - b.startSec };
    }
  }
  const last = beats[beats.length - 1];
  return {
    beat: last,
    beatIndex: beats.length - 1,
    localTime: clamp(clamped - last.startSec, 0, last.durationSec),
  };
}

export function renderFilmFrame(
  ctx: CanvasRenderingContext2D,
  options: RenderFrameOptions
) {
  const {
    storyboard,
    style,
    currentTimeSec,
    mouthOpen,
    beatSpeechDurations,
    creatorName,
    showCreditCard,
  } = options;

  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  // Optional closing credit card (t > 30s during export or end screen)
  if (showCreditCard && currentTimeSec >= TOTAL_DURATION_SEC) {
    const cardProgress = clamp((currentTimeSec - TOTAL_DURATION_SEC) / 0.6, 0, 1);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = easeInOut(cardProgress);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(storyboard.title, W / 2, H / 2 - 28);

    ctx.font = '500 24px "DM Sans", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(
      `Made with Google AI Studio · Script by ${creatorName?.trim() || 'Student'}`,
      W / 2,
      H / 2 + 32
    );
    ctx.restore();
    return;
  }

  // Stop-motion cadence quantization for Clay style (charming 12fps)
  const animT =
    style === 'clay' ? Math.floor(currentTimeSec * 12) / 12 : currentTimeSec;

  const { beat, localTime } = getBeatAtTime(storyboard.beats, currentTimeSec);
  const progress = clamp(localTime / beat.durationSec, 0, 1);
  const palette = PALETTES[storyboard.characterBible.paletteMood] || PALETTES.golden_afternoon;
  const vd = beat.visualDirection;

  // Camera framing & smooth motion per beat
  let baseScale = 1.0;
  let targetX = W / 2;
  let targetY = H / 2;

  if (vd.cameraShot === 'wide_two_shot') {
    baseScale = 0.98;
  } else if (vd.cameraShot === 'medium_two_shot') {
    baseScale = 1.05;
  } else if (vd.cameraShot === 'close_up_A') {
    baseScale = 1.24;
    targetX = W * 0.36;
    targetY = H * 0.44;
  } else if (vd.cameraShot === 'close_up_B') {
    baseScale = 1.24;
    targetX = W * 0.64;
    targetY = H * 0.44;
  }

  const eased = easeInOut(progress);
  let moveScale = 0;
  let moveX = 0;
  if (vd.cameraMove === 'slow_push_in') moveScale = eased * 0.06;
  if (vd.cameraMove === 'pull_back_warm') moveScale = (1 - eased) * 0.06;
  if (vd.cameraMove === 'gentle_pan_right') moveX = (eased - 0.5) * 34;
  if (vd.cameraMove === 'gentle_pan_left') moveX = (0.5 - eased) * 34;

  // Subtle handheld camera breath for live-action style
  const handheldX = style === 'live-action' ? Math.sin(animT * 1.4) * 3 : 0;
  const handheldY = style === 'live-action' ? Math.cos(animT * 1.1) * 2.5 : 0;

  ctx.save();
  ctx.fillStyle = palette.skyBottom;
  ctx.fillRect(0, 0, W, H);

  // Apply camera transform
  const finalScale = baseScale + moveScale;
  ctx.translate(W / 2 + handheldX, H / 2 + handheldY);
  ctx.scale(finalScale, finalScale);
  ctx.translate(-(targetX + moveX), -targetY);

  // 1. Background setting (consistent across all 4 beats!)
  drawSettingBackground(ctx, storyboard.characterBible.settingType, palette, style, animT);

  // 2. Character A (left) and Character B (right) — exact same outfits & colors every beat!
  drawCharacter(
    ctx,
    storyboard.characterBible.characterA,
    'left',
    vd.emotionA,
    vd.poseA,
    beat.speaker === 'A',
    beat.speaker === 'A' ? mouthOpen : 0,
    style,
    palette.ink,
    animT
  );

  drawCharacter(
    ctx,
    storyboard.characterBible.characterB,
    'right',
    vd.emotionB,
    vd.poseB,
    beat.speaker === 'B',
    beat.speaker === 'B' ? mouthOpen : 0,
    style,
    palette.ink,
    animT
  );

  // 3. Shared foreground table & cozy props
  drawForegroundTable(ctx, palette, style, animT);

  // 4. Story-driven animated atmospheric effect
  drawPropEffects(ctx, vd.propEffect, animT);

  ctx.restore();

  // 5. Style-specific film / paper / studio finish
  drawStylePostProcess(ctx, style);

  // 6. Soft crossfade transition at beat boundaries
  if (localTime < 0.25 && beat.beatNumber > 1) {
    const fadeAlpha = 1 - localTime / 0.25;
    ctx.fillStyle = `rgba(246, 248, 250, ${fadeAlpha * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 7. Burned-in English subtitles (white bold text, bottom of screen, max 2 lines)
  const speechDur = beatSpeechDurations?.[beat.id] ?? Math.max(3.5, beat.durationSec - 1.2);
  drawBurnedInSubtitles(ctx, beat, localTime, speechDur);
}
