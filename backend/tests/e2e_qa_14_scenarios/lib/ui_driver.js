'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn, execSync } = require('child_process');
const WebSocket = require('ws');
const config = require('./config');

function findBrowserExecutable(explicitPath) {
  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  if (process.env.E2E_BROWSER_PATH) candidates.push(process.env.E2E_BROWSER_PATH);

  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localApp = process.env.LOCALAPPDATA || '';

  candidates.push(
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localApp ? path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    localApp ? path.join(localApp, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : ''
  );

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error('No headless Chrome or Edge binary found. Set E2E_BROWSER_PATH if installed elsewhere.');
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
  });
}

async function waitForDebuggerEndpoint(port, proc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const versionUrl = `http://127.0.0.1:${port}/json/version`;

  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`Browser exited prematurely with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(versionUrl);
      if (res.ok) {
        const info = await res.json();
        if (info && info.webSocketDebuggerUrl) {
          return info;
        }
      }
    } catch (_) {
      // retry until deadline
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  throw new Error(`Timed out waiting for CDP endpoint on port ${port}`);
}

class CdpConnection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch (_) {
        return;
      }

      if (msg.id !== undefined) {
        const entry = this.pending.get(msg.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(msg.id);
          if (msg.error) {
            const err = new Error(`CDP ${entry.method} failed: ${msg.error.message} (code ${msg.error.code})`);
            err.cdpError = msg.error;
            entry.reject(err);
          } else {
            entry.resolve(msg.result || {});
          }
        }
      } else if (msg.method) {
        const key = `${msg.sessionId || ''}:${msg.method}`;
        const handlers = this.eventHandlers.get(key);
        if (handlers) {
          for (const h of handlers) {
            try {
              h(msg.params || {});
            } catch (_) {
              // keep dispatching
            }
          }
        }
      }
    });

    ws.on('close', () => {
      for (const [, entry] of this.pending.entries()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('CDP WebSocket closed'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = 15000) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP socket not open for ${method}`));
    }
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timeout (${timeoutMs}ms): ${method}`));
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(sessionId, method, handler) {
    const key = `${sessionId || ''}:${method}`;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key).add(handler);
    return () => {
      const set = this.eventHandlers.get(key);
      if (set) set.delete(handler);
    };
  }
}

async function createPageHandle(cdp, targetId, sessionId) {
  let closed = false;
  let dialogAccept = true;
  let dialogPromptText = '';
  const dialogs = [];
  const consoleErrors = [];
  const pageErrors = [];
  const responses = [];
  const inflight = new Set();
  const unsubs = [];

  unsubs.push(
    cdp.on(sessionId, 'Page.javascriptDialogOpening', async (params) => {
      dialogs.push({
        type: params.type,
        message: params.message,
        url: params.url,
        timestamp: Date.now(),
      });
      try {
        await cdp.send(
          'Page.handleJavaScriptDialog',
          { accept: dialogAccept, promptText: dialogPromptText },
          sessionId
        );
      } catch (_) {
        // ignore if page closed
      }
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = (params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        consoleErrors.push({ text, timestamp: Date.now() });
      }
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Runtime.exceptionThrown', (params) => {
      const ex = params.exceptionDetails || {};
      const msg = ex.exception?.description || ex.text || 'Uncaught exception';
      pageErrors.push({ message: msg, timestamp: Date.now() });
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Network.requestWillBeSent', (params) => {
      if (params.requestId) inflight.add(params.requestId);
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Network.loadingFinished', (params) => {
      if (params.requestId) inflight.delete(params.requestId);
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Network.loadingFailed', (params) => {
      if (params.requestId) inflight.delete(params.requestId);
    })
  );

  unsubs.push(
    cdp.on(sessionId, 'Network.responseReceived', (params) => {
      if (params.response) {
        responses.push({
          requestId: params.requestId,
          url: params.response.url,
          status: params.response.status,
          type: params.type,
          mimeType: params.response.mimeType,
          timestamp: Date.now(),
        });
        if (responses.length > 500) responses.shift();
      }
    })
  );

  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('DOM.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);

  async function evaluate(fnOrExpr, ...args) {
    let expression;
    if (typeof fnOrExpr === 'function') {
      const serializedArgs = args.map((a) => JSON.stringify(a)).join(', ');
      expression = `(${fnOrExpr.toString()})(${serializedArgs})`;
    } else {
      expression = String(fnOrExpr);
    }

    const res = await cdp.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId
    );

    if (res.exceptionDetails) {
      const msg = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluation failed';
      throw new Error(`Page.evaluate error: ${msg}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async function waitFor(predicateFn, timeoutMs = config.timeouts.uiActionMs, label = 'condition') {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const val = await predicateFn();
      if (val) return val;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timed out waiting for ${label} (${timeoutMs}ms)`);
  }

  async function waitForSelector(selector, timeoutMs = config.timeouts.uiActionMs) {
    return waitFor(
      () => evaluate((sel) => Boolean(document.querySelector(sel)), selector),
      timeoutMs,
      `selector "${selector}"`
    );
  }

  async function waitForText(text, timeoutMs = config.timeouts.uiActionMs) {
    return waitFor(
      () =>
        evaluate((needle) => {
          const bodyText = document.body ? document.body.innerText || '' : '';
          return bodyText.includes(needle);
        }, text),
      timeoutMs,
      `text "${text}"`
    );
  }

  async function waitForNetworkIdle(idleMs = 350, timeoutMs = config.timeouts.uiActionMs) {
    const deadline = Date.now() + timeoutMs;
    let idleSince = inflight.size === 0 ? Date.now() : null;
    while (Date.now() < deadline) {
      if (inflight.size === 0) {
        if (!idleSince) idleSince = Date.now();
        if (Date.now() - idleSince >= idleMs) return true;
      } else {
        idleSince = null;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  async function goto(url, opts = {}) {
    const timeoutMs = opts.timeoutMs || config.timeouts.uiNavMs;
    await cdp.send('Page.navigate', { url }, sessionId);

    await waitFor(
      () =>
        evaluate(() => {
          if (document.readyState !== 'complete') return false;
          const root = document.querySelector('#root');
          return root ? root.innerHTML.length > 0 : Boolean(document.body && document.body.innerHTML.length > 0);
        }),
      timeoutMs,
      `page load (${url})`
    );

    if (opts.waitSelector) {
      await waitForSelector(opts.waitSelector, timeoutMs);
    }
    if (opts.waitIdle !== false) {
      await waitForNetworkIdle(250, 4000);
    }
  }

  async function fill(selector, value) {
    await waitForSelector(selector);
    const res = await evaluate(
      (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return { ok: false, reason: 'not_found' };
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.focus();

        const tag = el.tagName.toLowerCase();
        if (tag === 'select') {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          if (el._valueTracker) el._valueTracker.setValue('');
          setter.call(el, String(val));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true, value: el.value };
        }

        if (tag === 'textarea') {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          if (el._valueTracker) el._valueTracker.setValue('');
          setter.call(el, String(val));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true, value: el.value };
        }

        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (el._valueTracker) el._valueTracker.setValue('');
        setter.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: el.value };
      },
      selector,
      value
    );
    if (!res || !res.ok) {
      throw new Error(`fill("${selector}") failed: ${res?.reason || 'unknown'}`);
    }
    return res.value;
  }

  async function typeText(selector, text) {
    await waitForSelector(selector);
    await evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error('Element not found');
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.focus();
    }, selector);
    await cdp.send('Input.insertText', { text: String(text) }, sessionId);
    return evaluate((sel) => document.querySelector(sel)?.value, selector);
  }

  async function click(selector) {
    await waitForSelector(selector);
    const box = await evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        el.click();
        return { domClicked: true, x: 0, y: 0, width: r.width, height: r.height };
      }
      return {
        domClicked: false,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        width: r.width,
        height: r.height,
      };
    }, selector);

    if (!box) throw new Error(`click("${selector}"): element not found`);
    if (box.domClicked) return;

    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' },
      sessionId
    );
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      sessionId
    );
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      sessionId
    );
  }

  async function doubleClickRapid(selector) {
    await waitForSelector(selector);
    const box = await evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
    }, selector);

    if (!box || box.width <= 0 || box.height <= 0) {
      throw new Error(`doubleClickRapid("${selector}"): element not visible`);
    }

    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      sessionId
    );
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      sessionId
    );
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 2 },
      sessionId
    );
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 2 },
      sessionId
    );
  }

  async function uploadFile(selector, absPath) {
    await waitForSelector(selector);
    const doc = await cdp.send('DOM.getDocument', { depth: -1 }, sessionId);
    const found = await cdp.send(
      'DOM.querySelector',
      { nodeId: doc.root.nodeId, selector },
      sessionId
    );
    if (!found || !found.nodeId) {
      throw new Error(`uploadFile("${selector}"): DOM nodeId not found`);
    }
    await cdp.send(
      'DOM.setFileInputFiles',
      { nodeId: found.nodeId, files: [path.resolve(absPath)] },
      sessionId
    );
  }

  async function blockUrls(patterns) {
    await cdp.send('Network.setBlockedURLs', { urls: patterns }, sessionId);
  }

  async function checkImages(selector = 'img') {
    return evaluate((sel) => {
      const imgs = Array.from(document.querySelectorAll(sel));
      return imgs.map((img) => ({
        src: img.currentSrc || img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        ok: Boolean(img.complete && img.naturalWidth > 0),
      }));
    }, selector);
  }

  function setDialogHandler(accept = true, promptText = '') {
    dialogAccept = accept;
    dialogPromptText = promptText;
  }

  function getDialogs() {
    return [...dialogs];
  }

  function getConsoleErrors() {
    return [...consoleErrors];
  }

  function getPageErrors() {
    return [...pageErrors];
  }

  function getResponses(urlFilter = null) {
    if (!urlFilter) return [...responses];
    return responses.filter((r) => r.url.includes(urlFilter));
  }

  function clearLogs() {
    dialogs.length = 0;
    consoleErrors.length = 0;
    pageErrors.length = 0;
    responses.length = 0;
  }

  async function loginUi(role, customCreds) {
    const creds = customCreds || config.credentials[String(role).toLowerCase()];
    if (!creds) throw new Error(`Unknown loginUi role: ${role}`);
    if (creds.uiSupported === false) {
      throw new Error(
        `Role '${creds.roleName}' is not supported by /login UI (Auth.jsx only exposes Guest/Admin/Receptionist/Kitchen/Housekeeping radios). Use http_client.loginAs('${role}').`
      );
    }

    await goto(`${config.frontendBaseUrl}/login`, { waitSelector: 'input[name="loginRole"]' });
    const radioSel = `input[name="loginRole"][value="${creds.roleName}"]`;
    await click(radioSel);
    await fill('input[placeholder*="admin, receptionist"]', creds.identifier);
    await fill('input[placeholder="••••••••"]', creds.password);
    await click('button[type="submit"]');

    await waitFor(
      () =>
        evaluate(() => {
          const pathNow = window.location.pathname;
          const storedUser = localStorage.getItem('hotel_user');
          return !pathNow.startsWith('/login') && !pathNow.startsWith('/auth') && Boolean(storedUser);
        }),
      config.timeouts.uiNavMs,
      `UI login redirect for ${creds.roleName}`
    );

    await waitForNetworkIdle(250, 4000);
    return evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('hotel_user') || 'null');
      } catch (_) {
        return null;
      }
    });
  }

  async function close() {
    if (closed) return;
    closed = true;
    for (const u of unsubs) u();
    unsubs.length = 0;
    try {
      await cdp.send('Target.closeTarget', { targetId });
    } catch (_) {
      // ignore if browser already closing
    }
  }

  return {
    targetId,
    sessionId,
    goto,
    waitFor,
    waitForSelector,
    waitForText,
    waitForNetworkIdle,
    fill,
    typeText,
    click,
    doubleClickRapid,
    uploadFile,
    evaluate,
    setDialogHandler,
    getDialogs,
    blockUrls,
    checkImages,
    getConsoleErrors,
    getPageErrors,
    getResponses,
    clearLogs,
    loginUi,
    close,
  };
}

async function launchBrowser(opts = {}) {
  const browserPath = findBrowserExecutable(opts.browserPath);
  const headless = opts.headless !== false;
  const timeoutMs = opts.timeoutMs || config.timeouts.browserLaunchMs;
  const port = await getFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-cdp-'));

  const args = [
    ...(headless ? ['--headless=new'] : []),
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-extensions',
    '--window-size=1280,900',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];

  const proc = spawn(browserPath, args, {
    stdio: 'ignore',
    windowsHide: true,
  });

  const contexts = [];
  let ws = null;
  let cdp = null;
  let closed = false;

  async function cleanupProcessAndProfile() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.close();
      } catch (_) {
        // ignore
      }
    }

    if (proc.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2500);
        proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    if (proc.exitCode === null && proc.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' });
        } else {
          proc.kill('SIGKILL');
        }
      } catch (_) {
        // ignore if already exited
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      if (!fs.existsSync(userDataDir)) break;
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
        break;
      } catch (_) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  try {
    const versionInfo = await waitForDebuggerEndpoint(port, proc, timeoutMs);
    ws = new WebSocket(versionInfo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('CDP WebSocket connect timeout')), timeoutMs);
      ws.once('open', () => {
        clearTimeout(t);
        resolve();
      });
      ws.once('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    cdp = new CdpConnection(ws);

    async function newContext() {
      const { browserContextId } = await cdp.send('Target.createBrowserContext', {
        disposeOnDetach: true,
      });
      const pages = [];
      let ctxDisposed = false;

      async function newPage() {
        const { targetId } = await cdp.send('Target.createTarget', {
          url: 'about:blank',
          browserContextId,
        });
        const { sessionId } = await cdp.send('Target.attachToTarget', {
          targetId,
          flatten: true,
        });
        const page = await createPageHandle(cdp, targetId, sessionId);
        pages.push(page);
        return page;
      }

      async function dispose() {
        if (ctxDisposed) return;
        ctxDisposed = true;
        for (const p of pages) {
          await p.close();
        }
        pages.length = 0;
        try {
          await cdp.send('Target.disposeBrowserContext', { browserContextId });
        } catch (_) {
          // ignore if closing
        }
      }

      const ctxObj = { browserContextId, newPage, dispose };
      contexts.push(ctxObj);
      return ctxObj;
    }

    async function close() {
      if (closed) return;
      closed = true;
      for (const c of contexts) {
        await c.dispose();
      }
      contexts.length = 0;
      try {
        await cdp.send('Browser.close', {}, undefined, 3000);
      } catch (_) {
        // fallback handled in cleanupProcessAndProfile
      }
      await cleanupProcessAndProfile();
    }

    return {
      browserInfo: {
        executablePath: browserPath,
        browser: versionInfo.Browser || 'unknown',
        protocolVersion: versionInfo['Protocol-Version'] || 'unknown',
        port,
        pid: proc.pid,
        userDataDir,
      },
      newContext,
      close,
    };
  } catch (err) {
    await cleanupProcessAndProfile();
    throw err;
  }
}

module.exports = {
  findBrowserExecutable,
  launchBrowser,
};
