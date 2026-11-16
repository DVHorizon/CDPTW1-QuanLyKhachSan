'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const config = require('./lib/config');
const httpClient = require('./lib/http_client');
const db = require('./lib/db_helper');
const uiDriver = require('./lib/ui_driver');
const assertions = require('./lib/assertions');
const reporter = require('./lib/reporter');

function parseArgs(argv) {
  const opts = {
    smoke: false,
    tier: 'all',
    feature: null,
    scenario: null,
    mode: 'all',
    out: null,
  };

  for (const arg of argv) {
    if (arg === '--smoke') opts.smoke = true;
    else if (arg.startsWith('--tier=')) opts.tier = arg.slice('--tier='.length);
    else if (arg.startsWith('--feature=')) opts.feature = arg.slice('--feature='.length).toUpperCase();
    else if (arg.startsWith('--scenario=')) opts.scenario = Number(arg.slice('--scenario='.length));
    else if (arg.startsWith('--mode=')) opts.mode = arg.slice('--mode='.length).toLowerCase();
    else if (arg.startsWith('--out=')) opts.out = path.resolve(arg.slice('--out='.length));
  }

  if (!['api', 'ui', 'all'].includes(opts.mode)) {
    throw new Error(`Invalid --mode=${opts.mode}. Expected api|ui|all.`);
  }
  return opts;
}

