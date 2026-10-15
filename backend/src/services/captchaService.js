import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { env } from '../config/env.js';

// Captcha próprio: o servidor desenha o texto em um PNG (a resposta nunca vai no HTML)
// e devolve um token assinado com HMAC, de uso único e com validade curta.
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_LENGTH = 5;
const WIDTH = 200;
const HEIGHT = 64;
const MAX_USED_TOKENS = 20_000;
const usedNonces = new Map();

// Fonte bitmap 5x7. Caracteres ambíguos (0/O, 1/I, Q) ficam de fora.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};
const ALPHABET = Object.keys(GLYPHS);

function randomInt(min, max) {
  return crypto.randomInt(Math.floor(min), Math.floor(max) + 1);
}

function randomFloat(min, max) {
  return min + (crypto.randomInt(0, 1_000_001) / 1_000_000) * (max - min);
}

function sign(value) {
  return crypto.createHmac('sha256', env.auth.secret).update(value).digest('base64url');
}

function normalizeAnswer(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().slice(0, 16) : '';
}

function encodePng(width, height, rgb) {
  const rowLength = width * 3 + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * rowLength] = 0;
    rgb.copy(raw, y * rowLength + 1, y * width * 3, (y + 1) * width * 3);
  }

  function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typeAndData) >>> 0);
    return Buffer.concat([length, typeAndData, crc]);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawCaptcha(text) {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  const setPixel = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const index = (y * WIDTH + x) * 3;
    pixels[index] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
  };
  const inkColor = () => [randomInt(40, 110), randomInt(0, 40), randomInt(90, 150)];

  // Fundo claro com leve granulado.
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const shade = randomInt(226, 246);
      setPixel(x, y, [shade, shade - randomInt(4, 12), shade]);
    }
  }

  // Letras com rotação, escala e posição aleatórias.
  const cellWidth = (WIDTH - 20) / text.length;
  [...text].forEach((character, index) => {
    const glyph = GLYPHS[character];
    const color = inkColor();
    const centerX = 10 + cellWidth * index + cellWidth / 2 + randomFloat(-3, 3);
    const centerY = HEIGHT / 2 + randomFloat(-5, 5);
    const angle = randomFloat(-0.3, 0.3);
    const scale = randomFloat(4.8, 5.6);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let y = Math.floor(centerY - 30); y <= centerY + 30; y += 1) {
      for (let x = Math.floor(centerX - 30); x <= centerX + 30; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const column = Math.floor((dx * cos + dy * sin) / scale + 2.5);
        const row = Math.floor((-dx * sin + dy * cos) / scale + 3.5);
        if (row >= 0 && row < 7 && column >= 0 && column < 5 && glyph[row][column] === '#') {
          setPixel(x, y, color);
        }
      }
    }
  });

  // Linhas de ruído atravessando o texto.
  for (let line = 0; line < 3; line += 1) {
    const color = inkColor();
    let x0 = randomInt(0, WIDTH / 3);
    let y0 = randomInt(0, HEIGHT - 1);
    const x1 = randomInt((WIDTH * 2) / 3, WIDTH - 1);
    const y1 = randomInt(0, HEIGHT - 1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const stepX = x0 < x1 ? 1 : -1;
    const stepY = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const doubled = 2 * error;
      if (doubled >= dy) { error += dy; x0 += stepX; }
      if (doubled <= dx) { error += dx; y0 += stepY; }
    }
  }

  // Pontos soltos.
  for (let dot = 0; dot < 160; dot += 1) {
    setPixel(randomInt(0, WIDTH - 1), randomInt(0, HEIGHT - 1), inkColor());
  }

  // Distorção em onda para dificultar leitura automática.
  const waved = Buffer.alloc(pixels.length);
  const amplitude = randomFloat(1.5, 2.5);
  const period = randomFloat(40, 60);
  const phase = randomFloat(0, Math.PI * 2);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const sourceY = Math.min(HEIGHT - 1, Math.max(0, Math.round(y + amplitude * Math.sin((2 * Math.PI * x) / period + phase))));
      pixels.copy(waved, (y * WIDTH + x) * 3, (sourceY * WIDTH + x) * 3, (sourceY * WIDTH + x) * 3 + 3);
    }
  }

  return encodePng(WIDTH, HEIGHT, waved);
}

function forgetExpiredNonces(now) {
  for (const [nonce, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(nonce);
  }
  while (usedNonces.size >= MAX_USED_TOKENS) {
    usedNonces.delete(usedNonces.keys().next().value);
  }
}

export function createCaptcha() {
  const text = Array.from({ length: CAPTCHA_LENGTH }, () => ALPHABET[randomInt(0, ALPHABET.length - 1)]).join('');
  const nonce = crypto.randomBytes(12).toString('base64url');
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const signature = sign(`captcha.v1.${nonce}.${expiresAt}.${text}`);

  return {
    token: `${nonce}.${expiresAt}.${signature}`,
    image: `data:image/png;base64,${drawCaptcha(text).toString('base64')}`,
    expiresIn: CAPTCHA_TTL_MS / 1000,
  };
}

/**
 * Confere a resposta do captcha. O token é consumido na primeira tentativa,
 * mesmo quando a resposta está errada, impedindo tentativas repetidas.
 */
export function verifyCaptcha(token, answer) {
  if (typeof token !== 'string' || token.length > 200) return false;
  const [nonce, expiresAtText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  const now = Date.now();
  if (!/^[A-Za-z0-9_-]{16}$/.test(nonce || '')
    || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= now
    || expiresAt > now + CAPTCHA_TTL_MS
    || usedNonces.has(nonce)) {
    return false;
  }

  forgetExpiredNonces(now);
  usedNonces.set(nonce, expiresAt);

  const expected = Buffer.from(sign(`captcha.v1.${nonce}.${expiresAt}.${normalizeAnswer(answer)}`), 'ascii');
  const received = Buffer.from(signature, 'ascii');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
