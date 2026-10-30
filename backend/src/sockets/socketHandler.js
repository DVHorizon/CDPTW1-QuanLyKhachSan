'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WEBSOCKET REALTIME HUB & ROOM MAP STREAM SERVICE
 * Feature: FEAT-ROOMMAP-RT-01 (Cập nhật trạng thái sơ đồ phòng real-time bằng WebSocket)
 * Spec: Spec_13.CapNhatSoDoPhongRealtime.docx
 * 
 * - Multi-endpoint handling: /ws/v1/room-map, /ws/rooms, /ws
 * - In-memory Circular Event Buffer (Outbox) with 2000 events limit
 * - Monotonic Sequence per Property & Monotonic Version per Room
 * - Heartbeat Ping/Pong (25s interval, 50s timeout)
 * - Snapshot & Cursor-based Replay for delta sync
 * ═══════════════════════════════════════════════════════════════════════════
 */

const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const MAX_OUTBOX_SIZE = 2000;
const HEARTBEAT_INTERVAL_MS = 25000;
const HEARTBEAT_TIMEOUT_MS = 50000;

// State management
let wss = null;
let heartbeatTimer = null;

// Property stream sequence counters: propertyId -> currentSequence (integer)
const propertySequences = new Map();

// Room version counters: roomId -> currentVersion (integer)
const roomVersions = new Map();

// Circular Outbox buffer: list of event envelopes
// Each event: { schemaVersion, eventId, eventType, propertyId, sequence, timestamp, payload }
const eventOutbox = [];

// Status to Display Hints Mapping (Spec 13 Section 3.1 & 3.3)
const DISPLAY_HINTS = {
  AVAILABLE: {
    color: '#10B981',
    badgeText: 'Trống sạch',
    flashAnimation: 'NONE'
  },
  VACANT_CLEAN: {
    color: '#10B981',
    badgeText: 'Trống sạch',
    flashAnimation: 'NONE'
  },
  RESERVED: {
    color: '#3B82F6',
    badgeText: 'Đã đặt',
    flashAnimation: 'NONE'
  },
  OCCUPIED: {
    color: '#6366F1',
    badgeText: 'Đang ở',
    flashAnimation: 'NONE'
  },
  DIRTY: {
    color: '#EF4444',
    badgeText: 'Chưa dọn',
    flashAnimation: 'PULSE'
  },
  VACANT_DIRTY: {
    color: '#EF4444',
    badgeText: 'Chưa dọn',
    flashAnimation: 'PULSE'
  },
  CLEANING: {
    color: '#F59E0B',
    badgeText: 'Đang dọn',
    flashAnimation: 'PULSE'
  },
  INSPECTION: {
    color: '#8B5CF6',
    badgeText: 'Chờ kiểm',
    flashAnimation: 'NONE'
  },
  OUT_OF_ORDER: {
    color: '#6B7280',
    badgeText: 'Hỏng / Khóa',
    flashAnimation: 'NONE'
  },
  OUT_OF_SERVICE: {
    color: '#9CA3AF',
    badgeText: 'Ngừng sử dụng',
    flashAnimation: 'NONE'
  }
};

function getDefaultDisplayHints(status) {
  const norm = String(status || '').toUpperCase();
  return DISPLAY_HINTS[norm] || {
    color: '#6B7280',
    badgeText: status || 'Không xác định',
    flashAnimation: 'NONE'
  };
}

/**
 * Get next monotonic sequence for a given property
 */
function getNextSequence(propertyId = 1) {
  const propId = Number(propertyId) || 1;
  const current = propertySequences.get(propId) || 0;
  const next = current + 1;
  propertySequences.set(propId, next);
  return next;
}

/**
 * Get current sequence for property
 */
function getCurrentSequence(propertyId = 1) {
  const propId = Number(propertyId) || 1;
  return propertySequences.get(propId) || 0;
}

/**
 * Get next version for room
 */
function getNextRoomVersion(roomId) {
  const rId = Number(roomId);
  const current = roomVersions.get(rId) || 1;
  const next = current + 1;
  roomVersions.set(rId, next);
  return next;
}

/**
 * Get current version for room
 */
function getRoomVersion(roomId) {
  const rId = Number(roomId);
  if (!roomVersions.has(rId)) {
    roomVersions.set(rId, 1);
  }
  return roomVersions.get(rId);
}

/**
 * Initialize or seed room version (e.g. from DB UpdatedAt or initial load)
 */
function setRoomVersion(roomId, version) {
  const rId = Number(roomId);
  roomVersions.set(rId, Math.max(Number(version) || 1, roomVersions.get(rId) || 1));
}

/**
 * Push event to circular outbox buffer
 */
