#!/usr/bin/env node

/**
 * Page Load Performance Test for ProxBalance
 *
 * This script uses Puppeteer to measure page load timing:
 * - Time to First Byte (TTFB)
 * - Loading screen visibility duration
 * - Time until content appears
 * - Total page load time
 */

const puppeteer = require('puppeteer');

async function testPageLoad(url = 'http://localhost/') {
  console.log(`\n🧪 Testing page load performance for: ${url}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Track performance metrics
    const metrics = {
      navigationStart: 0,
      loadingScreenHidden: 0,
      skeletonVisible: 0,
      reactRendered: 0,
      loadComplete: 0
    };

    // Monitor page events
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        navigationStart: performance.now()
      };

      // Observe loading screen
      const loadingObserver = new MutationObserver((mutations) => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && loadingScreen.classList.contains('hidden')) {
          if (!window.performanceMetrics.loadingScreenHidden) {
            window.performanceMetrics.loadingScreenHidden = performance.now();
          }
        }
      });

      // Observe static skeleton
      const skeletonObserver = new MutationObserver((mutations) => {
        const skeleton = document.getElementById('static-skeleton');
        if (skeleton && window.getComputedStyle(skeleton).display !== 'none') {
          if (!window.performanceMetrics.skeletonVisible) {
            window.performanceMetrics.skeletonVisible = performance.now();
          }
        }
      });

      // Observe React root
      const rootObserver = new MutationObserver((mutations) => {
        const root = document.getElementById('root');
        if (root && root.children.length > 0) {
          if (!window.performanceMetrics.reactRendered) {
            window.performanceMetrics.reactRendered = performance.now();
          }
        }
      });

      // Start observing when DOM is ready
      document.addEventListener('DOMContentLoaded', () => {
        loadingObserver.observe(document.body, {
          attributes: true,
          subtree: true,
          attributeFilter: ['class']
        });

        skeletonObserver.observe(document.body, {
          childList: true,
          subtree: true
        });

        rootObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    });

    const startTime = Date.now();

    // Navigate and wait for network idle
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const endTime = Date.now();
    metrics.loadComplete = endTime - startTime;

    // Collect metrics from page
    const pageMetrics = await page.evaluate(() => window.performanceMetrics || {});

    // Calculate durations
    console.log('⏱️  Performance Metrics:');
    console.log('─'.repeat(50));

    if (pageMetrics.loadingScreenHidden) {
      console.log(`✓ Loading screen hidden:     ${Math.round(pageMetrics.loadingScreenHidden)}ms`);
    } else {
      console.log(`✗ Loading screen not hidden`);
    }

    if (pageMetrics.skeletonVisible) {
      console.log(`✓ Static skeleton shown:     ${Math.round(pageMetrics.skeletonVisible)}ms`);
    } else {
      console.log(`  (Static skeleton not detected)`);
    }

    if (pageMetrics.reactRendered) {
      console.log(`✓ React content rendered:    ${Math.round(pageMetrics.reactRendered)}ms`);
    } else {
      console.log(`✗ React content not rendered`);
    }

    console.log(`✓ Total page load:           ${metrics.loadComplete}ms`);
    console.log('─'.repeat(50));

    // Calculate perceived load time (time until user sees content)
    let perceivedLoadTime = 0;
    if (pageMetrics.loadingScreenHidden && pageMetrics.skeletonVisible) {
      perceivedLoadTime = pageMetrics.skeletonVisible;
      console.log(`\n📊 Perceived load time: ${Math.round(perceivedLoadTime)}ms`);
      console.log(`   (Time until user sees content)\n`);
    } else if (pageMetrics.reactRendered) {
      perceivedLoadTime = pageMetrics.reactRendered;
      console.log(`\n📊 Perceived load time: ${Math.round(perceivedLoadTime)}ms`);
      console.log(`   (Time until React renders)\n`);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/proxbalance-load-test.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/proxbalance-load-test.png\n');

    // Performance grade
    if (perceivedLoadTime < 300) {
      console.log('🏆 Grade: EXCELLENT (< 300ms)');
    } else if (perceivedLoadTime < 1000) {
      console.log('✅ Grade: GOOD (< 1s)');
    } else if (perceivedLoadTime < 3000) {
      console.log('⚠️  Grade: FAIR (1-3s)');
    } else {
      console.log('❌ Grade: POOR (> 3s)');
    }

  } catch (error) {
    console.error('❌ Error during page load test:', error.message);
  } finally {
    await browser.close();
  }
}

// Run test
const url = process.argv[2] || 'http://localhost/';
testPageLoad(url).catch(console.error);
