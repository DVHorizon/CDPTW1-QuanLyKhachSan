'use strict';

/**
 * services/websocketService.js
 * Proxy / Bridge chuyển tiếp tới Hub WebSocket tập trung: backend/src/sockets/socketHandler.js
 */

const socketHandler = require('../sockets/socketHandler');

module.exports = {
  initWebSocket: socketHandler.initSocket,
  broadcastOrderStatus: socketHandler.broadcastOrderStatus,
  broadcastRoomEvent: socketHandler.broadcastRoomEvent,
  getWss: socketHandler.getWss
};