function pushToOutbox(eventEnvelope) {
  eventOutbox.push(eventEnvelope);
  if (eventOutbox.length > MAX_OUTBOX_SIZE) {
    eventOutbox.splice(0, eventOutbox.length - MAX_OUTBOX_SIZE);
  }
}

/**
 * Query delta changes from outbox after given sequence cursor
 * Returns { ok: true, changes: [...] } or { ok: false, reason: 'CURSOR_EXPIRED' | 'INVALID_CURSOR' }
 */
function getOutboxChanges(propertyId = 1, afterCursor = 0) {
  const propId = Number(propertyId) || 1;
  const cursor = Number(afterCursor);
  const currentSeq = getCurrentSequence(propId);

  if (isNaN(cursor) || cursor < 0) {
    return { ok: false, reason: 'INVALID_CURSOR', currentSequence: currentSeq };
  }

  // Filter events for this property
  const propEvents = eventOutbox.filter((e) => Number(e.propertyId) === propId);

  if (cursor >= currentSeq) {
    return { ok: true, changes: [], currentSequence: currentSeq };
  }

  if (propEvents.length > 0) {
    const oldestSeq = propEvents[0].sequence;
    if (cursor + 1 < oldestSeq) {
      return { ok: false, reason: 'CURSOR_EXPIRED', currentSequence: currentSeq, oldestAvailable: oldestSeq };
    }
  }

  const changes = propEvents.filter((e) => e.sequence > cursor);
  return { ok: true, changes, currentSequence: currentSeq };
}

/**
 * Validate JWT Token optional helper
 */
function verifyClientToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

/**
 * Send JSON message safely
 */
function sendJson(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (err) {
      console.warn('⚠️ WebSocket send failed:', err.message);
    }
  }
}

/**
 * Broadcast event envelope to all subscribed clients
 */
function broadcastEnvelope(eventEnvelope) {
  if (!wss) return;

  const msg = JSON.stringify(eventEnvelope);
  const targetPropId = Number(eventEnvelope.propertyId) || 1;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // If client is subscribed to specific property, check match
      if (!client.propertyId || Number(client.propertyId) === targetPropId) {
        try {
          client.send(msg);
        } catch (_) {}
      }
    }
  });
}

/**
 * Core broadcast for Room Status Changes (FEAT-ROOMMAP-RT-01 Spec 13)
 */
function broadcastRoomStatusChange(options) {
  const {
    roomId,
    roomNumber,
    floor = 1,
    propertyId = 1,
    currentStatus,
    status, // fallback
    previousStatus = null,
    changedBy = { userId: 1, displayName: 'Hệ thống', role: 'Staff' },
    correlationId = null,
    displayHints = null,
    note = null
  } = options;

  const effectiveStatus = currentStatus || status || 'AVAILABLE';
  const propId = Number(propertyId) || 1;
  const rId = Number(roomId);
  const nextSeq = getNextSequence(propId);
  const nextVer = getNextRoomVersion(rId);
  const nowIso = new Date().toISOString();

  const hints = displayHints || getDefaultDisplayHints(effectiveStatus);

  const envelope = {
    schemaVersion: '1.0',
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    eventType: 'ROOM_STATUS_CHANGED',
    type: 'ROOM_STATUS_CHANGED', // backward compatibility
    propertyId: propId,
    sequence: nextSeq,
    timestamp: nowIso,
    payload: {
      roomId: rId,
      roomNumber: String(roomNumber || rId),
      floor: Number(floor) || 1,
      previousStatus: previousStatus,
      currentStatus: effectiveStatus,
      version: nextVer,
      changedBy: changedBy,
      correlationId: correlationId || `cor_${Date.now()}_${rId}`,
      displayHints: hints,
      note: note || null,
      updatedAt: nowIso
    },
    // Backward compatibility with older tests and frontend consumers
    data: {
      roomId: rId,
      roomNumber: String(roomNumber || rId),
      floor: Number(floor) || 1,
      oldStatus: previousStatus,
      newStatus: effectiveStatus,
      status: effectiveStatus,
      version: nextVer,
      updatedAt: nowIso
    }
  };

  // Push to circular outbox
  pushToOutbox(envelope);

  // Broadcast to all active clients
  broadcastEnvelope(envelope);

  return envelope;
}

/**
 * Handle new client WebSocket connection
 */
