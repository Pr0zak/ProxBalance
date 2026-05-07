#!/usr/bin/env node
/**
 * Capture each Dashboard tab (Nodes/Guests/Map/Charts/Recs) as its own
 * screenshot. Tab is persisted in localStorage.clusterSectionTab; we
 * inject it before navigation so React picks the right tab on mount.
 *
 * Output: docs/images/dashboard-<tab>.png  (dark mode only)
 *
 * Usage: PB_URL=http://10.0.0.211/ node tools/dashboard-tabs.js
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL_BASE = process.env.PB_URL || 'http://10.0.0.211/';
const OUTDIR = path.resolve(__dirname, '..', 'docs', 'images');
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

// Tab IDs match ClusterSection.jsx ALL_TABS.
const TABS = [
  { id: 'table',           label: 'nodes' },
  { id: 'guests',          label: 'guests' },
  { id: 'map',             label: 'map' },
  { id: 'charts',          label: 'charts' },
  { id: 'recommendations', label: 'recs' },
];

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForReact(page) {
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    const splash = document.getElementById('loading-screen');
    const skel = document.getElementById('static-skeleton');
    const rooted = root && root.children.length > 0;
    const splashGone = !splash || splash.classList.contains('hidden') || splash.style.display === 'none';
    const skelGone = !skel || skel.classList.contains('hidden') || skel.style.display === 'none';
    return rooted && splashGone && skelGone;
  }, { timeout: 30000 });
  await sleep(2500); // settle for charts/map/sparklines
}

(async () => {
  console.log(`URL:    ${URL_BASE}`);
  console.log(`Out:    ${OUTDIR}`);
  console.log(`Theme:  dark`);
  console.log(`Tabs:   ${TABS.map(t => t.label).join(', ')}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const tab of TABS) {
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      await page.evaluateOnNewDocument((tabId) => {
        try {
          localStorage.setItem('darkMode', 'true');
          localStorage.setItem('clusterSectionTab', tabId);
        } catch (_) {}
      }, tab.id);

      await page.goto(URL_BASE, { waitUntil: 'networkidle0', timeout: 30000 });
      await waitForReact(page);

      // Blur VM/CT names so screenshots can be shared publicly. Pull the
      // current guest list, walk every text node, and wrap matches in a
      // blurred span. Works across all tabs because it's text-based, not
      // selector-based.
      if (process.env.BLUR_NAMES !== '0') {
        const names = await page.evaluate(async () => {
          try {
            const r = await fetch('/api/guests-only');
            const d = await r.json();
            const guests = (d.data && d.data.guests) || {};
            return Object.values(guests)
              .map(g => g.name)
              .filter(n => typeof n === 'string' && n.length >= 3);
          } catch (e) { return []; }
        });
        await page.evaluate((names) => {
          if (!names || !names.length) return;
          // Sort longest-first so "myvitals-prod" gets matched before "myvitals"
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
        // Settle: charts re-layout when DOM mutates.
        await sleep(500);
      }

      const filename = `dashboard-${tab.label}.png`;
      const out = path.join(OUTDIR, filename);
      await page.screenshot({ path: out, fullPage: false });
      await page.close();
      console.log(`✓ docs/images/${filename}`);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
