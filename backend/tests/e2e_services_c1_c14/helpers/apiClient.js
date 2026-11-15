'use strict';

/**
 * apiClient.js - Opaque-box HTTP client for Grand Horizon E2E Testing Track
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const isFullUrl = path.startsWith('http://') || path.startsWith('https://');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = isFullUrl ? path : `${API_BASE}${cleanPath}`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, application/pdf, */*',
    ...(options.headers || {}),
  };

  // If body is already string or Buffer, keep as is; if object, JSON.stringify
  let body = options.body;
  if (body !== undefined && typeof body !== 'string' && !(body instanceof Buffer)) {
    body = JSON.stringify(body);
  }

  const startMs = Date.now();
  let res;
  let networkError = null;

  try {
    res = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (err) {
    networkError = err;
  }

  const durationMs = Date.now() - startMs;

  if (networkError) {
    return {
      status: 0,
      ok: false,
      error: networkError.message,
      data: null,
      headers: {},
      durationMs,
      url,
    };
  }

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  let rawBuffer = null;

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else if (contentType.includes('application/pdf') || contentType.includes('spreadsheetml')) {
    const arrayBuf = await res.arrayBuffer();
    rawBuffer = Buffer.from(arrayBuf);
    data = rawBuffer;
  } else {
    data = await res.text().catch(() => '');
  }

  const responseHeaders = {};
  res.headers.forEach((v, k) => {
    responseHeaders[k.toLowerCase()] = v;
  });

  return {
    status: res.status,
    ok: res.ok,
    contentType,
    data,
    rawBuffer,
    headers: responseHeaders,
    durationMs,
    url,
  };
}

module.exports = {
  API_BASE,
  request,
};