function handleClientConnection(ws, req) {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query || {};

  // Extract initial parameters from query
  const propertyId = Number(query.propertyId) || 1;
  const cursor = query.cursor !== undefined ? Number(query.cursor) : null;
  const token = query.token || null;

  ws.propertyId = propertyId;
  ws.user = verifyClientToken(token);

  // Send initial READY event
  const currentSeq = getCurrentSequence(propertyId);
  sendJson(ws, {
    schemaVersion: '1.0',
    eventType: 'READY',
    type: 'CONNECTED', // backward compatibility with test runner
    propertyId: propertyId,
    currentSequence: currentSeq,
    serverTime: new Date().toISOString(),
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    message: 'Kết nối WebSocket Room Map thành công'
  });

  // If client provided cursor at connection time, attempt replay
  if (cursor !== null && !isNaN(cursor)) {
    replayEventsForClient(ws, propertyId, cursor);
  }

  // Handle incoming messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const action = String(data.action || data.type || '').toUpperCase();

      if (action === 'PING') {
        sendJson(ws, {
          action: 'PONG',
          type: 'PONG',
          serverTime: new Date().toISOString()
        });
        return;
      }

      if (action === 'SUBSCRIBE') {
        if (data.propertyId) {
          ws.propertyId = Number(data.propertyId);
        }
        if (data.token) {
          ws.user = verifyClientToken(data.token);
        }

        const subCursor = data.cursor !== undefined ? Number(data.cursor) : null;
        if (subCursor !== null && !isNaN(subCursor)) {
          replayEventsForClient(ws, ws.propertyId, subCursor);
        } else {
          sendJson(ws, {
            schemaVersion: '1.0',
            eventType: 'SUBSCRIBED',
            propertyId: ws.propertyId,
            currentSequence: getCurrentSequence(ws.propertyId),
            serverTime: new Date().toISOString()
          });
        }
        return;
      }

      if (action === 'UNSUBSCRIBE') {
        ws.propertyId = null;
        sendJson(ws, {
          schemaVersion: '1.0',
          eventType: 'UNSUBSCRIBED',
          serverTime: new Date().toISOString()
        });
        return;
      }
    } catch (_) {
      // Ignore invalid JSON
    }
  });

  ws.on('error', (err) => {
    console.warn('⚠️ WebSocket client error:', err.message);
  });
}

/**
 * Replay missed events or request full resync
 */
function replayEventsForClient(ws, propertyId, cursor) {
  const replayResult = getOutboxChanges(propertyId, cursor);

  if (!replayResult.ok) {
    // Gap detected or cursor too old
    sendJson(ws, {
      schemaVersion: '1.0',
      eventType: 'RESYNC_REQUIRED',
      propertyId: propertyId,
      currentSequence: replayResult.currentSequence,
      reason: replayResult.reason,
      serverTime: new Date().toISOString()
    });
    return;
  }

  // Stream each missed change in order
  for (const changeEvent of replayResult.changes) {
    sendJson(ws, changeEvent);
  }

  sendJson(ws, {
    schemaVersion: '1.0',
    eventType: 'REPLAY_COMPLETE',
    propertyId: propertyId,
    syncedSequence: replayResult.currentSequence,
    replayedCount: replayResult.changes.length,
    serverTime: new Date().toISOString()
  });
}

/**
 * Initialize WebSocket Server
 */
function initSocket(server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocket.Server({ noServer: true });

  // Handle HTTP upgrade for /ws/v1/room-map, /ws/rooms, and /ws
  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (
      pathname === '/ws/v1/room-map' ||
      pathname === '/ws/rooms' ||
      pathname === '/ws' ||
      pathname.startsWith('/ws/')
    ) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    handleClientConnection(ws, req);
  });

  // Setup heartbeat ping/pong timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  console.log('✅ WebSocket Realtime Hub initialized for Room Map (/ws/v1/room-map, /ws/rooms, /ws)');
  return wss;
}

/**
 * Backward compatibility helpers
 */
function broadcastRoomEvent(eventType, payload) {
  if (!wss) return;

  const msg = JSON.stringify({
    schemaVersion: '1.0',
    type: eventType,
    eventType: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (_) {}
    }
  });
}

function broadcastOrderStatus(orderId, status, payload = {}) {
  broadcastRoomEvent('ORDER_STATUS_CHANGED', { orderId, status, ...payload });
}

function broadcastNewKitchenOrder(order) {
  broadcastRoomEvent('NEW_KITCHEN_ORDER', { order });
}

function getWss() {
  return wss;
}

module.exports = {
  initSocket,
  getWss,
  broadcastRoomStatusChange,
  broadcastRoomEvent,
  broadcastOrderStatus,
  broadcastNewKitchenOrder,
  getNextSequence,
  getCurrentSequence,
  getNextRoomVersion,
  getRoomVersion,
  setRoomVersion,
  getOutboxChanges,
  getDefaultDisplayHints,
  DISPLAY_HINTS
};
