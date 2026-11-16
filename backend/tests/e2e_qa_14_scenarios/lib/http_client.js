'use strict';

const WebSocket = require('ws');
const config = require('./config');

function createSession(baseUrl = config.apiBaseUrl) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const cookies = new Map();
  let token = null;
  let user = null;

  function parseSetCookies(headers) {
    let rawList = [];
    if (typeof headers.getSetCookie === 'function') {
      rawList = headers.getSetCookie();
    } else {
      const single = headers.get('set-cookie');
      if (single) rawList = [single];
    }
    for (const raw of rawList) {
      const firstPart = String(raw).split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const name = firstPart.slice(0, eqIdx).trim();
        const val = firstPart.slice(eqIdx + 1).trim();
        if (val === '' || raw.toLowerCase().includes('max-age=0')) {
          cookies.delete(name);
        } else {
          cookies.set(name, val);
        }
      }
    }
  }

  function buildCookieHeader() {
    if (cookies.size === 0) return '';
    return Array.from(cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  function resolveUrl(urlPath, useBackendRoot = false) {
    if (/^https?:\/\//i.test(urlPath)) return urlPath;
    const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return `${useBackendRoot ? config.backendBaseUrl : normalizedBase}${cleanPath}`;
  }

  async function request(method, urlPath, opts = {}) {
    const {
      body,
      headers: extraHeaders = {},
      query,
      noAuth = false,
      noCookies = false,
      isBinary = false,
      useBackendRoot = false,
      timeoutMs = config.timeouts.httpMs,
    } = opts;

    let fullUrl = resolveUrl(urlPath, useBackendRoot);
    if (query && typeof query === 'object') {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) usp.append(k, String(v));
      }
      const qs = usp.toString();
      if (qs) fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }

    const headers = {
      Accept: 'application/json',
      ...extraHeaders,
    };

    if (!noAuth && token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (!noCookies && !headers.Cookie && !headers.cookie) {
      const cHeader = buildCookieHeader();
      if (cHeader) headers.Cookie = cHeader;
    }

    let payload;
    if (body !== undefined && body !== null) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        payload = body;
      } else if (Buffer.isBuffer(body) || typeof body === 'string') {
        payload = body;
      } else {
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
        payload = JSON.stringify(body);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(fullUrl, {
        method: method.toUpperCase(),
        headers,
        body: payload,
        signal: controller.signal,
        redirect: opts.redirect || 'follow',
      });

      parseSetCookies(res.headers);
      const durationMs = Date.now() - start;
      const contentType = res.headers.get('content-type') || '';

      let data = null;
      let rawText = '';
      let buffer = null;

      if (isBinary) {
        const ab = await res.arrayBuffer();
        buffer = Buffer.from(ab);
      } else {
        rawText = await res.text();
        if (rawText) {
          try {
            data = JSON.parse(rawText);
          } catch (_) {
            data = null;
          }
        }
      }

      return {
        status: res.status,
        ok: res.ok,
        url: fullUrl,
        contentType,
        headers: res.headers,
        data,
        rawText,
        buffer,
        durationMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function loginAs(roleOrCreds) {
    let creds;
    if (typeof roleOrCreds === 'string') {
      const key = roleOrCreds.toLowerCase();
      creds = config.credentials[key];
      if (!creds) {
        throw new Error(`Unknown credential role: ${roleOrCreds}`);
      }
    } else {
      creds = roleOrCreds;
    }

    // Explicitly omit expectedRole so all 7 seeded roles authenticate cleanly
    const res = await request('POST', '/auth/login', {
      noAuth: true,
      body: {
        identifier: creds.identifier,
        password: creds.password,
      },
    });

    if (res.status !== 200 || !res.data || !res.data.token) {
      throw new Error(
        `Login failed for ${creds.identifier}: HTTP ${res.status} — ${res.rawText || 'empty response'}`
      );
    }

    token = res.data.token;
    user = res.data.user || null;

    return {
      token,
      user,
      cookies: Object.fromEntries(cookies.entries()),
      response: res,
    };
  }

  async function refresh() {
    const res = await request('POST', '/auth/refresh', {
      noAuth: true,
    });
    if (res.status === 200 && res.data && res.data.token) {
      token = res.data.token;
      if (res.data.user) user = res.data.user;
    }
    return res;
  }

  async function uploadMultipart(urlPath, fieldName, filename, content, contentType = 'application/pdf', extraFields = {}) {
    const form = new FormData();
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    const blob = new Blob([buf], { type: contentType });
    form.append(fieldName, blob, filename);
    for (const [k, v] of Object.entries(extraFields)) {
      if (v !== undefined && v !== null) form.append(k, String(v));
    }
    return request('POST', urlPath, { body: form });
  }

  async function connectWebSocket(wsUrl = config.wsDashboardUrl, opts = {}) {
    const timeoutMs = opts.timeoutMs || config.timeouts.wsMs;
    const headers = {};
    let targetUrl = wsUrl;

    if (opts.useAuth && token) {
      headers.Authorization = `Bearer ${token}`;
      if (opts.tokenInQuery) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
    }

    const ws = new WebSocket(targetUrl, { headers });
    const messages = [];
    const waiters = [];

    ws.on('message', (raw) => {
      const text = raw.toString('utf8');
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = { raw: text };
      }
      messages.push(parsed);
      for (let i = waiters.length - 1; i >= 0; i--) {
        const w = waiters[i];
        if (w.predicate(parsed)) {
          clearTimeout(w.timer);
          waiters.splice(i, 1);
          w.resolve(parsed);
        }
      }
    });

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`WebSocket open timeout (${timeoutMs}ms): ${targetUrl}`)), timeoutMs);
      ws.once('open', () => {
        clearTimeout(t);
        resolve();
      });
      ws.once('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    function waitForMessage(predicate, waitTimeoutMs = timeoutMs) {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((w) => w.timer === timer);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`WebSocket message wait timeout (${waitTimeoutMs}ms)`));
        }, waitTimeoutMs);
        waiters.push({ predicate, resolve, reject, timer });
      });
    }

    function sendJson(obj) {
      ws.send(JSON.stringify(obj));
    }

    async function close() {
      if (ws.readyState === WebSocket.CLOSED) return;
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 1500);
        ws.once('close', () => {
          clearTimeout(t);
          resolve();
        });
        ws.close();
      });
    }

    return { ws, messages, waitForMessage, sendJson, close };
  }

  return {
    get token() {
      return token;
    },
    setToken(nextToken) {
      token = nextToken;
    },
    get user() {
      return user;
    },
    get cookies() {
      return Object.fromEntries(cookies.entries());
    },
    clearSession() {
      token = null;
      user = null;
      cookies.clear();
    },
    request,
    get: (p, o) => request('GET', p, o),
    post: (p, b, o = {}) => request('POST', p, { ...o, body: b }),
    put: (p, b, o = {}) => request('PUT', p, { ...o, body: b }),
    patch: (p, b, o = {}) => request('PATCH', p, { ...o, body: b }),
    del: (p, o) => request('DELETE', p, o),
    loginAs,
    refresh,
    uploadMultipart,
    connectWebSocket,
  };
}

module.exports = {
  createSession,
};
