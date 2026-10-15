import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCaptcha, verifyCaptcha } from '../src/services/captchaService.js';
import { normalizePopunderSettings } from '../src/services/settingsService.js';

test('captcha gera um PNG e não expõe a resposta no token', () => {
  const captcha = createCaptcha();
  const png = Buffer.from(captcha.image.replace(/^data:image\/png;base64,/, ''), 'base64');
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
  assert.match(captcha.token, /^[A-Za-z0-9_-]{16}\.\d+\.[A-Za-z0-9_-]{43}$/);
});

test('captcha recusa resposta errada, reuso e tokens inválidos', () => {
  const captcha = createCaptcha();
  assert.equal(verifyCaptcha(captcha.token, '#####'), false);
  // O token é consumido na primeira tentativa.
  assert.equal(verifyCaptcha(captcha.token, '#####'), false);
  assert.equal(verifyCaptcha('a.b.c', 'abc'), false);
  assert.equal(verifyCaptcha(undefined, undefined), false);
});

test('configuração do pop under aceita só links HTTPS e exige link quando ativa', () => {
  assert.deepEqual(
    normalizePopunderSettings({ enabled: true, mode: 'aleatorio', links: 'https://a.com\n\nhttps://b.com\nhttps://a.com' }),
    { enabled: true, mode: 'aleatorio', links: ['https://a.com', 'https://b.com'] },
  );
  assert.equal(normalizePopunderSettings({ enabled: true, links: ['http://a.com'] }), null);
  assert.equal(normalizePopunderSettings({ enabled: true, links: [] }), null);
  assert.equal(normalizePopunderSettings({ enabled: false, mode: 'invalido', links: [] }), null);
  assert.deepEqual(normalizePopunderSettings({ enabled: false, links: [] }), { enabled: false, mode: 'sequencial', links: [] });
});