async function runSmoke(outDir) {
  const checks = [];
  let browser = null;
  let browserUserDataDir = null;

  function record(name, status, details) {
    checks.push({ name, status, details });
    console.log(`[SMOKE] [${status}] ${name}: ${details}`);
  }

  try {
    // 1. MySQL connection & baseline counts
    const baselineTables = ['Users', 'Roles', 'Services', 'ServiceCategories', 'Bookings', 'Stays'];
    const baselineCounts = {};
    for (const tbl of baselineTables) {
      const row = await db.queryOne(`SELECT COUNT(*) AS cnt FROM \`${tbl}\``);
      baselineCounts[tbl] = Number(row.cnt);
    }
    record(
      'MySQL Live Connection & Baseline Counts',
      'PASS',
      Object.entries(baselineCounts)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
    );

    // 2. Backend /api/health & Frontend :3000
    const anonHttp = httpClient.createSession();
    const healthRes = await anonHttp.get('/api/health', { noAuth: true, useBackendRoot: true });
    assertions.assertStatus(healthRes, 200, 'GET /api/health');
    record('Backend Live Health (:5000/api/health)', 'PASS', `HTTP 200 (${healthRes.data?.status})`);

    const feRes = await anonHttp.get(config.frontendBaseUrl, {
      noAuth: true,
      headers: { Accept: 'text/html,application/xhtml+xml,*/*' },
    });
    assertions.assertStatus(feRes, 200, 'GET frontend :3000');
    record('Frontend Live Dev Server (:3000)', 'PASS', `HTTP 200 (len=${feRes.rawText.length})`);

    // 3. WebSocket /ws/v1/dashboard READY + PING/PONG
    const wsClient = await anonHttp.connectWebSocket(config.wsDashboardUrl);
    try {
      const readyMsg = await wsClient.waitForMessage((m) => m.eventType === 'READY' || m.type === 'CONNECTED');
      wsClient.sendJson({ action: 'PING' });
      const pongMsg = await wsClient.waitForMessage((m) => m.action === 'PONG' || m.type === 'PONG');
      record(
        'WebSocket /ws/v1/dashboard',
        'PASS',
        `READY(seq=${readyMsg.currentSequence}) + PING/PONG(serverTime=${pongMsg.serverTime})`
      );
    } finally {
      await wsClient.close();
    }

    // 4. All 7 seeded role logins + /auth/me + /auth/refresh
    const rolesToVerify = ['admin', 'receptionist', 'guest', 'kitchen', 'housekeeping', 'manager', 'staff'];
    const roleSummary = [];
    for (const role of rolesToVerify) {
      const sess = httpClient.createSession();
      const loginInfo = await sess.loginAs(role);
      assert(loginInfo.token && loginInfo.token.length > 20, `Missing token for ${role}`);
      assert(loginInfo.cookies.hotel_refresh_token, `Missing hotel_refresh_token cookie for ${role}`);

      const meRes = await sess.get('/auth/me');
      assertions.assertStatus(meRes, 200, `GET /auth/me (${role})`);

      const refRes = await sess.refresh();
      assertions.assertStatus(refRes, 200, `POST /auth/refresh (${role})`);
      assert(refRes.data?.token, `Refresh missing token for ${role}`);

      roleSummary.push(`${role}(roleId=${loginInfo.user?.roleId})`);
    }
    record('All 7 Role API Logins + /auth/me + /auth/refresh', 'PASS', roleSummary.join(', '));

    // 5. Headless CDP Browser (multi-tab shared context + UI login + incognito isolation + DOM/images/logs)
    browser = await uiDriver.launchBrowser();
    browserUserDataDir = browser.browserInfo.userDataDir;

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    try {
      const tabA1 = await ctxA.newPage();
      const tabA2 = await ctxA.newPage();
      const tabB1 = await ctxB.newPage();

      const loggedUser = await tabA1.loginUi('admin');
      assert(loggedUser && loggedUser.roleId === 1, 'UI login did not populate hotel_user for Admin');

      await tabA2.goto(`${config.frontendBaseUrl}/admin/services`);
      const tabA2User = await tabA2.evaluate(() => JSON.parse(localStorage.getItem('hotel_user') || 'null'));
      // Note: localStorage is shared across tabs in same BrowserContext; verify AuthContext refresh restores or localStorage reads
      const tabA2BodyLen = await tabA2.evaluate(() => document.querySelector('#root')?.innerHTML.length || 0);
      assert(tabA2BodyLen > 100, 'Tab A2 failed to render /admin/services');

      await tabB1.goto(`${config.frontendBaseUrl}/login`);
      const tabB1User = await tabB1.evaluate(() => localStorage.getItem('hotel_user'));
      assert.strictEqual(tabB1User, null, 'Incognito BrowserContext ctxB leaked localStorage from ctxA');

      const imgChecks = await tabA2.checkImages('img');
      const consoleErrs = tabA2.getConsoleErrors();
      const pageErrs = tabA2.getPageErrors();
      const apiResponses = tabA2.getResponses('/api/');

      record(
        'Headless CDP Multi-Tab + Incognito Isolation + UI Login',
        'PASS',
        `${browser.browserInfo.browser} | ctxA(tabA1 roleId=${loggedUser.roleId}, tabA2 localStorage=${Boolean(tabA2User)}, rootLen=${tabA2BodyLen}, imgs=${imgChecks.length}, apiReqs=${apiResponses.length}, consoleErrs=${consoleErrs.length}, pageErrs=${pageErrs.length}) | ctxB(incognito hotel_user=null)`
      );
    } finally {
      await ctxA.dispose();
      await ctxB.dispose();
      await browser.close();
      browser = null;
    }

    assert(!fs.existsSync(browserUserDataDir), `Browser temp profile dir still exists: ${browserUserDataDir}`);
    record('Browser Process & Temp Profile Cleanup', 'PASS', `Removed ${browserUserDataDir}`);

    // 6. DB helper E2E_QA_ seed + cleanupAll() round-trip
    const seededCat = await db.seedServiceCategory();
    const seededSvc = await db.seedService({ categoryId: seededCat.CategoryId });
    const seededBs = await db.seedBookingAndStay();
    const seededInv = await db.seedInvoice({ bookingId: seededBs.BookingId, stayId: seededBs.StayId });
    const seededKb = await db.seedKnowledgeItem();

    const preCleanCount = await db.countMarkerRows();
    assert(preCleanCount.total >= 5, `Expected >= 5 seeded marker rows, got ${preCleanCount.total}`);

    await db.cleanupAll();
    const postCleanCount = await db.countMarkerRows();
    assert.strictEqual(
      postCleanCount.total,
      0,
      `Leftover E2E_QA_ rows after cleanupAll: ${JSON.stringify(postCleanCount.breakdown)}`
    );

    const afterCounts = {};
    for (const tbl of baselineTables) {
      const row = await db.queryOne(`SELECT COUNT(*) AS cnt FROM \`${tbl}\``);
      afterCounts[tbl] = Number(row.cnt);
      assert.strictEqual(
        afterCounts[tbl],
        baselineCounts[tbl],
        `Baseline table ${tbl} count changed (${baselineCounts[tbl]} -> ${afterCounts[tbl]})`
      );
    }
    record(
      'DB Fixture Seed & Reverse-FK Cleanup Round-Trip',
      'PASS',
      `Seeded Cat=${seededCat.CategoryId}, Svc=${seededSvc.ServiceId}, Booking=${seededBs.BookingId}, Inv=${seededInv.InvoiceId}, KB=${seededKb.KnowledgeId}; preClean=${preCleanCount.total} -> postClean=0; baseline counts intact`
    );

    // 7. Reporter output verification
    const reportOut = reporter.writeReport(outDir, {
      mode: 'smoke',
      tier: 'smoke',
      smoke: { passed: true, checks },
      results: [],
    });
    assert(fs.existsSync(reportOut.jsonPath), 'results.json not written');
    assert(fs.existsSync(reportOut.mdPath), 'SUMMARY.md not written');
    console.log(`[SMOKE] Reports written: ${reportOut.jsonPath}, ${reportOut.mdPath}`);

    return { passed: true, checks };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // ignore
      }
    }
    try {
      await db.cleanupAll();
    } catch (_) {
      // ignore
    }
    await db.closePool();
  }
}

