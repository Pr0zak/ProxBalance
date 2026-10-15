// Unit tests for the wall-monitor helpers (wallMode.js).
// Run: node tests/js/wall-mode.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/wallMode.js'],
  bundle: true, format: 'esm', write: false,
});
const { isWallHash, wallScale, fitScale, WALL_BASE } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('isWallHash accepts the wall route in its usual spellings', () => {
  for (const h of ['#/wall', '#wall', '#/wall/', '/wall', '#/wall?x=1']) assert.equal(isWallHash(h), true, h);
});

test('isWallHash rejects other pages and empty input', () => {
  for (const h of ['', null, undefined, '#/', '#/dashboard', '#/dashboard/wall', '#/walls', '#/settings/wall']) {
    assert.equal(isWallHash(h), false, String(h));
  }
});

test('wallScale: 1080p and 1440p show the same virtual canvas', () => {
  const a = wallScale(1920, 1080);
  const b = wallScale(2560, 1440);
  assert.equal(a.fixed, true);
  assert.equal(b.fixed, true);
  assert.ok(Math.abs(a.scale - 1920 / WALL_BASE.width) < 1e-9);
  assert.ok(Math.abs(b.scale - 2560 / WALL_BASE.width) < 1e-9);
  assert.ok(Math.abs(a.width - WALL_BASE.width) < 1e-9 && Math.abs(a.height - WALL_BASE.height) < 1e-9);
  assert.ok(Math.abs(b.width - WALL_BASE.width) < 1e-9 && Math.abs(b.height - WALL_BASE.height) < 1e-9);
});

test('wallScale: the tighter side wins on non-16:9 screens and the canvas fills the screen', () => {
  const ultrawide = wallScale(3440, 1440);
  assert.ok(Math.abs(ultrawide.scale - 1440 / WALL_BASE.height) < 1e-9);
  assert.ok(Math.abs(ultrawide.width * ultrawide.scale - 3440) < 1e-6);
  assert.ok(Math.abs(ultrawide.height * ultrawide.scale - 1440) < 1e-6);
  const tall = wallScale(1920, 1200); // 16:10 — width limits
  assert.ok(Math.abs(tall.scale - 1920 / WALL_BASE.width) < 1e-9);
  assert.ok(tall.height > WALL_BASE.height);
});

test('wallScale: phones and small screens are left unscaled', () => {
  assert.deepEqual(wallScale(390, 844), { scale: 1, width: 390, height: 844, fixed: false });
  assert.equal(wallScale(800, 1280).fixed, false);
  assert.equal(wallScale(0, 0).fixed, false);
});

test('wallScale: the scale is clamped', () => {
  assert.equal(wallScale(7680, 4320).scale, 3);
  assert.equal(wallScale(1024, 300).scale, 0.75);
});

test('fitScale shrinks to fit, never grows, and stops at the minimum', () => {
  assert.equal(fitScale(800, 400, 1000, 600), 1);
  assert.equal(fitScale(1000, 1200, 1000, 600), 0.5);
  assert.equal(fitScale(2000, 600, 1000, 600), 0.5);
  assert.equal(fitScale(1000, 6000, 1000, 600), 0.4);
  assert.equal(fitScale(1000, 6000, 1000, 600, 0.05), 0.1);
});

test('fitScale is 1 while nothing has been measured', () => {
  assert.equal(fitScale(0, 0, 1000, 600), 1);
  assert.equal(fitScale(500, 500, 0, 0), 1);
  assert.equal(fitScale(NaN, 10, 10, 10), 1);
});
