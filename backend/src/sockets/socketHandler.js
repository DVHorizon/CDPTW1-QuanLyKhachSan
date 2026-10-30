'use strict';

/**
 * sockets/socketHandler.js
 * Trung tâm WebSocket Server và Broadcast thời gian thực cho hệ thống.
 */

let wssInstance = null;

/**
 * Khởi tạo WebSocket Server (nếu thư viện ws có sẵn) hoặc Mock an toàn nếu không cài ws.
 * @param {import('http').Server} server 
 */
function initSocket(server) {
  try {
    let WebSocketModule;
    try {
      WebSocketModule = require('ws');
    } catch {
      // ws chưa được cài đặt trong node_modules
    }

    if (!WebSocketModule) {
      console.log('ℹ️ WebSocket: ws module not found, fallback to safe mock broadcasting.');
      wssInstance = {
        clients: new Set()
      };
      return wssInstance;
    }

    const { WebSocketServer } = WebSocketModule;
    wssInstance = new WebSocketServer({ server });

    wssInstance.on('connection', (ws, req) => {
      // Gửi sự kiện CONNECTED ban đầu khi client kết nối
      try {
        ws.send(JSON.stringify({
          type: 'CONNECTED',
          message: 'Kết nối WebSocket thành công',
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        // ignore
      }

      ws.on('message', (message) => {
        // Xử lý ping / echo nếu cần
        try {
          const data = JSON.parse(message);
          if (data.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch {
          // ignore non-json
        }
      });
    });

    return wssInstance;
  } catch (error) {
    console.warn('⚠️ Lỗi khởi tạo WebSocket:', error.message);
    wssInstance = { clients: new Set() };
    return wssInstance;
  }
}

/**
 * Lấy WebSocket Server instance hiện tại
 */
function getWss() {
  return wssInstance;
}

/**
 * Gửi tin nhắn tới toàn bộ client đang mở kết nối
 * @param {Object} payload 
 */
function broadcast(payload) {
  if (!wssInstance || !wssInstance.clients) return;
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);

  wssInstance.clients.forEach((client) => {
    if (client && client.readyState === 1 /* WebSocket.OPEN */) {
      try {
        client.send(msg);
      } catch (err) {
        // ignore send error
      }
    }
  });
}

/**
 * Broadcast trạng thái đơn món F&B
 * @param {Object} order 
 * @param {string} [action] 
 */
function broadcastOrderStatus(order, action = 'STATUS_CHANGED') {
  broadcast({
    type: 'FNB_ORDER_STATUS_CHANGED',
    action,
    data: order
  });
}

/**
 * Broadcast đơn hàng mới xuống bếp (KDS)
 * @param {Object} order 
 */
function broadcastNewKitchenOrder(order) {
  broadcast({
    type: 'NEW_KITCHEN_ORDER',
    data: order
  });
}

/**
 * Broadcast sự kiện phòng / sơ đồ phòng / đặt phòng
 * @param {string} event 
 * @param {Object} data 
 */
function broadcastRoomEvent(event, data) {
  broadcast({
    type: event,
    data
  });
}

module.exports = {
  initSocket,
  getWss,
  broadcastOrderStatus,
  broadcastNewKitchenOrder,
  broadcastRoomEvent
};

