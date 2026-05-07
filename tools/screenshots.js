#!/usr/bin/env node
/**
 * Capture README/docs screenshots for ProxBalance.
 *
 * Loops every {theme} × {page} combo, screenshots to docs/images/<page>-<theme>.png.
 * Themes are toggled by writing localStorage.darkMode before first navigation,
 * so React's useDarkMode hook reads the right value on mount. Pages are
 * switched by clicking the TopNav button (the SPA stores currentPage in
 * React state — there are no per-page URLs).
 *
 * Usage:
 *   PB_URL=http://10.0.0.211/ node tools/screenshots.js
 *   PB_URL=http://10.0.0.211/ PAGES=dashboard,automation node tools/screenshots.js
 *   PB_URL=http://10.0.0.211/ THEMES=dark node tools/screenshots.js
 *
 * Requirements: `npm install puppeteer` in the repo root (puppeteer is gitignored).
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL_BASE = process.env.PB_URL || 'http://10.0.0.211/';
const OUTDIR = path.resolve(__dirname, '..', 'docs', 'images');
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const ALL_PAGES = [
  { id: 'dashboard',  navText: 'Dashboard'  },
  { id: 'automation', navText: 'Automation' },
  { id: 'settings',   navText: 'Settings'   },
];
const ALL_THEMES = ['dark', 'light'];

const PAGES  = (process.env.PAGES  || '').trim()
  ? ALL_PAGES.filter(p => process.env.PAGES.split(',').map(s => s.trim()).includes(p.id))
  : ALL_PAGES;
const THEMES = (process.env.THEMES || '').trim()
  ? process.env.THEMES.split(',').map(s => s.trim()).filter(t => ALL_THEMES.includes(t))
  : ALL_THEMES;

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForReact(page) {
  // Wait for either: real content rendered into #root, or the loading screen
  // to be marked hidden. Either way we know React is past mount.
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    const splash = document.getElementById('loading-screen');
    const skeleton = document.getElementById('static-skeleton');
    const rootHasContent = root && root.children.length > 0;
    const splashGone = !splash || splash.classList.contains('hidden') || splash.style.display === 'none';
    const skeletonGone = !skeleton || skeleton.classList.contains('hidden') || skeleton.style.display === 'none';
    return rootHasContent && splashGone && skeletonGone;
  }, { timeout: 30000 });
  // Settle: charts and conditional sections render after the first data fetch.
  await sleep(2000);
}

async function shoot(browser, theme, page) {
  const tab = await browser.newPage();
  await tab.setViewport(VIEWPORT);

  // Inject dark-mode preference *before* the first navigation so the
  // useDarkMode hook reads the right value on its initial useState.
  await tab.evaluateOnNewDocument((t) => {
    try { localStorage.setItem('darkMode', t === 'dark' ? 'true' : 'false'); } catch (_) {}
  }, theme);

  await tab.goto(URL_BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await waitForReact(tab);

  // Switch page by clicking the TopNav button. Skip if we're already on Dashboard.
  if (page.id !== 'dashboard') {
    await tab.evaluate((label) => {
      const btn = [...document.querySelectorAll('nav button')].find(
        el => el.textContent.trim() === label
      );
      if (btn) btn.click();
    }, page.navText);
    await sleep(1500);
  }

  // Blur VM/CT names so screenshots are safe to publish. Pull the live
  // guest list from /api/guests-only, walk every text node in the DOM,
  // and replace matches with a blurred span. Generic across all pages —
  // nothing in the source needs to opt in.
  if (process.env.BLUR_NAMES !== '0') {
    const names = await tab.evaluate(async () => {
      try {
        const r = await fetch('/api/guests-only');
        const d = await r.json();
        const guests = (d.data && d.data.guests) || {};
        return Object.values(guests)
          .map(g => g.name)
          .filter(n => typeof n === 'string' && n.length >= 3);
      } catch (e) { return []; }
    });
    await tab.evaluate((names) => {
      if (!names || !names.length) return;
      names.sort((a, b) => b.length - a.length);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          if (!n.parentElement) return NodeFilter.FILTER_REJECT;
          if (n.parentElement.closest('script, style, [data-no-blur]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const targets = [];
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent;
        if (t && names.some(n => t.includes(n))) targets.push(walker.currentNode);
      }
      for (const node of targets) {
        const span = document.createElement('span');
        span.style.filter = 'blur(4px)';
        span.style.userSelect = 'none';
        span.textContent = node.textContent;
        node.parentNode.replaceChild(span, node);
      }
    }, names);
    await sleep(500);
  }

  const filename = `${page.id}-${theme}.png`;
  const outPath = path.join(OUTDIR, filename);
  await tab.screenshot({ path: outPath, fullPage: false });
  await tab.close();
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

(async () => {
  console.log(`URL:     ${URL_BASE}`);
  console.log(`Out:     ${OUTDIR}`);
  console.log(`Pages:   ${PAGES.map(p => p.id).join(', ')}`);
  console.log(`Themes:  ${THEMES.join(', ')}`);
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const theme of THEMES) {
      for (const page of PAGES) {
        await shoot(browser, theme, page);
      }
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
