#!/usr/bin/env node
/**
 * Capture the README/docs screenshots from a running ProxBalance.
 *
 * Point it at the demo cluster (tools/demo/pb-demo.sh on), which uses
 * made-up node and guest names, so nothing needs blurring.
 *
 * Usage:
 *   PB_URL=http://proxbalance-staging.lan/ node tools/screenshots.js
 *   PB_URL=... SHOTS=dashboard,wall node tools/screenshots.js   # a subset
 *   PB_URL=... THEME=light node tools/screenshots.js           # light mode
 *
 * Writes docs/images/<name>.png (1440x900 at 2x unless a shot says otherwise).
 * Needs puppeteer (`npm install puppeteer`; node_modules is gitignored).
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL_BASE = (process.env.PB_URL || 'http://localhost/').replace(/\/?$/, '/');
const OUTDIR = path.resolve(__dirname, '..', 'docs', 'images');
const THEME = process.env.THEME === 'light' ? 'light' : 'dark';
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Scroll so the element whose heading/label text matches `text` is near the top.
async function scrollToText(page, text, offset = 80, exact = false) {
  const found = await page.evaluate((t, off, ex) => {
    const els = [...document.querySelectorAll('h2,h3,h4,button,span,div')]
      .filter(e => e.children.length <= 3 && e.offsetParent
        && (ex ? e.textContent.trim() === t : e.textContent.trim().startsWith(t)));
    const el = els[0];
    if (!el) return false;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
    return true;
  }, text, offset, exact);
  if (!found) console.warn(`  ! text not found: ${text}`);
  await sleep(800);
}

async function clickText(page, text, selector = 'button') {
  const ok = await page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().startsWith(t) && e.offsetParent);
    if (el) el.click();
    return !!el;
  }, text, selector);
  if (!ok) console.warn(`  ! button not found: ${text}`);
  await sleep(1200);
}

// Each shot: hash route, optional viewport, optional storage, optional action.
const SHOTS = [
  { name: 'dashboard', hash: '#/dashboard' },
  { name: 'dashboard-nodes', hash: '#/dashboard/nodes', collapse: true, act: p => scrollToText(p, 'Cluster', 24, true) },
  { name: 'dashboard-guests', hash: '#/dashboard/guests', collapse: true, act: p => scrollToText(p, 'Cluster', 24, true) },
  { name: 'dashboard-map', hash: '#/dashboard/map', collapse: true, act: p => scrollToText(p, 'Cluster', 24, true) },
  { name: 'dashboard-charts', hash: '#/dashboard/charts', collapse: true, act: p => scrollToText(p, 'Cluster', 24, true) },
  { name: 'dashboard-recs', hash: '#/dashboard/suggestions', collapse: true, act: p => scrollToText(p, 'Cluster', 24, true) },
  { name: 'node-panel', hash: '#/dashboard/nodes/node/cygnus' },
  { name: 'insights', hash: '#/insights' },
  { name: 'rolling-update', hash: '#/insights', act: p => scrollToText(p, 'Rolling update plan') },
  { name: 'automation', hash: '#/automation' },
  { name: 'approvals', hash: '#/automation', act: p => scrollToText(p, 'Waiting for approval', 330) },
  { name: 'placement-rules', hash: '#/automation/filters', act: p => scrollToText(p, 'Guest Rules') },
  { name: 'change-log', hash: '#/automation/history', act: async p => { await clickText(p, 'Change log'); await scrollToText(p, 'Change log', 140); } },
  { name: 'settings', hash: '#/settings/notifications' },
  { name: 'diagnostics', hash: '#/settings/diagnostics', wait: 6000 },
  { name: 'wall', hash: '#/wall', viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } },
  {
    name: 'quick-search', hash: '#/dashboard',
    act: async p => {
      await p.keyboard.down('Control'); await p.keyboard.press('KeyK'); await p.keyboard.up('Control');
      await sleep(600);
      await p.keyboard.type('post', { delay: 60 });
      await sleep(800);
    },
  },
  { name: 'mobile', hash: '#/dashboard', viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
];

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    const splash = document.getElementById('loading-screen');
    return root && root.children.length > 0 && (!splash || splash.classList.contains('hidden') || splash.style.display === 'none');
  }, { timeout: 30000 });
}

(async () => {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  const only = (process.env.SHOTS || '').split(',').map(s => s.trim()).filter(Boolean);
  const shots = only.length ? SHOTS.filter(s => only.includes(s.name)) : SHOTS;
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport(shot.viewport || DESKTOP);
    await page.evaluateOnNewDocument((theme, collapse) => {
      try {
        localStorage.setItem('darkMode', theme === 'dark' ? 'true' : 'false');
        localStorage.setItem('autoBannerExpanded', collapse ? 'false' : 'true');
      } catch (e) { /* private mode */ }
    }, THEME, !!shot.collapse);
    await page.goto(URL_BASE + shot.hash, { waitUntil: 'networkidle2', timeout: 60000 });
    await waitForApp(page);
    await sleep(shot.wait || 3000);
    if (shot.act) await shot.act(page);
    const file = path.join(OUTDIR, `${shot.name}${THEME === 'light' ? '-light' : ''}.png`);
    await page.screenshot({ path: file });
    console.log(`✓ ${path.relative(process.cwd(), file)}`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
