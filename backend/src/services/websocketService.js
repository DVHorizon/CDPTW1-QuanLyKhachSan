'use strict';

/**
 * services/websocketService.js
 * Proxy / Bridge chuyển tiếp tới Hub WebSocket tập trung: backend/src/sockets/socketHandler.js
 */

const socketHandler = require('../sockets/socketHandler');

// Broadcast table reservation event to connected clients (Reception / Restaurant staff)
function broadcastTableReservation(reservation, action = 'NEW_RESERVATION') {
  const wss = socketHandler.getWss ? socketHandler.getWss() : null;
  if (!wss) return;

  const payload = JSON.stringify({
    type: 'TABLE_RESERVATION_EVENT',
    action,
    data: {
      reservationId: reservation.TableReservationId,
      tableId: reservation.TableId,
      tableNumber: reservation.table?.TableNumber || `Bàn ${reservation.TableId}`,
      guestCount: reservation.GuestCount,
      reservationTime: reservation.ReservationTime,
      status: reservation.Status,
      userName: reservation.user?.FullName || `Khách hàng #${reservation.UserId}`,
      note: reservation.Note
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(payload);
    }
  });
}

// Broadcast room status change to connected clients (FEAT-ROOMMAP-01)
function broadcastRoomMapUpdate(payload) {
  const wss = socketHandler.getWss ? socketHandler.getWss() : null;
  if (!wss) return;

  const msg = JSON.stringify({
    type: 'ROOM_MAP_UPDATED',
    event: 'availability:changed',
    data: payload
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(msg);
    }
  });
}

module.exports = {
  initWebSocket: socketHandler.initSocket,
  broadcastOrderStatus: socketHandler.broadcastOrderStatus,
  broadcastRoomEvent: socketHandler.broadcastRoomEvent,
  broadcastTableReservation,
  broadcastNewKitchenOrder: socketHandler.broadcastNewKitchenOrder,
  broadcastTableUpdate: socketHandler.broadcastTableUpdate,
  broadcastRoomMapUpdate,
  getWss: socketHandler.getWss
};