function discoverSuites(opts) {
  if (!fs.existsSync(config.suitesDir)) return [];
  const files = fs
    .readdirSync(config.suitesDir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const suites = [];
  for (const file of files) {
    const mod = require(path.join(config.suitesDir, file));
    if (!mod || typeof mod.runSuite !== 'function') continue;
    if (opts.feature && mod.features && Array.isArray(mod.features) && !mod.features.includes(opts.feature)) {
      continue;
    }
    if (opts.feature && mod.feature && mod.feature !== opts.feature) {
      continue;
    }
    suites.push({ file, ...mod });
  }
  return suites;
}

async function runSuites(opts, outDir) {
  const suites = discoverSuites(opts);
  const cleanupFns = [];
  let browser = null;

  const tokens = {};
  for (const role of ['admin', 'receptionist', 'guest', 'kitchen', 'housekeeping', 'manager', 'staff']) {
    const sess = httpClient.createSession();
    const auth = await sess.loginAs(role);
    tokens[role] = auth.token;
  }

  try {
    if (opts.mode !== 'api' && suites.length > 0) {
      browser = await uiDriver.launchBrowser();
    }

    const ctx = {
      config,
      http: httpClient,
      db,
      ui: browser,
      assertions,
      tokens,
      mode: opts.mode,
      tier: opts.tier,
      featureFilter: opts.feature,
      scenarioFilter: opts.scenario,
      registerCleanup: (fn) => cleanupFns.push(fn),
    };

    let results = [];
    for (const suite of suites) {
      console.log(`[RUNNER] Running suite: ${suite.name || suite.file}`);
      const suiteResults = await suite.runSuite(ctx);
      if (Array.isArray(suiteResults)) {
        results.push(...suiteResults);
      }
    }

    if (opts.feature) {
      results = results.filter((r) => r.feature === opts.feature);
    }
    if (opts.scenario) {
      results = results.filter((r) => Number(r.scenario) === opts.scenario);
    }

    const reportOut = reporter.writeReport(outDir, {
      mode: opts.mode,
      tier: opts.tier,
      results,
    });

    console.log(
      `[RUNNER] Completed ${results.length} cells: PASS=${reportOut.counts.pass}, FAIL=${reportOut.counts.fail}, N/A=${reportOut.counts.na}, SKIP=${reportOut.counts.skip}`
    );
    console.log(`[RUNNER] Reports written: ${reportOut.jsonPath}, ${reportOut.mdPath}`);

    return reportOut.counts.fail === 0;
  } finally {
    try {
      await db.cleanupAll(cleanupFns);
    } catch (err) {
      console.error('[RUNNER] Cleanup error:', err.message);
    }
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // ignore
      }
    }
    await db.closePool();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = opts.out || path.join(config.defaultOutDir, opts.smoke ? 'smoke' : 'latest');

  if (opts.smoke) {
    await runSmoke(outDir);
    return;
  }

  const ok = await runSuites(opts, outDir);
  if (!ok) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[RUNNER] Fatal error:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  runSmoke,
  runSuites,
};
